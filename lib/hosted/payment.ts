import { HostedError } from "./errors";
import type {
  HostedPayment,
  PaymentStatus,
} from "./types";

export type VerifiedPayment = {
  provider: string;
  providerPaymentReference: string;
  checkoutReference: string | null;
  amountMinor: number;
  currency: string;
};

export function assertPaymentPending(
  payment: HostedPayment,
): void {
  if (payment.status !== "pending") {
    throw new HostedError(
      payment.status === "confirmed"
        ? "PAYMENT_ALREADY_PROCESSED"
        : "PAYMENT_NOT_CONFIRMED",
      {
        status: 409,
        message: `Payment cannot be confirmed from status "${payment.status}".`,
      },
    );
  }
}

export function assertVerifiedPayment(
  payment: VerifiedPayment,
): void {
  if (!payment.provider.trim()) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message: "Payment provider is required.",
    });
  }

  if (!payment.providerPaymentReference.trim()) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message: "Provider payment reference is required.",
    });
  }

  if (
    !Number.isSafeInteger(payment.amountMinor) ||
    payment.amountMinor <= 0
  ) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message: "Verified payment amount is invalid.",
    });
  }

  if (!payment.currency.trim()) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 400,
      message: "Verified payment currency is required.",
    });
  }
}

export function canConfirmPayment(
  status: PaymentStatus,
): boolean {
  return status === "pending";
}

export function isPaymentConfirmed(
  payment: HostedPayment,
): boolean {
  return payment.status === "confirmed";
}

export function isPaymentTerminal(
  status: PaymentStatus,
): boolean {
  return (
    status === "confirmed" ||
    status === "failed" ||
    status === "expired" ||
    status === "reversed"
  );
}