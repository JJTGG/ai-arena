import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { HostedError } from "./errors";
import type {
  HostedPaymentInitializationInput,
  HostedPaymentInitializationResult,
  HostedPaymentProvider,
} from "./payment-provider";
import {
  assertWebhookEvent,
  type HostedPaymentWebhook,
  type VerifiedWebhookPayment,
} from "./webhooks";
import type { VerifiedPayment } from "./payment";
import type { HostedPayment } from "./types";

type PaystackConfig = {
  secretKey: string;
  baseUrl: string;
};

type PaystackInitializeResponse = {
  status?: boolean;
  message?: string;
  data?: {
    authorization_url?: string;
    access_code?: string;
    reference?: string;
  };
};

type PaystackVerifyResponse = {
  status?: boolean;
  message?: string;
  data?: {
    id?: number;
    domain?: string;
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    transaction_date?: string;
    metadata?: Record<string, unknown> | null;
  };
};

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new HostedError("PROVIDER_CONFIGURATION_ERROR", {
      status: 500,
      message: `${name} is required.`,
    });
  }

  return value;
}

function getPaystackConfig(): PaystackConfig {
  return {
    secretKey: requireEnvironment("PAYSTACK_SECRET_KEY"),
    baseUrl:
      process.env.PAYSTACK_BASE_URL?.trim() ||
      "https://api.paystack.co",
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.text();

  if (!body) {
    throw new HostedError("PROVIDER_REJECTED", {
      status: 502,
      message: "Paystack returned an empty response.",
      retryable: true,
    });
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new HostedError("PROVIDER_REJECTED", {
      status: 502,
      message: "Paystack returned invalid JSON.",
      retryable: true,
    });
  }
}

function assertSuccessfulResponse(
  response: Response,
  payload: {
    status?: boolean;
    message?: string;
  },
): void {
  if (!response.ok || payload.status !== true) {
    throw new HostedError("PROVIDER_REJECTED", {
      status: 502,
      message:
        payload.message?.trim() ||
        `Paystack request failed with HTTP ${response.status}.`,
      retryable: response.status >= 500,
    });
  }
}

function normalizeReference(value: string): string {
  return value.trim();
}

function normalizeCurrency(value: string): string {
  return value.trim().toUpperCase();
}

function getCheckoutReference(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const value = metadata?.checkoutReference;

  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function createSignature(
  secretKey: string,
  rawBody: string,
): Buffer {
  return createHmac("sha512", secretKey)
    .update(rawBody)
    .digest();
}

export function verifyPaystackWebhookSignature(
  rawBody: string,
  signature: string,
  secretKey: string,
): boolean {
  const normalizedSignature = signature.trim();

  if (!normalizedSignature) {
    return false;
  }

  let supplied: Buffer;

  try {
    supplied = Buffer.from(normalizedSignature, "hex");
  } catch {
    return false;
  }

  const expected = createSignature(secretKey, rawBody);

  if (supplied.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(supplied, expected);
}

export class PaystackHostedPaymentProvider
  implements HostedPaymentProvider
{
  readonly id = "paystack";

  private readonly config: PaystackConfig;

  constructor(config: Partial<PaystackConfig> = {}) {
    const defaults = getPaystackConfig();

    this.config = {
      secretKey:
        config.secretKey?.trim() || defaults.secretKey,
      baseUrl:
        config.baseUrl?.trim() || defaults.baseUrl,
    };
  }

  private async verifyTransactionByReference(
    reference: string,
  ): Promise<VerifiedPayment> {
    const normalizedReference = normalizeReference(reference);

    if (!normalizedReference) {
      throw new HostedError("PAYMENT_NOT_CONFIRMED", {
        status: 400,
        message: "A Paystack transaction reference is required.",
      });
    }

    const response = await fetch(
      `${this.config.baseUrl}/transaction/verify/${encodeURIComponent(
        normalizedReference,
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const payload =
      await readJson<PaystackVerifyResponse>(response);

    assertSuccessfulResponse(response, payload);

    const transaction = payload.data;

    if (!transaction) {
      throw new HostedError("PAYMENT_NOT_CONFIRMED", {
        status: 502,
        message:
          "Paystack verification returned no transaction data.",
        retryable: true,
      });
    }

    if (transaction.status !== "success") {
      throw new HostedError("PAYMENT_NOT_CONFIRMED", {
        status: 409,
        message:
          "Paystack transaction has not completed successfully.",
      });
    }

    const returnedReference =
      transaction.reference?.trim();

    if (
      !returnedReference ||
      returnedReference !== normalizedReference
    ) {
      throw new HostedError("PAYMENT_NOT_CONFIRMED", {
        status: 409,
        message:
          "Paystack returned a different transaction reference.",
      });
    }

    const amountMinor = transaction.amount;

    if (
      typeof amountMinor !== "number" ||
      !Number.isSafeInteger(amountMinor) ||
      amountMinor <= 0
    ) {
      throw new HostedError("PAYMENT_NOT_CONFIRMED", {
        status: 409,
        message:
          "Paystack returned an invalid transaction amount.",
      });
    }

    const currency =
      transaction.currency?.trim().toUpperCase();

    if (!currency) {
      throw new HostedError("PAYMENT_NOT_CONFIRMED", {
        status: 409,
        message:
          "Paystack returned no transaction currency.",
      });
    }

    return {
      provider: this.id,
      providerPaymentReference: normalizedReference,
      checkoutReference:
        getCheckoutReference(transaction.metadata),
      amountMinor,
      currency,
    };
  }

  async initializePayment(
    input: HostedPaymentInitializationInput,
  ): Promise<HostedPaymentInitializationResult> {
    const paymentReference =
      normalizeReference(
        input.payment.providerPaymentReference,
      );

    if (!paymentReference) {
      throw new HostedError("PAYMENT_NOT_CONFIRMED", {
        status: 400,
        message: "A payment reference is required.",
      });
    }

    const response = await fetch(
      `${this.config.baseUrl}/transaction/initialize`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${this.config.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: input.customerEmail,
          amount: input.payment.amountMinor,
          currency:
            normalizeCurrency(input.payment.currency),
          reference: paymentReference,
          callback_url: input.redirectUrl,
          metadata: {
            accountId: input.payment.accountId,
            checkoutReference:
              input.payment.checkoutReference,
            paymentId: input.payment.id,
          },
        }),
        cache: "no-store",
      },
    );

    const payload =
      await readJson<PaystackInitializeResponse>(
        response,
      );

    assertSuccessfulResponse(response, payload);

    const authorizationUrl =
      payload.data?.authorization_url?.trim();

    const returnedReference =
      payload.data?.reference?.trim();

    if (!authorizationUrl || !returnedReference) {
      throw new HostedError("PROVIDER_REJECTED", {
        status: 502,
        message:
          "Paystack initialization did not return the required checkout details.",
        retryable: true,
      });
    }

    if (returnedReference !== paymentReference) {
      throw new HostedError("PROVIDER_REJECTED", {
        status: 502,
        message:
          "Paystack returned a different payment reference.",
      });
    }

    return {
      checkoutUrl: authorizationUrl,
      providerTransactionReference:
        returnedReference,
    };
  }

  async verifyWebhook(
    event: HostedPaymentWebhook,
  ): Promise<VerifiedWebhookPayment> {
    assertWebhookEvent(event);

    const payment =
      await this.verifyTransactionByReference(
        event.providerPaymentReference,
      );

    return {
      event,
      payment,
    };
  }

  async verifyPayment(
    payment: HostedPayment,
  ): Promise<VerifiedPayment> {
    return this.verifyTransactionByReference(
      payment.providerPaymentReference,
    );
  }
}
