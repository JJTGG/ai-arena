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

type MonnifyProviderConfig = {
  apiKey: string;
  secretKey: string;
  contractCode: string;
  baseUrl: string;
};

type MonnifyAuthResponse = {
  requestSuccessful?: boolean;
  responseMessage?: string;
  responseBody?: {
    accessToken?: string;
  };
};

type MonnifyInitializeResponse = {
  requestSuccessful?: boolean;
  responseMessage?: string;
  responseBody?: {
    transactionReference?: string;
    paymentReference?: string;
    checkoutUrl?: string;
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

function getMonnifyConfig(): MonnifyProviderConfig {
  return {
    apiKey: requireEnvironment("MONNIFY_API_KEY"),
    secretKey: requireEnvironment("MONNIFY_SECRET_KEY"),
    contractCode: requireEnvironment("MONNIFY_CONTRACT_CODE"),
    baseUrl:
      process.env.MONNIFY_BASE_URL?.trim() ||
      "https://sandbox.monnify.com",
  };
}

function encodeBasicCredentials(
  apiKey: string,
  secretKey: string,
): string {
  return Buffer.from(`${apiKey}:${secretKey}`, "utf8").toString("base64");
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.text();

  if (!body) {
    throw new HostedError("PROVIDER_REJECTED", {
      status: 502,
      message: "Monnify returned an empty response.",
      retryable: true,
    });
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new HostedError("PROVIDER_REJECTED", {
      status: 502,
      message: "Monnify returned an invalid JSON response.",
      retryable: true,
    });
  }
}

function assertSuccessfulResponse(
  response: Response,
  payload: {
    requestSuccessful?: boolean;
    responseMessage?: string;
  },
): void {
  if (!response.ok || payload.requestSuccessful !== true) {
    throw new HostedError("PROVIDER_REJECTED", {
      status: 502,
      message:
        payload.responseMessage?.trim() ||
        `Monnify request failed with HTTP ${response.status}.`,
      retryable: response.status >= 500,
    });
  }
}

export class MonnifyHostedPaymentProvider
  implements HostedPaymentProvider
{
  readonly id = "monnify";

  private readonly config: MonnifyProviderConfig;

  constructor(config: Partial<MonnifyProviderConfig> = {}) {
    const defaults = getMonnifyConfig();

    this.config = {
      apiKey: config.apiKey?.trim() || defaults.apiKey,
      secretKey: config.secretKey?.trim() || defaults.secretKey,
      contractCode:
        config.contractCode?.trim() || defaults.contractCode,
      baseUrl:
        config.baseUrl?.trim() || defaults.baseUrl,
    };
  }

  private async getAccessToken(): Promise<string> {
    const response = await fetch(
      `${this.config.baseUrl}/api/v1/auth/login`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Basic ${encodeBasicCredentials(
              this.config.apiKey,
              this.config.secretKey,
            )}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    const payload =
      await readJson<MonnifyAuthResponse>(response);

    assertSuccessfulResponse(response, payload);

    const accessToken =
      payload.responseBody?.accessToken?.trim();

    if (!accessToken) {
      throw new HostedError("PROVIDER_REJECTED", {
        status: 502,
        message:
          "Monnify authentication succeeded without an access token.",
        retryable: true,
      });
    }

    return accessToken;
  }

  async initializePayment(
    input: HostedPaymentInitializationInput,
  ): Promise<HostedPaymentInitializationResult> {
    const paymentReference =
      input.payment.providerPaymentReference.trim();

    if (!paymentReference) {
      throw new HostedError("PAYMENT_NOT_CONFIRMED", {
        status: 400,
        message: "A payment reference is required.",
      });
    }

    const accessToken =
      await this.getAccessToken();

    const response = await fetch(
      `${this.config.baseUrl}/api/v1/merchant/transactions/init-transaction`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount:
            input.payment.amountMinor / 100,
          customerName:
            input.customerEmail.split("@")[0] ||
            "Hosted Arena Customer",
          customerEmail:
            input.customerEmail,
          paymentReference,
          paymentDescription:
            input.paymentDescription,
          currencyCode:
            input.payment.currency,
          contractCode:
            this.config.contractCode,
          redirectUrl:
            input.redirectUrl,
          ...(input.payment.currency === "USD"
            ? {
                paymentMethods: ["CARD"],
              }
            : {}),
        }),
        cache: "no-store",
      },
    );

    const payload =
      await readJson<MonnifyInitializeResponse>(
        response,
      );

    assertSuccessfulResponse(response, payload);

    const transactionReference =
      payload.responseBody?.transactionReference?.trim();

    const checkoutUrl =
      payload.responseBody?.checkoutUrl?.trim();

    const returnedPaymentReference =
      payload.responseBody?.paymentReference?.trim();

    if (!transactionReference || !checkoutUrl) {
      throw new HostedError("PROVIDER_REJECTED", {
        status: 502,
        message:
          "Monnify initialization did not return the required checkout details.",
        retryable: true,
      });
    }

    if (
      returnedPaymentReference &&
      returnedPaymentReference !== paymentReference
    ) {
      throw new HostedError("PROVIDER_REJECTED", {
        status: 502,
        message:
          "Monnify returned a different payment reference.",
      });
    }

    return {
      checkoutUrl,
      providerTransactionReference:
        transactionReference,
    };
  }

  async verifyWebhook(
    event: HostedPaymentWebhook,
  ): Promise<VerifiedWebhookPayment> {
    assertWebhookEvent(event);

    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 501,
      message:
        "Monnify webhook verification is not implemented yet.",
    });
  }

  async verifyPayment(
    payment: HostedPayment,
  ): Promise<VerifiedPayment> {
    void payment;

    throw new HostedError("PAYMENT_NOT_CONFIRMED", {
      status: 501,
      message:
        "Monnify payment verification is not implemented yet.",
    });
  }
}
