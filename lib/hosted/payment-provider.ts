import type {
  HostedPayment,
} from "./types";
import type {
  VerifiedPayment,
} from "./payment";
import type {
  HostedPaymentWebhook,
  VerifiedWebhookPayment,
} from "./webhooks";

export type HostedPaymentInitializationInput = {
  payment: HostedPayment;
  customerEmail: string;
  redirectUrl: string;
  paymentDescription: string;
};

export type HostedPaymentInitializationResult = {
  checkoutUrl: string;
  providerTransactionReference: string | null;
};

export interface HostedPaymentProvider {
  readonly id: string;

  initializePayment(
    input: HostedPaymentInitializationInput,
  ): Promise<HostedPaymentInitializationResult>;

  verifyWebhook(
    event: HostedPaymentWebhook,
  ): Promise<VerifiedWebhookPayment>;

  verifyPayment(
    payment: HostedPayment,
  ): Promise<VerifiedPayment>;
}