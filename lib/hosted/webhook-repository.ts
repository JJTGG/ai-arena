import type { HostedRepository } from "./repository";

export type HostedWebhookEventStatus =
  | "received"
  | "processed"
  | "failed";

export type HostedWebhookEvent = {
  id: string;
  provider: string;
  providerEventId: string;
  paymentId: string | null;
  receivedAt: string;
  processedAt: string | null;
  status: HostedWebhookEventStatus;
};

export interface HostedWebhookRepository
  extends HostedRepository {
  getWebhookEvent(
    provider: string,
    providerEventId: string,
  ): Promise<HostedWebhookEvent | null>;

  createWebhookEvent(
    event: HostedWebhookEvent,
  ): Promise<HostedWebhookEvent>;

  updateWebhookEvent(
    event: HostedWebhookEvent,
  ): Promise<HostedWebhookEvent>;

  executeTransaction<T>(
    callback: (
      repository: HostedWebhookRepository,
    ) => Promise<T>,
  ): Promise<T>;
}