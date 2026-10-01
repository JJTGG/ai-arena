export type HostedProviderId =
  | "gemini"
  | "groq";

export type AccountStatus =
  | "active"
  | "suspended";

export type PaymentStatus =
  | "pending"
  | "confirmed"
  | "failed"
  | "expired"
  | "reversed";

export type EntitlementStatus =
  | "active"
  | "expired"
  | "suspended"
  | "cancelled";

export type RoundStatus =
  | "reserved"
  | "running"
  | "completed"
  | "retryable"
  | "failed"
  | "released";

export type AttemptStatus =
  | "pending"
  | "running"
  | "completed"
  | "retryable"
  | "failed";

export type HostedErrorCode =
  | "ACCOUNT_REQUIRED"
  | "ACCOUNT_SUSPENDED"
  | "HOSTED_ELIGIBILITY_REQUIRED"
  | "ENTITLEMENT_REQUIRED"
  | "ENTITLEMENT_EXPIRED"
  | "DAILY_LIMIT_REACHED"
  | "NO_ROUNDS_AVAILABLE"
  | "ROUND_NOT_FOUND"
  | "ROUND_NOT_OWNED"
  | "ROUND_NOT_EXECUTABLE"
  | "ROUND_ALREADY_COMPLETED"
  | "INVALID_PROVIDER_RESULT"
  | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_CONFIGURATION_ERROR"
  | "PROVIDER_REJECTED"
  | "IDEMPOTENCY_CONFLICT"
  | "PAYMENT_NOT_CONFIRMED"
  | "PAYMENT_ALREADY_PROCESSED"
  | "INTERNAL_ERROR";

export type HostedEntrantConfig = {
  slot: 1 | 2;
  provider: HostedProviderId;
  model: string;
  enabled: boolean;
};

export type HostedConfig = {
  totalRounds: number;
  dailyLimit: number;
  durationDays: number;
  entrantCount: number;
  entrants: HostedEntrantConfig[];
};

export type HostedProviderRequest = {
  prompt: string;
  roundId: string;
  attemptId: string;
  requestId: string;
};

export type HostedProviderResult = {
  ok: boolean;
  text?: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  providerRequestId?: string;
  errorCode?: HostedErrorCode;
  retryable?: boolean;
};

export type HostedAccount = {
  id: string;
  authSubjectId: string;
  email: string;
  emailVerifiedAt: string | null;
  ageConfirmedAt: string | null;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
};

export type HostedPayment = {
  id: string;
  accountId: string;
  provider: string;
  providerPaymentReference: string;
  checkoutReference: string | null;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  confirmedAt: string | null;
  reversedAt: string | null;
};

export type HostedEntitlement = {
  id: string;
  accountId: string;
  paymentId: string;
  status: EntitlementStatus;
  startsAt: string;
  expiresAt: string;
  totalRounds: number;
  completedRounds: number;
  reservedRounds: number;
  dailyLimit: number;
  usageTimezone: string;
  createdAt: string;
  updatedAt: string;
};

export type HostedDailyUsage = {
  id: string;
  entitlementId: string;
  usageDate: string;
  reservedRounds: number;
  completedRounds: number;
  createdAt: string;
  updatedAt: string;
};

export type HostedRound = {
  id: string;
  entitlementId: string;
  idempotencyKey: string;
  usageDate: string;
  status: RoundStatus;
  reservedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  releasedAt: string | null;
  failureCode: HostedErrorCode | null;
  createdAt: string;
  updatedAt: string;
};

export type HostedRoundAttempt = {
  id: string;
  roundId: string;
  entrantSlot: 1 | 2;
  attemptNumber: number;
  attemptKey: string;
  provider: HostedProviderId;
  model: string;
  providerRequestId: string | null;
  status: AttemptStatus;
  startedAt: string | null;
  completedAt: string | null;
  latencyMs: number | null;
  errorCode: HostedErrorCode | null;
  createdAt: string;
};

export type HostedAccessSnapshot = {
  eligible: boolean;
  accountRequired: boolean;
  ageConfirmationRequired: boolean;
  activeEntitlement: boolean;
  checkoutAvailable: boolean;
  entitlement?: {
    status: EntitlementStatus;
    startsAt: string;
    expiresAt: string;
    totalRounds: number;
    completedRounds: number;
    reservedRounds: number;
    roundsRemaining: number;
    dailyLimit: number;
    dailyCompletedRounds: number;
    dailyReservedRounds: number;
    dailyRoundsRemaining: number;
  };
};