
import { HostedError } from "./errors";
import {
  createEntitlementFromConfirmedPayment,
  expireEntitlement,
  shouldExpireEntitlement,
} from "./entitlement-lifecycle";
import {
  assertPaymentPending,
  type VerifiedPayment,
} from "./payment";
import type {
  HostedPayment,
  HostedEntitlement,
} from "./types";
import type {
  HostedWebhookEvent,
  HostedWebhookRepository,
} from "./webhook-repository";
import type {
  HostedPaymentWebhook,
} from "./webhooks";
import {
  hostedConfig,
} from "./config";
import {
  SystemHostedClock,
  type HostedClock,
} from "./clock";

export type ConfirmHostedPaymentInput = {
  repository: HostedWebhookRepository;
  event: HostedPaymentWebhook;
  payment: VerifiedPayment;
  usageTimezone: string;
  clock?: HostedClock;
};

export type ConfirmHostedPaymentResult = {
  webhookEvent: HostedWebhookEvent;
  payment: HostedPayment | null;
  entitlement: HostedEntitlement | null;
  alreadyProcessed: boolean;
};

function normalizeProvider(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeReference(value: string): string {
  return value.trim();
}

function normalizeCurrency(value: string): string {
  return value.trim().toUpperCase();
}

function assertWebhookMatchesVerifiedPayment(
  event: HostedPaymentWebhook,
  verifiedPayment: VerifiedPayment,
): void {
  if (
    normalizeProvider(event.provider) !==
    normalizeProvider(verifiedPayment.provider)
  ) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message:
        "Webhook provider does not match the verified payment.",
    });
  }

  if (
    normalizeReference(event.providerPaymentReference) !==
    normalizeReference(
      verifiedPayment.providerPaymentReference,
    )
  ) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message:
        "Webhook payment reference does not match the verified payment.",
    });
  }

  if (
    event.checkoutReference !== null &&
    verifiedPayment.checkoutReference !== null &&
    normalizeReference(event.checkoutReference) !==
    normalizeReference(
      verifiedPayment.checkoutReference,
    )
  ) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message:
        "Webhook checkout reference does not match the verified payment.",
    });
  }
}

function assertStoredPaymentMatchesVerifiedPayment(
  payment: HostedPayment,
  verifiedPayment: VerifiedPayment,
): void {
  if (
    normalizeProvider(payment.provider) !==
    normalizeProvider(verifiedPayment.provider)
  ) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 409,
      message:
        "Stored payment provider does not match the verified payment.",
    });
  }

  if (
    normalizeReference(payment.providerPaymentReference) !==
    normalizeReference(
      verifiedPayment.providerPaymentReference,
    )
  ) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 409,
      message:
        "Stored payment reference does not match the verified payment.",
    });
  }

  if (payment.amountMinor !== verifiedPayment.amountMinor) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 409,
      message:
        "Stored payment amount does not match the verified payment.",
    });
  }

  if (
    normalizeCurrency(payment.currency) !==
    normalizeCurrency(verifiedPayment.currency)
  ) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 409,
      message:
        "Stored payment currency does not match the verified payment.",
    });
  }

  if (
    payment.checkoutReference !== null &&
    verifiedPayment.checkoutReference !== null &&
    normalizeReference(payment.checkoutReference) !==
    normalizeReference(
      verifiedPayment.checkoutReference,
    )
  ) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 409,
      message:
        "Stored checkout reference does not match the verified payment.",
    });
  }
}

function createReceivedWebhookEvent(
  event: HostedPaymentWebhook,
): HostedWebhookEvent {
  return {
    id: crypto.randomUUID(),
    provider: event.provider.trim(),
    providerEventId: event.providerEventId.trim(),
    paymentId: null,
    receivedAt: event.receivedAt.toISOString(),
    processedAt: null,
    status: "received",
  };
}

export async function confirmHostedPayment(
  input: ConfirmHostedPaymentInput,
): Promise<ConfirmHostedPaymentResult> {
  const provider = input.event.provider.trim();
  const providerEventId = input.event.providerEventId.trim();
  const providerPaymentReference =
    input.event.providerPaymentReference.trim();

  if (!provider) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message: "Webhook provider is required.",
    });
  }

  if (!providerEventId) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message: "Webhook event ID is required.",
    });
  }

  if (!providerPaymentReference) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message: "Webhook payment reference is required.",
    });
  }

  if (!input.usageTimezone.trim()) {
    throw new HostedError("INTERNAL_ERROR", {
      status: 500,
      message: "Hosted usage timezone is required.",
    });
  }

  const clock = input.clock ?? new SystemHostedClock();

  return input.repository.executeTransaction(
    async (repository) => {
      const now = clock.now();
      const timestamp = now.toISOString();

      assertWebhookMatchesVerifiedPayment(
        input.event,
        input.payment,
      );

      const webhookEvent =
        await repository.createWebhookEvent(
          createReceivedWebhookEvent({
            ...input.event,
            provider,
            providerEventId,
            providerPaymentReference,
          }),
        );

      if (webhookEvent.status === "processed") {
        if (!webhookEvent.paymentId) {
          throw new HostedError("INTERNAL_ERROR", {
            status: 500,
            message:
              "Processed webhook event is missing its payment reference.",
            retryable: true,
          });
        }

        const payment =
          await repository.getPaymentById(
            webhookEvent.paymentId,
          );

        if (!payment) {
          throw new HostedError("INTERNAL_ERROR", {
            status: 500,
            message:
              "Processed webhook event references a missing payment.",
            retryable: true,
          });
        }

        assertStoredPaymentMatchesVerifiedPayment(
          payment,
          input.payment,
        );

        return {
          webhookEvent,
          payment,
          entitlement: null,
          alreadyProcessed: true,
        };
      }

      // Discover the account, then lock rows in account-first
      // order so checkout and confirmation serialize consistently.
      const candidatePayment =
        await repository.getPaymentByProviderReference(
          provider,
          providerPaymentReference,
        );

      if (!candidatePayment) {
        throw new HostedError("PAYMENT_NOT_CONFIRMED", {
          status: 404,
          message:
            "No matching Hosted payment could be found.",
          retryable: false,
        });
      }

      const account =
        await repository.getAccountById(
          candidatePayment.accountId,
          {
            forUpdate: true,
          },
        );

      if (!account) {
        throw new HostedError("INTERNAL_ERROR", {
          status: 500,
          message:
            "The account linked to this payment could not be found.",
          retryable: true,
        });
      }

      const payment =
        await repository.getPaymentByProviderReference(
          provider,
          providerPaymentReference,
          {
            forUpdate: true,
          },
        );

      if (
        !payment ||
        payment.accountId !== account.id ||
        payment.id !== candidatePayment.id
      ) {
        throw new HostedError("PAYMENT_NOT_CONFIRMED", {
          status: 409,
          message:
            "The stored payment changed while confirmation was being prepared.",
          retryable: true,
        });
      }

      assertStoredPaymentMatchesVerifiedPayment(
        payment,
        input.payment,
      );

      /*
       * A recovery operation or another webhook may already
       * have confirmed this charge. Complete this event without
       * granting access a second time.
       */
      if (payment.status === "confirmed") {
        const processedWebhookEvent =
          await repository.updateWebhookEvent({
            ...webhookEvent,
            paymentId: payment.id,
            processedAt: timestamp,
            status: "processed",
          });

        return {
          webhookEvent: processedWebhookEvent,
          payment,
          entitlement: null,
          alreadyProcessed: false,
        };
      }

      assertPaymentPending(payment);

      let activeEntitlement =
        await repository.getActiveEntitlement(
          account.id,
          {
            forUpdate: true,
          },
        );

      if (activeEntitlement) {
        if (shouldExpireEntitlement(activeEntitlement, now)) {
          activeEntitlement =
            expireEntitlement(activeEntitlement, now);

          await repository.updateEntitlement(
            activeEntitlement,
          );

          activeEntitlement = null;
        }
      }

      const confirmedPayment: HostedPayment = {
        ...payment,
        status: "confirmed",
        confirmedAt: timestamp,
      };

      const savedPayment =
        await repository.updatePayment(
          confirmedPayment,
        );

      /*
       * A real charge must be recorded even when access already
       * exists. Do not create a second entitlement automatically.
       * The warning is an explicit manual reconciliation signal.
       */
      if (activeEntitlement) {
        const processedWebhookEvent =
          await repository.updateWebhookEvent({
            ...webhookEvent,
            paymentId: savedPayment.id,
            processedAt: timestamp,
            status: "processed",
          });

        console.warn(
          "[AI ARENA] Confirmed Hosted payment requires manual reconciliation: an active entitlement already exists.",
          {
            accountId: account.id,
            paymentId: savedPayment.id,
            paymentReference:
              savedPayment.providerPaymentReference,
            activeEntitlementId: activeEntitlement.id,
          },
        );

        return {
          webhookEvent: processedWebhookEvent,
          payment: savedPayment,
          entitlement: null,
          alreadyProcessed: false,
        };
      }

      const entitlement =
        createEntitlementFromConfirmedPayment({
          accountId: account.id,
          payment: savedPayment,
          config: hostedConfig,
          startsAt: now,
          usageTimezone: input.usageTimezone,
        });

      const savedEntitlement =
        await repository.createEntitlement(
          entitlement,
        );

      const processedWebhookEvent =
        await repository.updateWebhookEvent({
          ...webhookEvent,
          paymentId: savedPayment.id,
          processedAt: timestamp,
          status: "processed",
        });

      return {
        webhookEvent: processedWebhookEvent,
        payment: savedPayment,
        entitlement: savedEntitlement,
        alreadyProcessed: false,
      };
    },
  );
}
