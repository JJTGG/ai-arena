import { HostedError } from "./errors";
import {
  assertHostedPrice,
  type HostedPrice,
  type HostedPricingContext,
  resolveHostedPrice,
} from "./pricing";
import type { HostedPayment } from "./types";

export type HostedCheckoutRequest = {
  pricingContext: HostedPricingContext;
};

export type HostedCheckout = {
  id: string;
  accountId: string;
  amountMinor: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "expired";
  checkoutUrl: string | null;
  createdAt: string;
};

export function createHostedCheckout(
  accountId: string,
  request: HostedCheckoutRequest,
  now: Date,
): HostedCheckout {
  if (!accountId.trim()) {
    throw new HostedError("ACCOUNT_REQUIRED", {
      status: 400,
      message: "Account ID is required.",
    });
  }

  const price = resolveHostedPrice(
    request.pricingContext,
  );

  assertHostedPrice(price);

  return {
    id: crypto.randomUUID(),
    accountId,
    amountMinor: price.amountMinor,
    currency: price.currency,
    status: "pending",
    checkoutUrl: null,
    createdAt: now.toISOString(),
  };
}

export function attachCheckoutUrl(
  checkout: HostedCheckout,
  checkoutUrl: string,
): HostedCheckout {
  if (!checkoutUrl.trim()) {
    throw new HostedError("INTERNAL_ERROR", {
      status: 500,
      message: "Checkout URL cannot be empty.",
    });
  }

  if (checkout.status !== "pending") {
    throw new HostedError("PAYMENT_ALREADY_PROCESSED", {
      status: 409,
      message:
        "A checkout URL cannot be attached to a completed checkout.",
    });
  }

  return {
    ...checkout,
    checkoutUrl,
  };
}

export function markCheckoutCompleted(
  checkout: HostedCheckout,
): HostedCheckout {
  if (checkout.status === "completed") {
    return checkout;
  }

  if (checkout.status !== "pending") {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 409,
      message:
        `Checkout cannot be completed from status "${checkout.status}".`,
    });
  }

  return {
    ...checkout,
    status: "completed",
  };
}

export function isCheckoutForPayment(
  checkout: HostedCheckout,
  payment: HostedPayment,
): boolean {
  return (
    checkout.accountId === payment.accountId &&
    checkout.amountMinor === payment.amountMinor &&
    checkout.currency === payment.currency
  );
}

export function assertCheckoutMatchesPrice(
  checkout: HostedCheckout,
  price: HostedPrice,
): void {
  if (
    checkout.amountMinor !== price.amountMinor ||
    checkout.currency !== price.currency
  ) {
    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 409,
      message:
        "Checkout amount or currency does not match the server-resolved price.",
    });
  }
}