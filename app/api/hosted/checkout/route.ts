
import { NextResponse } from "next/server";

import { createNeonHostedRepository } from "@/db/neon-hosted-repository";
import { getHostedAuthContext } from "@/lib/hosted/better-auth-session";
import {
  assertHostedEligibility,
} from "@/lib/hosted/eligibility";
import {
  HostedError,
  hostedErrorResponse,
} from "@/lib/hosted/errors";
import {
  expireEntitlement,
  shouldExpireEntitlement,
} from "@/lib/hosted/entitlement-lifecycle";
import {
  PaystackHostedPaymentProvider,
  type PaystackTransactionStatus,
} from "@/lib/hosted/paystack";
import {
  confirmHostedPayment,
} from "@/lib/hosted/payment-confirmation-service";
import { createHostedCheckout } from "@/lib/hosted/checkout";
import {
  getRequestCountry,
} from "@/lib/hosted/geo";
import {
  resolveHostedSession,
} from "@/lib/hosted/session-service";
import {
  SystemHostedClock,
} from "@/lib/hosted/clock";
import type {
  HostedPayment,
  PaymentStatus,
} from "@/lib/hosted/types";
import type {
  HostedPaymentWebhook,
} from "@/lib/hosted/webhooks";

const PENDING_RECOVERY_AGE_MS = 10 * 60 * 1000;

type CheckoutPreparation =
  | { kind: "active" }
  | { kind: "existing"; payment: HostedPayment }
  | { kind: "reserved"; payment: HostedPayment };

type TerminalPaymentStatus =
  | "failed"
  | "expired"
  | "reversed";

function paymentResponse(
  payment: HostedPayment,
  checkoutUrl: string,
  reusedPendingPayment: boolean,
) {
  return NextResponse.json({
    ok: true,
    alreadyActive: false,
    checkoutUrl,
    paymentReference: payment.providerPaymentReference,
    currency: payment.currency,
    amountMinor: payment.amountMinor,
    reusedPendingPayment,
  });
}

function activeAccessResponse(
  extras: Record<string, unknown> = {},
) {
  return NextResponse.json({
    ok: true,
    alreadyActive: true,
    checkoutUrl: null,
    ...extras,
  });
}

function unresolvedPaymentResponse(
  payment: HostedPayment,
  reason?: string,
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "CHECKOUT_RECOVERY_REQUIRED",
        message:
          (reason ??
            "A previous Paystack payment attempt is still unresolved.") +
          ` No new payment was created. Payment reference: ${payment.providerPaymentReference}`,
        retryable: false,
      },
    },
    { status: 409 },
  );
}

function closedPaymentResponse(
  payment: HostedPayment,
  explanation: string,
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "CHECKOUT_RECOVERY_RESOLVED",
        message:
          `${explanation} The previous reservation is closed. Click Activate Hosted Arena again to start a new checkout. Previous reference: ${payment.providerPaymentReference}`,
        retryable: true,
      },
    },
    { status: 409 },
  );
}

function assertInspectionMatchesPayment(
  stored: HostedPayment,
  verified: {
    provider: string;
    providerPaymentReference: string;
    checkoutReference: string | null;
    amountMinor: number;
    currency: string;
  },
): void {
  if (
    stored.provider.trim().toLowerCase() !==
    verified.provider.trim().toLowerCase() ||
    stored.providerPaymentReference !==
    verified.providerPaymentReference ||
    stored.amountMinor !== verified.amountMinor ||
    stored.currency.trim().toUpperCase() !==
    verified.currency.trim().toUpperCase() ||
    (
      stored.checkoutReference !== null &&
      verified.checkoutReference !== null &&
      stored.checkoutReference !== verified.checkoutReference
    )
  ) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 409,
      message:
        "Paystack transaction details do not match the stored checkout. The payment has not been changed.",
    });
  }
}

function terminalStatusForPaystack(
  status: PaystackTransactionStatus,
): TerminalPaymentStatus | null {
  switch (status) {
    case "abandoned":
      return "expired";
    case "failed":
      return "failed";
    case "reversed":
      return "reversed";
    default:
      return null;
  }
}

async function finalizePendingPayment(
  repository: ReturnType<typeof createNeonHostedRepository>,
  payment: HostedPayment,
  status: TerminalPaymentStatus,
  clock: SystemHostedClock,
): Promise<HostedPayment> {
  return repository.executeTransaction(
    async (transactionRepository) => {
      const account =
        await transactionRepository.getAccountById(
          payment.accountId,
          { forUpdate: true },
        );

      if (!account) {
        throw new HostedError("ACCOUNT_REQUIRED", {
          status: 404,
          message:
            "The account linked to this payment could not be found.",
        });
      }

      const current =
        await transactionRepository.getPaymentById(
          payment.id,
          { forUpdate: true },
        );

      if (!current) {
        throw new HostedError("PAYMENT_NOT_CONFIRMED", {
          status: 404,
          message:
            "The pending payment could not be found.",
        });
      }

      if (
        current.providerPaymentReference !==
        payment.providerPaymentReference
      ) {
        throw new HostedError("PAYMENT_NOT_CONFIRMED", {
          status: 409,
          message:
            "The payment reference changed during recovery.",
        });
      }

      if (current.status !== "pending") {
        return current;
      }

      const now = clock.now().toISOString();

      return transactionRepository.updatePayment({
        ...current,
        status,
        reversedAt:
          status === "reversed"
            ? now
            : current.reversedAt,
      });
    },
  );
}

function isTooRecentToInspect(
  payment: HostedPayment,
  now: Date,
): boolean {
  const createdAt = Date.parse(payment.createdAt);

  if (!Number.isFinite(createdAt)) {
    return true;
  }

  return now.getTime() - createdAt < PENDING_RECOVERY_AGE_MS;
}

async function recoverPendingPayment(
  payment: HostedPayment,
  paymentProvider: PaystackHostedPaymentProvider,
  repository: ReturnType<typeof createNeonHostedRepository>,
  clock: SystemHostedClock,
): Promise<Response> {
  const now = clock.now();

  // Give the request that created this reservation time to
  // finish initialization and save its checkout URL.
  if (isTooRecentToInspect(payment, now)) {
    if (payment.checkoutUrl?.trim()) {
      return paymentResponse(
        payment,
        payment.checkoutUrl,
        true,
      );
    }

    return unresolvedPaymentResponse(
      payment,
      "This payment reservation is still recent and may be initializing. Please wait a few minutes before retrying. Do not start another payment.",
    );
  }

  const inspection =
    await paymentProvider.inspectTransaction(
      payment.providerPaymentReference,
    );

  if (inspection.kind === "not_found") {
    const finalized =
      await finalizePendingPayment(
        repository,
        payment,
        "failed",
        clock,
      );

    if (finalized.status === "confirmed") {
      return activeAccessResponse({
        recoveredPayment: true,
      });
    }

    if (finalized.status !== "failed") {
      return unresolvedPaymentResponse(
        finalized,
        "The payment changed state during recovery. Check the current access status before trying again.",
      );
    }

    return closedPaymentResponse(
      finalized,
      "Paystack explicitly reported that no transaction exists for this reference.",
    );
  }

  assertInspectionMatchesPayment(
    payment,
    inspection.payment,
  );

  if (inspection.status === "success") {
    const recoveryEvent: HostedPaymentWebhook = {
      provider: "paystack",
      providerEventId: `hosted-recovery-${payment.id}`,
      providerPaymentReference:
        payment.providerPaymentReference,
      checkoutReference:
        inspection.payment.checkoutReference ??
        payment.checkoutReference,
      receivedAt: now,
      signature: "internal-paystack-verification",
      rawBody: JSON.stringify({
        source: "hosted-checkout-recovery",
        paymentId: payment.id,
        reference: payment.providerPaymentReference,
      }),
    };

    const confirmation =
      await confirmHostedPayment({
        repository,
        event: recoveryEvent,
        payment: inspection.payment,
        usageTimezone: "UTC",
        clock,
      });

    return activeAccessResponse({
      recoveredPayment: true,
      entitlementCreated: Boolean(
        confirmation.entitlement,
      ),
      manualReviewRequired: !confirmation.entitlement,
    });
  }

  const terminalStatus =
    terminalStatusForPaystack(inspection.status);

  if (terminalStatus) {
    const finalized =
      await finalizePendingPayment(
        repository,
        payment,
        terminalStatus,
        clock,
      );

    if (finalized.status === "confirmed") {
      return activeAccessResponse({
        recoveredPayment: true,
      });
    }

    if (finalized.status !== terminalStatus) {
      return unresolvedPaymentResponse(
        finalized,
        "The payment changed state during recovery. No replacement payment was started.",
      );
    }

    return closedPaymentResponse(
      finalized,
      `Paystack reports that the transaction status is "${inspection.status}".`,
    );
  }

  // Reuse a working URL only while Paystack reports that
  // the transaction is still in progress.
  if (
    payment.checkoutUrl?.trim() &&
    (
      inspection.status === "pending" ||
      inspection.status === "ongoing" ||
      inspection.status === "processing"
    )
  ) {
    return paymentResponse(
      payment,
      payment.checkoutUrl,
      true,
    );
  }

  return unresolvedPaymentResponse(
    payment,
    `Paystack reports transaction status "${inspection.status}", but no usable checkout URL is stored. The payment needs reconciliation before another checkout can start.`,
  );
}

export async function POST(request: Request) {
  try {
    const authContext =
      await getHostedAuthContext();

    const repository =
      createNeonHostedRepository();

    const clock =
      new SystemHostedClock();

    const { account } =
      await resolveHostedSession({
        repository,
        authContext,
        clock,
      });

    assertHostedEligibility(
      account,
      authContext!,
    );

    const countryCode =
      getRequestCountry(request.headers);

    const entitlementCheckAt =
      clock.now();

    const preparation =
      await repository.executeTransaction(
        async (transactionRepository): Promise<CheckoutPreparation> => {
          const lockedAccount =
            await transactionRepository.getAccountById(
              account.id,
              { forUpdate: true },
            );

          if (!lockedAccount) {
            throw new HostedError("ACCOUNT_REQUIRED", {
              status: 404,
              message:
                "The Hosted Arena account could not be found.",
            });
          }

          const entitlement =
            await transactionRepository.getActiveEntitlement(
              lockedAccount.id,
              { forUpdate: true },
            );

          if (entitlement) {
            if (
              !shouldExpireEntitlement(
                entitlement,
                entitlementCheckAt,
              )
            ) {
              return { kind: "active" };
            }

            await transactionRepository.updateEntitlement(
              expireEntitlement(
                entitlement,
                entitlementCheckAt,
              ),
            );
          }

          const pendingPayment =
            await transactionRepository.getLatestPendingPaymentForAccount(
              lockedAccount.id,
              "paystack",
              { forUpdate: true },
            );

          if (pendingPayment) {
            return {
              kind: "existing",
              payment: pendingPayment,
            };
          }

          const checkout =
            createHostedCheckout(
              lockedAccount.id,
              {
                pricingContext: { countryCode },
              },
              clock.now(),
            );

          const payment: HostedPayment = {
            id: crypto.randomUUID(),
            accountId: lockedAccount.id,
            provider: "paystack",
            providerPaymentReference:
              `AA-HOSTED-${checkout.id}`,
            providerTransactionReference: null,
            checkoutReference: checkout.id,
            checkoutUrl: null,
            amountMinor: checkout.amountMinor,
            currency: checkout.currency,
            status: "pending",
            createdAt: checkout.createdAt,
            confirmedAt: null,
            reversedAt: null,
          };

          // Commit the reservation before calling Paystack.
          // A concurrent checkout request must see this row.
          const reservedPayment =
            await transactionRepository.createPayment(
              payment,
            );

          return {
            kind: "reserved",
            payment: reservedPayment,
          };
        },
      );

    if (preparation.kind === "active") {
      return activeAccessResponse();
    }

    const paymentProvider =
      new PaystackHostedPaymentProvider();

    if (preparation.kind === "existing") {
      return recoverPendingPayment(
        preparation.payment,
        paymentProvider,
        repository,
        clock,
      );
    }

    const payment = preparation.payment;

    const result =
      await paymentProvider.initializePayment({
        payment,
        customerEmail: account.email,
        redirectUrl:
          new URL("/hosted", request.url).toString(),
        paymentDescription:
          "AI Arena Hosted access — 60 rounds, 30 days",
      });

    if (!result.checkoutUrl.trim()) {
      throw new HostedError("PROVIDER_REJECTED", {
        status: 502,
        message:
          "Paystack did not return a usable checkout URL. The reservation remains pending for safe recovery.",
        retryable: true,
      });
    }

    /*
     * The transaction may have been confirmed by a webhook
     * while the Paystack initialization request was running.
     * Re-read and lock current state before updating checkout
     * details so we never overwrite a newer payment status.
     */
    const savedPayment =
      await repository.executeTransaction(
        async (transactionRepository) => {
          const lockedAccount =
            await transactionRepository.getAccountById(
              account.id,
              { forUpdate: true },
            );

          if (!lockedAccount) {
            throw new HostedError("ACCOUNT_REQUIRED", {
              status: 404,
              message:
                "The Hosted Arena account could not be found.",
            });
          }

          const currentPayment =
            await transactionRepository.getPaymentById(
              payment.id,
              { forUpdate: true },
            );

          if (!currentPayment) {
            throw new HostedError("PAYMENT_NOT_CONFIRMED", {
              status: 404,
              message:
                "The checkout reservation could not be found.",
            });
          }

          if (currentPayment.status !== "pending") {
            return currentPayment;
          }

          return transactionRepository.updatePayment({
            ...currentPayment,
            providerTransactionReference:
              result.providerTransactionReference,
            checkoutUrl: result.checkoutUrl,
          });
        },
      );

    if (savedPayment.status === "confirmed") {
      return activeAccessResponse({
        recoveredPayment: true,
      });
    }

    if (savedPayment.status !== "pending") {
      return closedPaymentResponse(
        savedPayment,
        "The payment changed state while checkout initialization was completing.",
      );
    }

    const savedCheckoutUrl =
      savedPayment.checkoutUrl?.trim();

    if (!savedCheckoutUrl) {
      return unresolvedPaymentResponse(
        savedPayment,
        "Paystack initialized the transaction, but the checkout URL could not be saved. No duplicate payment was created.",
      );
    }

    return paymentResponse(
      savedPayment,
      savedCheckoutUrl,
      false,
    );
  } catch (error) {
    console.error(
      "[HOSTED ARENA] Checkout initialization or recovery failed:",
      error,
    );

    return hostedErrorResponse(error);
  }
}
