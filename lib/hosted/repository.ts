import type {
  HostedAccount,
  HostedDailyUsage,
  HostedEntitlement,
  HostedPayment,
  HostedRound,
  HostedRoundAttempt,
} from "./types";

export type HostedRepositoryQueryOptions = {
  forUpdate?: boolean;
};

export interface HostedRepository {
  getAccountByAuthSubjectId(
    authSubjectId: string,
  ): Promise<HostedAccount | null>;

  getAccountById(
    accountId: string,
  ): Promise<HostedAccount | null>;

  saveAccount(
    account: HostedAccount,
  ): Promise<HostedAccount>;

  getActiveEntitlement(
    accountId: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedEntitlement | null>;

  getEntitlementById(
    entitlementId: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedEntitlement | null>;

  createEntitlement(
    entitlement: HostedEntitlement,
  ): Promise<HostedEntitlement>;

  updateEntitlement(
    entitlement: HostedEntitlement,
  ): Promise<HostedEntitlement>;

  getDailyUsage(
    entitlementId: string,
    usageDate: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedDailyUsage | null>;

  createDailyUsage(
    usage: HostedDailyUsage,
  ): Promise<HostedDailyUsage>;

  updateDailyUsage(
    usage: HostedDailyUsage,
  ): Promise<HostedDailyUsage>;

  getPaymentById(
    paymentId: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedPayment | null>;

  getPaymentByProviderReference(
    provider: string,
    providerPaymentReference: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedPayment | null>;

  createPayment(
    payment: HostedPayment,
  ): Promise<HostedPayment>;

  updatePayment(
    payment: HostedPayment,
  ): Promise<HostedPayment>;

  getRoundById(
    roundId: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedRound | null>;

  getRoundByIdempotencyKey(
    entitlementId: string,
    idempotencyKey: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedRound | null>;

  createRound(
    round: HostedRound,
  ): Promise<HostedRound>;

  updateRound(
    round: HostedRound,
  ): Promise<HostedRound>;

  getRoundAttempts(
    roundId: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedRoundAttempt[]>;

  createRoundAttempt(
    attempt: HostedRoundAttempt,
  ): Promise<HostedRoundAttempt>;

  updateRoundAttempt(
    attempt: HostedRoundAttempt,
  ): Promise<HostedRoundAttempt>;

  executeTransaction<T>(
    callback: (
      repository: HostedRepository,
    ) => Promise<T>,
  ): Promise<T>;
}