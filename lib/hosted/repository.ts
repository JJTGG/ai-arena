import type {
  HostedAccount,
  HostedDailyUsage,
  HostedEntitlement,
  HostedPayment,
  HostedRound,
  HostedRoundAttempt,
} from "./types";

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
  ): Promise<HostedEntitlement | null>;

  getEntitlementById(
    entitlementId: string,
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
  ): Promise<HostedDailyUsage | null>;

  createDailyUsage(
    usage: HostedDailyUsage,
  ): Promise<HostedDailyUsage>;

  updateDailyUsage(
    usage: HostedDailyUsage,
  ): Promise<HostedDailyUsage>;

  getPaymentById(
    paymentId: string,
  ): Promise<HostedPayment | null>;

  getPaymentByProviderReference(
    provider: string,
    providerPaymentReference: string,
  ): Promise<HostedPayment | null>;

  createPayment(
    payment: HostedPayment,
  ): Promise<HostedPayment>;

  updatePayment(
    payment: HostedPayment,
  ): Promise<HostedPayment>;

  getRoundById(
    roundId: string,
  ): Promise<HostedRound | null>;

  getRoundByIdempotencyKey(
    entitlementId: string,
    idempotencyKey: string,
  ): Promise<HostedRound | null>;

  createRound(
    round: HostedRound,
  ): Promise<HostedRound>;

  updateRound(
    round: HostedRound,
  ): Promise<HostedRound>;

  getRoundAttempts(
    roundId: string,
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