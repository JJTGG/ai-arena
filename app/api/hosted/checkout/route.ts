
import { NextResponse } from "next/server";

import { createNeonHostedRepository } from "@/db/neon-hosted-repository";
import { getHostedAuthContext } from "@/lib/hosted/better-auth-session";
import {
  assertHostedEligibility,
} from "@/lib/hosted/eligibility";
import { HostedError, hostedErrorResponse } from "@/lib/hosted/errors";
import {
  expireEntitlement,
  shouldExpireEntitlement,
} from "@/lib/hosted/entitlement-lifecycle";
import {
  PaystackHostedPaymentProvider,
} from "@/lib/hosted/paystack";
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
import type { HostedPayment } from "@/lib/hosted/types";

type CheckoutPreparation =
  | {
      kind: "active";
    }
  | {
      kind: "existing";
      payment: HostedPayment;
    }
  | {
      kind: "reserved";
      payment: HostedPayment;
    };

function paymentResponse(
  payment: HostedPayment,
  checkoutUrl: string,
  reusedPendingPayment: boolean,
) {
  return NextResponse.json({
    ok: true,
    alreadyActive: false,
    checkoutUrl,
    paymentReference:
      payment.providerPaymentReference,
    currency: payment.currency,
    amountMinor: payment.amountMinor,
    reusedPendingPayment,
  });
}

function unresolvedPaymentResponse(
  payment: HostedPayment,
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "CHECKOUT_RECOVERY_REQUIRED",
        message:
          "A previous Paystack payment attempt is still pending, but its checkout URL was not saved. No new payment was created. This attempt must be reconciled before another checkout can begin. Payment reference: " +
          payment.providerPaymentReference,
        retryable: false,
      },
    },
    {
      status: 409,
    },
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

    const paymentProvider =
      new PaystackHostedPaymentProvider();

    const countryCode =
      getRequestCountry(request.headers);

    const entitlementCheckAt =
      clock.now();

    const preparation =
      await repository.executeTransaction(
        async (transactionRepository): Promise<CheckoutPreparation> => {
          // Serialize checkout preparation for this account.
          const lockedAccount =
            await transactionRepository.getAccountById(
              account.id,
              {
                forUpdate: true,
              },
            );

          if (!lockedAccount) {
            throw new HostedError(
              "ACCOUNT_REQUIRED",
              {
                status: 404,
                message:
                  "The Hosted Arena account could not be found.",
              },
            );
          }

          const entitlement =
            await transactionRepository.getActiveEntitlement(
              lockedAccount.id,
              {
                forUpdate: true,
              },
            );

          if (entitlement) {
            if (
              !shouldExpireEntitlement(
                entitlement,
                entitlementCheckAt,
              )
            ) {
              return {
                kind: "active",
              };
            }

            await transactionRepository.updateEntitlement(
              expireEntitlement(
                entitlement,
                entitlementCheckAt,
              ),
            );
          }

          // Reuse an unresolved Paystack payment instead
          // of creating another transaction reference.
          const pendingPayment =
            await transactionRepository.getLatestPendingPaymentForAccount(
              lockedAccount.id,
              "paystack",
              {
                forUpdate: true,
              },
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
                pricingContext: {
                  countryCode,
                },
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

          // This reservation is committed before calling
          // Paystack, so simultaneous requests cannot each
          // create an independent payment for this account.
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
      return NextResponse.json({
        ok: true,
        alreadyActive: true,
        checkoutUrl: null,
      });
    }

    if (preparation.kind === "existing") {
      const pendingPayment =
        preparation.payment;

      if (pendingPayment.checkoutUrl?.trim()) {
        return paymentResponse(
          pendingPayment,
          pendingPayment.checkoutUrl,
          true,
        );
      }

      return unresolvedPaymentResponse(
        pendingPayment,
      );
    }

    const payment =
      preparation.payment;

    // The reservation already exists. If the provider
    // result is ambiguous, keep the reservation pending
    // so another request cannot create a second payment.
    const result =
      await paymentProvider.initializePayment({
        payment,
        customerEmail: account.email,
        redirectUrl:
          new URL(
            "/hosted",
            request.url,
          ).toString(),
        paymentDescription:
          "AI Arena Hosted access — 60 rounds, 30 days",
      });

    if (!result.checkoutUrl.trim()) {
      throw new HostedError(
        "PROVIDER_REJECTED",
        {
          status: 502,
          message:
            "Paystack did not return a usable checkout URL. The payment attempt has been reserved for reconciliation.",
          retryable: true,
        },
      );
    }

    const savedPayment =
      await repository.updatePayment({
        ...payment,
        providerTransactionReference:
          result.providerTransactionReference,
        checkoutUrl:
          result.checkoutUrl,
      });

    return paymentResponse(
      savedPayment,
      savedPayment.checkoutUrl!,
      false,
    );
  } catch (error) {
    console.error(
      "[HOSTED ARENA] Checkout initialization failed:",
      error,
    );

    return hostedErrorResponse(error);
  }
}
