import { HostedError } from "./errors";
import {
  assertVerifiedPayment,
  type VerifiedPayment,
} from "./payment";

export type HostedPaymentWebhook = {
  provider: string;
  providerEventId: string;
  providerPaymentReference: string;
  checkoutReference: string | null;
  receivedAt: Date;
  signature: string;
  rawBody: string;
};

export type VerifiedWebhookPayment = {
  event: HostedPaymentWebhook;
  payment: VerifiedPayment;
};

export interface HostedPaymentWebhookVerifier {
  verify(
    event: HostedPaymentWebhook,
  ): Promise<VerifiedWebhookPayment>;
}

export function assertWebhookEvent(
  event: HostedPaymentWebhook,
): void {
  if (!event.provider.trim()) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message: "Webhook provider is required.",
    });
  }

  if (!event.providerEventId.trim()) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message: "Webhook event ID is required.",
    });
  }

  if (!event.providerPaymentReference.trim()) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message: "Webhook payment reference is required.",
    });
  }

  if (!event.signature.trim()) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message: "Webhook signature is required.",
    });
  }

  if (!event.rawBody) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message: "Webhook raw body is required.",
    });
  }
}

export async function verifyHostedPaymentWebhook(
  verifier: HostedPaymentWebhookVerifier,
  event: HostedPaymentWebhook,
): Promise<VerifiedWebhookPayment> {
  assertWebhookEvent(event);

  const verified = await verifier.verify(event);

  if (
    verified.event.providerEventId !==
    event.providerEventId
  ) {
    throw new HostedError(
      "PAYMENT_NOT_CONFIRMED",
      {
        status: 400,
        message:
          "Verified webhook event does not match the received event.",
      },
    );
  }

  if (
    verified.event.providerPaymentReference !==
    event.providerPaymentReference
  ) {
    throw new HostedError(
      "PAYMENT_NOT_CONFIRMED",
      {
        status: 400,
        message:
          "Verified payment reference does not match the received event.",
      },
    );
  }

  assertVerifiedPayment(verified.payment);

  return verified;
}