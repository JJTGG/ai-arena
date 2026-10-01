import { HostedError } from "./errors";
import {
  assertCanCreateEntitlement,
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

function normalizeProvider(
  value: string,
): string {
  return value.trim().toLowerCase();
}

function normalizeReference(
  value: string,
): string {
  return value.trim();
}

function normalizeCurrency(
  value: string,
): string {
  return value.trim().toUpperCase();
}

function assertWebhookMatchesVerifiedPayment(
  event: HostedPaymentWebhook,
  verifiedPayment: VerifiedPayment,
): void {
  if (
    normalizeProvider(event.provider) !==
    normalizeProvider(
      verifiedPayment.provider,
    )
  ) {
    throw new HostedError(
      "PAYMENT_NOT_CONFIRMED",
      {
        status: 400,
        message:
          "Webhook provider does not match the verified payment.",
      },
    );
  }

  if (
    normalizeReference(
      event.providerPaymentReference,
    ) !==
    normalizeReference(
      verifiedPayment.providerPaymentReference,
    )
  ) {
    throw new HostedError(
      "PAYMENT_NOT_CONFIRMED",
      {
        status: 400,
        message:
          "Webhook payment reference does not match the verified payment.",
      },
    );
  }

  if (
    event.checkoutReference !==
      null &&
    verifiedPayment.checkoutReference !==
      null &&
    normalizeReference(
      event.checkoutReference,
    ) !==
      normalizeReference(
        verifiedPayment.checkoutReference,
      )
  ) {
    throw new HostedError(
      "PAYMENT_NOT_CONFIRMED",
      {
        status: 400,
        message:
          "Webhook checkout reference does not match the verified payment.",
      },
    );
  }
}

function assertStoredPaymentMatchesVerifiedPayment(
  payment: HostedPayment,
  verifiedPayment: VerifiedPayment,
): void {
  if (
    normalizeProvider(payment.provider) !==
    normalizeProvider(
      verifiedPayment.provider,
    )
  ) {
    throw new HostedError(
      "PAYMENT_NOT_CONFIRMED",
      {
        status: 409,
        message:
          "Stored payment provider does not match the verified webhook payment.",
      },
    );
  }

  if (
    normalizeReference(
      payment.providerPaymentReference,
    ) !==
    normalizeReference(
      verifiedPayment.providerPaymentReference,
    )
  ) {
    throw new HostedError(
      "PAYMENT_NOT_CONFIRMED",
      {
        status: 409,
        message:
          "Stored payment reference does not match the verified webhook payment.",
      },
    );
  }

  if (
    payment.amountMinor !==
    verifiedPayment.amountMinor
  ) {
    throw new HostedError(
      "PAYMENT_NOT_CONFIRMED",
      {
        status: 409,
        message:
          "Stored payment amount does not match the verified webhook payment.",
      },
    );
  }

  if (
    normalizeCurrency(payment.currency) !==
    normalizeCurrency(
      verifiedPayment.currency,
    )
  ) {
    throw new HostedError(
      "PAYMENT_NOT_CONFIRMED",
      {
        status: 409,
        message:
          "Stored payment currency does not match the verified webhook payment.",
      },
    );
  }

  if (
    payment.checkoutReference !==
      null &&
    verifiedPayment.checkoutReference !==
      null &&
    normalizeReference(
      payment.checkoutReference,
    ) !==
      normalizeReference(
        verifiedPayment.checkoutReference,
      )
  ) {
    throw new HostedError(
      "PAYMENT_NOT_CONFIRMED",
      {
        status: 409,
        message:
          "Stored checkout reference does not match the verified webhook payment.",
      },
    );
  }
}

function createReceivedWebhookEvent(
  event: HostedPaymentWebhook,
): HostedWebhookEvent {
  return {
    id: crypto.randomUUID(),
    provider:
      event.provider.trim(),
    providerEventId:
      event.providerEventId.trim(),
    paymentId: null,
    receivedAt:
      event.receivedAt.toISOString(),
    processedAt: null,
    status: "received",
  };
}

export async function confirmHostedPayment(
  input: ConfirmHostedPaymentInput,
): Promise<ConfirmHostedPaymentResult> {
  const provider =
    input.event.provider.trim();

  const providerEventId =
    input.event.providerEventId.trim();

  const providerPaymentReference =
    input.event.providerPaymentReference.trim();

  if (!provider) {
    throw new HostedError(
      "PAYMENT_NOT_CONFIRMED",
      {
        status: 400,
        message:
          "Webhook provider is required.",
      },
    );
  }

  if (!providerEventId) {
    throw new HostedError(
      "PAYMENT_NOT_CONFIRMED",
      {
        status: 400,
        message:
          "Webhook event ID is required.",
      },
    );
  }

  if (!providerPaymentReference) {
    throw new HostedError(
      "PAYMENT_NOT_CONFIRMED",
      {
        status: 400,
        message:
          "Webhook payment reference is required.",
      },
    );
  }

  if (!input.usageTimezone.trim()) {
    throw new HostedError(
      "INTERNAL_ERROR",
      {
        status: 500,
        message:
          "Hosted usage timezone is required.",
      },
    );
  }

  const clock =
    input.clock ??
    new SystemHostedClock();

  return input.repository.executeTransaction(
    async (repository) => {
      const now = clock.now();
      const timestamp =
        now.toISOString();

      assertWebhookMatchesVerifiedPayment(
        input.event,
        input.payment,
      );

      /*
       * Webhook acquisition is the first durable step.
       *
       * createWebhookEvent() handles the unique
       * provider/event constraint and locks an existing
       * event when this repository is inside a transaction.
       */
      const webhookEvent =
        await repository.createWebhookEvent(
          createReceivedWebhookEvent({
            ...input.event,
            provider,
            providerEventId,
            providerPaymentReference,
          }),
        );

      /*
       * A processed webhook is terminal from the
       * application perspective. A duplicate delivery
       * should therefore return the existing state rather
       * than attempt to confirm the payment again.
       */
      if (
        webhookEvent.status ===
        "processed"
      ) {
        if (!webhookEvent.paymentId) {
          throw new HostedError(
            "INTERNAL_ERROR",
            {
              status: 500,
              message:
                "Processed webhook event is missing its payment reference.",
              retryable: true,
            },
          );
        }

        const payment =
          await repository.getPaymentById(
            webhookEvent.paymentId,
          );

        if (!payment) {
          throw new HostedError(
            "INTERNAL_ERROR",
            {
              status: 500,
              message:
                "Processed webhook event references a missing payment.",
              retryable: true,
            },
          );
        }

        return {
          webhookEvent,
          payment,
          entitlement: null,
          alreadyProcessed: true,
        };
      }

      /*
       * Lock the payment before changing any financial state.
       */
      const payment =
        await repository.getPaymentByProviderReference(
          provider,
          providerPaymentReference,
          {
            forUpdate: true,
          },
        );

      if (!payment) {
        throw new HostedError(
          "PAYMENT_NOT_CONFIRMED",
          {
            status: 404,
            message:
              "No matching Hosted payment could be found.",
            retryable: false,
          },
        );
      }

      assertPaymentPending(
        payment,
      );

      assertStoredPaymentMatchesVerifiedPayment(
        payment,
        input.payment,
      );

      const confirmedPayment: HostedPayment = {
        ...payment,
        status: "confirmed",
        confirmedAt:
          timestamp,
      };

      const savedPayment =
        await repository.updatePayment(
          confirmedPayment,
        );

      /*
       * Lock the account's active entitlement.
       *
       * Existing active entitlements are checked after
       * payment confirmation but before creating the new
       * entitlement.
       */
      let activeEntitlement =
        await repository.getActiveEntitlement(
          savedPayment.accountId,
          {
            forUpdate: true,
          },
        );

      if (activeEntitlement) {
        if (
          shouldExpireEntitlement(
            activeEntitlement,
            now,
          )
        ) {
          activeEntitlement =
            expireEntitlement(
              activeEntitlement,
              now,
            );

          await repository.updateEntitlement(
            activeEntitlement,
          );

          activeEntitlement = null;
        }
      }

      assertCanCreateEntitlement(
        activeEntitlement,
      );

      const entitlement =
        createEntitlementFromConfirmedPayment({
          accountId:
            savedPayment.accountId,
          payment:
            savedPayment,
          config:
            hostedConfig,
          startsAt:
            now,
          usageTimezone:
            input.usageTimezone,
        });

      const savedEntitlement =
        await repository.createEntitlement(
          entitlement,
        );

      const processedWebhookEvent =
        await repository.updateWebhookEvent({
          ...webhookEvent,
          paymentId:
            savedPayment.id,
          processedAt:
            timestamp,
          status:
            "processed",
        });

      return {
        webhookEvent:
          processedWebhookEvent,
        payment:
          savedPayment,
        entitlement:
          savedEntitlement,
        alreadyProcessed: false,
      };
    },
  );
}