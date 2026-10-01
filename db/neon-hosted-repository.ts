import "server-only";

import { Client } from "@neondatabase/serverless";

import {
  createHostedDbClient,
  withHostedDbTransaction,
} from "./client";
import type {
  HostedRepositoryQueryOptions,
} from "../lib/hosted/repository";
import type {
  HostedWebhookEvent,
  HostedWebhookRepository,
} from "../lib/hosted/webhook-repository";
import type {
  HostedAccount,
  HostedDailyUsage,
  HostedEntitlement,
  HostedPayment,
  HostedRound,
  HostedRoundAttempt,
} from "../lib/hosted/types";

type SqlRow = {
  [key: string]: unknown;
};

type TimestampValue = Date | string;
type DateValue = Date | string;

type AccountRow = SqlRow & {
  id: string;
  auth_subject_id: string;
  email: string;
  email_verified_at: TimestampValue | null;
  age_confirmed_at: TimestampValue | null;
  status: HostedAccount["status"];
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

type PaymentRow = SqlRow & {
  id: string;
  account_id: string;
  provider: string;
  provider_payment_reference: string;
  checkout_reference: string | null;
  amount_minor: number;
  currency: string;
  status: HostedPayment["status"];
  created_at: TimestampValue;
  confirmed_at: TimestampValue | null;
  reversed_at: TimestampValue | null;
};

type EntitlementRow = SqlRow & {
  id: string;
  account_id: string;
  payment_id: string;
  status: HostedEntitlement["status"];
  starts_at: TimestampValue;
  expires_at: TimestampValue;
  total_rounds: number;
  completed_rounds: number;
  reserved_rounds: number;
  daily_limit: number;
  usage_timezone: string;
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

type DailyUsageRow = SqlRow & {
  id: string;
  entitlement_id: string;
  usage_date: DateValue;
  reserved_rounds: number;
  completed_rounds: number;
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

type RoundRow = SqlRow & {
  id: string;
  entitlement_id: string;
  idempotency_key: string;
  prompt: string;
  usage_date: DateValue;
  status: HostedRound["status"];
  reserved_at: TimestampValue;
  started_at: TimestampValue | null;
  completed_at: TimestampValue | null;
  released_at: TimestampValue | null;
  failure_code: HostedRound["failureCode"];
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

type RoundAttemptRow = SqlRow & {
  id: string;
  round_id: string;
  entrant_slot: 1 | 2;
  attempt_number: number;
  attempt_key: string;
  provider: HostedRoundAttempt["provider"];
  model: string;
  provider_request_id: string | null;
  status: HostedRoundAttempt["status"];
  started_at: TimestampValue | null;
  completed_at: TimestampValue | null;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  response_text: string | null;
  error_code: HostedRoundAttempt["errorCode"];
  created_at: TimestampValue;
};

type WebhookEventRow = SqlRow & {
  id: string;
  provider: string;
  provider_event_id: string;
  payment_id: string | null;
  received_at: TimestampValue;
  processed_at: TimestampValue | null;
  status: HostedWebhookEvent["status"];
};

function toIsoString(
  value: TimestampValue,
): string {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "Database returned an invalid timestamp.",
    );
  }

  return date.toISOString();
}

function nullableIsoString(
  value: TimestampValue | null,
): string | null {
  return value === null
    ? null
    : toIsoString(value);
}

function toDateKey(
  value: DateValue,
): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(
        "Database returned an invalid date.",
      );
    }

    return value
      .toISOString()
      .slice(0, 10);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(
      "Database returned an invalid date.",
    );
  }

  return value;
}

function requireRow<T>(
  rows: T[],
  entityName: string,
): T {
  const row = rows[0];

  if (!row) {
    throw new Error(
      "Expected " +
        entityName +
        " row after database write.",
    );
  }

  return row;
}

function mapAccount(
  row: AccountRow,
): HostedAccount {
  return {
    id: row.id,
    authSubjectId:
      row.auth_subject_id,
    email: row.email,
    emailVerifiedAt:
      nullableIsoString(
        row.email_verified_at,
      ),
    ageConfirmedAt:
      nullableIsoString(
        row.age_confirmed_at,
      ),
    status: row.status,
    createdAt:
      toIsoString(
        row.created_at,
      ),
    updatedAt:
      toIsoString(
        row.updated_at,
      ),
  };
}

function mapPayment(
  row: PaymentRow,
): HostedPayment {
  return {
    id: row.id,
    accountId:
      row.account_id,
    provider:
      row.provider,
    providerPaymentReference:
      row.provider_payment_reference,
    checkoutReference:
      row.checkout_reference,
    amountMinor:
      row.amount_minor,
    currency:
      row.currency,
    status:
      row.status,
    createdAt:
      toIsoString(
        row.created_at,
      ),
    confirmedAt:
      nullableIsoString(
        row.confirmed_at,
      ),
    reversedAt:
      nullableIsoString(
        row.reversed_at,
      ),
  };
}

function mapEntitlement(
  row: EntitlementRow,
): HostedEntitlement {
  return {
    id: row.id,
    accountId:
      row.account_id,
    paymentId:
      row.payment_id,
    status:
      row.status,
    startsAt:
      toIsoString(
        row.starts_at,
      ),
    expiresAt:
      toIsoString(
        row.expires_at,
      ),
    totalRounds:
      row.total_rounds,
    completedRounds:
      row.completed_rounds,
    reservedRounds:
      row.reserved_rounds,
    dailyLimit:
      row.daily_limit,
    usageTimezone:
      row.usage_timezone,
    createdAt:
      toIsoString(
        row.created_at,
      ),
    updatedAt:
      toIsoString(
        row.updated_at,
      ),
  };
}

function mapDailyUsage(
  row: DailyUsageRow,
): HostedDailyUsage {
  return {
    id: row.id,
    entitlementId:
      row.entitlement_id,
    usageDate:
      toDateKey(
        row.usage_date,
      ),
    reservedRounds:
      row.reserved_rounds,
    completedRounds:
      row.completed_rounds,
    createdAt:
      toIsoString(
        row.created_at,
      ),
    updatedAt:
      toIsoString(
        row.updated_at,
      ),
  };
}

function mapRound(
  row: RoundRow,
): HostedRound {
  return {
    id: row.id,
    entitlementId:
      row.entitlement_id,
    idempotencyKey:
      row.idempotency_key,
    prompt:
      row.prompt,
    usageDate:
      toDateKey(
        row.usage_date,
      ),
    status:
      row.status,
    reservedAt:
      toIsoString(
        row.reserved_at,
      ),
    startedAt:
      nullableIsoString(
        row.started_at,
      ),
    completedAt:
      nullableIsoString(
        row.completed_at,
      ),
    releasedAt:
      nullableIsoString(
        row.released_at,
      ),
    failureCode:
      row.failure_code,
    createdAt:
      toIsoString(
        row.created_at,
      ),
    updatedAt:
      toIsoString(
        row.updated_at,
      ),
  };
}

function mapRoundAttempt(
  row: RoundAttemptRow,
): HostedRoundAttempt {
  return {
    id: row.id,
    roundId:
      row.round_id,
    entrantSlot:
      row.entrant_slot,
    attemptNumber:
      row.attempt_number,
    attemptKey:
      row.attempt_key,
    provider:
      row.provider,
    model:
      row.model,
    providerRequestId:
      row.provider_request_id,
    status:
      row.status,
    startedAt:
      nullableIsoString(
        row.started_at,
      ),
    completedAt:
      nullableIsoString(
        row.completed_at,
      ),
    latencyMs:
      row.latency_ms,
    inputTokens:
      row.input_tokens,
    outputTokens:
      row.output_tokens,
    responseText:
      row.response_text,
    errorCode:
      row.error_code,
    createdAt:
      toIsoString(
        row.created_at,
      ),
  };
}

function mapWebhookEvent(
  row: WebhookEventRow,
): HostedWebhookEvent {
  return {
    id: row.id,
    provider:
      row.provider,
    providerEventId:
      row.provider_event_id,
    paymentId:
      row.payment_id,
    receivedAt:
      toIsoString(
        row.received_at,
      ),
    processedAt:
      nullableIsoString(
        row.processed_at,
      ),
    status:
      row.status,
  };
}

export class NeonHostedRepository
  implements HostedWebhookRepository
{
  private readonly client:
    | Client
    | null;

  private readonly inTransaction:
    boolean;

  constructor(
    client: Client | null = null,
    inTransaction = false,
  ) {
    this.client = client;
    this.inTransaction =
      inTransaction;
  }

  private async withClient<T>(
    callback: (
      client: Client,
    ) => Promise<T>,
  ): Promise<T> {
    if (this.client) {
      return callback(
        this.client,
      );
    }

    const client =
      await createHostedDbClient();

    try {
      return await callback(
        client,
      );
    } finally {
      await client.end();
    }
  }

  private async query<
    Row extends SqlRow,
  >(
    statement: string,
    values: readonly unknown[] = [],
  ): Promise<Row[]> {
    return this.withClient(
      async (client) => {
        const result =
          await client.query<Row>(
            statement,
            [...values],
          );

        return result.rows;
      },
    );
  }

  private lockClause(
    options?: HostedRepositoryQueryOptions,
  ): string {
    if (
      !this.inTransaction ||
      !options?.forUpdate
    ) {
      return "";
    }

    return " FOR UPDATE";
  }

  async getAccountByAuthSubjectId(
    authSubjectId: string,
  ): Promise<HostedAccount | null> {
    const rows =
      await this.query<AccountRow>(
        `
          SELECT
            id,
            auth_subject_id,
            email,
            email_verified_at,
            age_confirmed_at,
            status,
            created_at,
            updated_at
          FROM hosted_accounts
          WHERE auth_subject_id = $1
          LIMIT 1
        `,
        [authSubjectId],
      );

    return rows[0]
      ? mapAccount(rows[0])
      : null;
  }

  async getAccountById(
    accountId: string,
  ): Promise<HostedAccount | null> {
    const rows =
      await this.query<AccountRow>(
        `
          SELECT
            id,
            auth_subject_id,
            email,
            email_verified_at,
            age_confirmed_at,
            status,
            created_at,
            updated_at
          FROM hosted_accounts
          WHERE id = $1
          LIMIT 1
        `,
        [accountId],
      );

    return rows[0]
      ? mapAccount(rows[0])
      : null;
  }

  async saveAccount(
    account: HostedAccount,
  ): Promise<HostedAccount> {
    const rows =
      await this.query<AccountRow>(
        `
          INSERT INTO hosted_accounts (
            id,
            auth_subject_id,
            email,
            email_verified_at,
            age_confirmed_at,
            status,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
          )
          ON CONFLICT (id)
          DO UPDATE SET
            auth_subject_id =
              EXCLUDED.auth_subject_id,
            email =
              EXCLUDED.email,
            email_verified_at =
              EXCLUDED.email_verified_at,
            age_confirmed_at =
              EXCLUDED.age_confirmed_at,
            status =
              EXCLUDED.status,
            updated_at =
              EXCLUDED.updated_at
          RETURNING
            id,
            auth_subject_id,
            email,
            email_verified_at,
            age_confirmed_at,
            status,
            created_at,
            updated_at
        `,
        [
          account.id,
          account.authSubjectId,
          account.email,
          account.emailVerifiedAt,
          account.ageConfirmedAt,
          account.status,
          account.createdAt,
          account.updatedAt,
        ],
      );

    return mapAccount(
      requireRow(
        rows,
        "account",
      ),
    );
  }

  async getActiveEntitlement(
    accountId: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedEntitlement | null> {
    const rows =
      await this.query<EntitlementRow>(
        `
          SELECT
            id,
            account_id,
            payment_id,
            status,
            starts_at,
            expires_at,
            total_rounds,
            completed_rounds,
            reserved_rounds,
            daily_limit,
            usage_timezone,
            created_at,
            updated_at
          FROM hosted_entitlements
          WHERE account_id = $1
            AND status = 'active'
          LIMIT 1
          ${this.lockClause(options)}
        `,
        [accountId],
      );

    return rows[0]
      ? mapEntitlement(rows[0])
      : null;
  }

  async getEntitlementById(
    entitlementId: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedEntitlement | null> {
    const rows =
      await this.query<EntitlementRow>(
        `
          SELECT
            id,
            account_id,
            payment_id,
            status,
            starts_at,
            expires_at,
            total_rounds,
            completed_rounds,
            reserved_rounds,
            daily_limit,
            usage_timezone,
            created_at,
            updated_at
          FROM hosted_entitlements
          WHERE id = $1
          LIMIT 1
          ${this.lockClause(options)}
        `,
        [entitlementId],
      );

    return rows[0]
      ? mapEntitlement(rows[0])
      : null;
  }

  async createEntitlement(
    entitlement: HostedEntitlement,
  ): Promise<HostedEntitlement> {
    const rows =
      await this.query<EntitlementRow>(
        `
          INSERT INTO hosted_entitlements (
            id,
            account_id,
            payment_id,
            status,
            starts_at,
            expires_at,
            total_rounds,
            completed_rounds,
            reserved_rounds,
            daily_limit,
            usage_timezone,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13
          )
          RETURNING
            id,
            account_id,
            payment_id,
            status,
            starts_at,
            expires_at,
            total_rounds,
            completed_rounds,
            reserved_rounds,
            daily_limit,
            usage_timezone,
            created_at,
            updated_at
        `,
        [
          entitlement.id,
          entitlement.accountId,
          entitlement.paymentId,
          entitlement.status,
          entitlement.startsAt,
          entitlement.expiresAt,
          entitlement.totalRounds,
          entitlement.completedRounds,
          entitlement.reservedRounds,
          entitlement.dailyLimit,
          entitlement.usageTimezone,
          entitlement.createdAt,
          entitlement.updatedAt,
        ],
      );

    return mapEntitlement(
      requireRow(
        rows,
        "entitlement",
      ),
    );
  }

  async updateEntitlement(
    entitlement: HostedEntitlement,
  ): Promise<HostedEntitlement> {
    const rows =
      await this.query<EntitlementRow>(
        `
          UPDATE hosted_entitlements
          SET
            account_id = $2,
            payment_id = $3,
            status = $4,
            starts_at = $5,
            expires_at = $6,
            total_rounds = $7,
            completed_rounds = $8,
            reserved_rounds = $9,
            daily_limit = $10,
            usage_timezone = $11,
            updated_at = $12
          WHERE id = $1
          RETURNING
            id,
            account_id,
            payment_id,
            status,
            starts_at,
            expires_at,
            total_rounds,
            completed_rounds,
            reserved_rounds,
            daily_limit,
            usage_timezone,
            created_at,
            updated_at
        `,
        [
          entitlement.id,
          entitlement.accountId,
          entitlement.paymentId,
          entitlement.status,
          entitlement.startsAt,
          entitlement.expiresAt,
          entitlement.totalRounds,
          entitlement.completedRounds,
          entitlement.reservedRounds,
          entitlement.dailyLimit,
          entitlement.usageTimezone,
          entitlement.updatedAt,
        ],
      );

    return mapEntitlement(
      requireRow(
        rows,
        "entitlement",
      ),
    );
  }

  async getDailyUsage(
    entitlementId: string,
    usageDate: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedDailyUsage | null> {
    const rows =
      await this.query<DailyUsageRow>(
        `
          SELECT
            id,
            entitlement_id,
            usage_date,
            reserved_rounds,
            completed_rounds,
            created_at,
            updated_at
          FROM hosted_daily_usage
          WHERE entitlement_id = $1
            AND usage_date = $2
          LIMIT 1
          ${this.lockClause(options)}
        `,
        [
          entitlementId,
          usageDate,
        ],
      );

    return rows[0]
      ? mapDailyUsage(rows[0])
      : null;
  }

  async createDailyUsage(
    usage: HostedDailyUsage,
  ): Promise<HostedDailyUsage> {
    const rows =
      await this.query<DailyUsageRow>(
        `
          INSERT INTO hosted_daily_usage (
            id,
            entitlement_id,
            usage_date,
            reserved_rounds,
            completed_rounds,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )
          ON CONFLICT (
            entitlement_id,
            usage_date
          )
          DO UPDATE SET
            updated_at =
              hosted_daily_usage.updated_at
          RETURNING
            id,
            entitlement_id,
            usage_date,
            reserved_rounds,
            completed_rounds,
            created_at,
            updated_at
        `,
        [
          usage.id,
          usage.entitlementId,
          usage.usageDate,
          usage.reservedRounds,
          usage.completedRounds,
          usage.createdAt,
          usage.updatedAt,
        ],
      );

    return mapDailyUsage(
      requireRow(
        rows,
        "daily usage",
      ),
    );
  }

  async updateDailyUsage(
    usage: HostedDailyUsage,
  ): Promise<HostedDailyUsage> {
    const rows =
      await this.query<DailyUsageRow>(
        `
          UPDATE hosted_daily_usage
          SET
            entitlement_id = $2,
            usage_date = $3,
            reserved_rounds = $4,
            completed_rounds = $5,
            updated_at = $6
          WHERE id = $1
          RETURNING
            id,
            entitlement_id,
            usage_date,
            reserved_rounds,
            completed_rounds,
            created_at,
            updated_at
        `,
        [
          usage.id,
          usage.entitlementId,
          usage.usageDate,
          usage.reservedRounds,
          usage.completedRounds,
          usage.createdAt,
          usage.updatedAt,
        ],
      );

    return mapDailyUsage(
      requireRow(
        rows,
        "daily usage",
      ),
    );
  }

  async getPaymentById(
    paymentId: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedPayment | null> {
    const rows =
      await this.query<PaymentRow>(
        `
          SELECT
            id,
            account_id,
            provider,
            provider_payment_reference,
            checkout_reference,
            amount_minor,
            currency,
            status,
            created_at,
            confirmed_at,
            reversed_at
          FROM hosted_payments
          WHERE id = $1
          LIMIT 1
          ${this.lockClause(options)}
        `,
        [paymentId],
      );

    return rows[0]
      ? mapPayment(rows[0])
      : null;
  }

  async getPaymentByProviderReference(
    provider: string,
    providerPaymentReference: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedPayment | null> {
    const rows =
      await this.query<PaymentRow>(
        `
          SELECT
            id,
            account_id,
            provider,
            provider_payment_reference,
            checkout_reference,
            amount_minor,
            currency,
            status,
            created_at,
            confirmed_at,
            reversed_at
          FROM hosted_payments
          WHERE provider = $1
            AND provider_payment_reference = $2
          LIMIT 1
          ${this.lockClause(options)}
        `,
        [
          provider,
          providerPaymentReference,
        ],
      );

    return rows[0]
      ? mapPayment(rows[0])
      : null;
  }

  async createPayment(
    payment: HostedPayment,
  ): Promise<HostedPayment> {
    const rows =
      await this.query<PaymentRow>(
        `
          INSERT INTO hosted_payments (
            id,
            account_id,
            provider,
            provider_payment_reference,
            checkout_reference,
            amount_minor,
            currency,
            status,
            created_at,
            confirmed_at,
            reversed_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11
          )
          RETURNING
            id,
            account_id,
            provider,
            provider_payment_reference,
            checkout_reference,
            amount_minor,
            currency,
            status,
            created_at,
            confirmed_at,
            reversed_at
        `,
        [
          payment.id,
          payment.accountId,
          payment.provider,
          payment.providerPaymentReference,
          payment.checkoutReference,
          payment.amountMinor,
          payment.currency,
          payment.status,
          payment.createdAt,
          payment.confirmedAt,
          payment.reversedAt,
        ],
      );

    return mapPayment(
      requireRow(
        rows,
        "payment",
      ),
    );
  }

  async updatePayment(
    payment: HostedPayment,
  ): Promise<HostedPayment> {
    const rows =
      await this.query<PaymentRow>(
        `
          UPDATE hosted_payments
          SET
            account_id = $2,
            provider = $3,
            provider_payment_reference = $4,
            checkout_reference = $5,
            amount_minor = $6,
            currency = $7,
            status = $8,
            confirmed_at = $9,
            reversed_at = $10
          WHERE id = $1
          RETURNING
            id,
            account_id,
            provider,
            provider_payment_reference,
            checkout_reference,
            amount_minor,
            currency,
            status,
            created_at,
            confirmed_at,
            reversed_at
        `,
        [
          payment.id,
          payment.accountId,
          payment.provider,
          payment.providerPaymentReference,
          payment.checkoutReference,
          payment.amountMinor,
          payment.currency,
          payment.status,
          payment.confirmedAt,
          payment.reversedAt,
        ],
      );

    return mapPayment(
      requireRow(
        rows,
        "payment",
      ),
    );
  }

  async getRoundById(
    roundId: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedRound | null> {
    const rows =
      await this.query<RoundRow>(
        `
          SELECT
            id,
            entitlement_id,
            idempotency_key,
            prompt,
            usage_date,
            status,
            reserved_at,
            started_at,
            completed_at,
            released_at,
            failure_code,
            created_at,
            updated_at
          FROM hosted_rounds
          WHERE id = $1
          LIMIT 1
          ${this.lockClause(options)}
        `,
        [roundId],
      );

    return rows[0]
      ? mapRound(rows[0])
      : null;
  }

  async getRoundByIdempotencyKey(
    entitlementId: string,
    idempotencyKey: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedRound | null> {
    const rows =
      await this.query<RoundRow>(
        `
          SELECT
            id,
            entitlement_id,
            idempotency_key,
            prompt,
            usage_date,
            status,
            reserved_at,
            started_at,
            completed_at,
            released_at,
            failure_code,
            created_at,
            updated_at
          FROM hosted_rounds
          WHERE entitlement_id = $1
            AND idempotency_key = $2
          LIMIT 1
          ${this.lockClause(options)}
        `,
        [
          entitlementId,
          idempotencyKey,
        ],
      );

    return rows[0]
      ? mapRound(rows[0])
      : null;
  }

  async createRound(
    round: HostedRound,
  ): Promise<HostedRound> {
    const rows =
      await this.query<RoundRow>(
        `
          INSERT INTO hosted_rounds (
            id,
            entitlement_id,
            idempotency_key,
            prompt,
            usage_date,
            status,
            reserved_at,
            started_at,
            completed_at,
            released_at,
            failure_code,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13
          )
          RETURNING
            id,
            entitlement_id,
            idempotency_key,
            prompt,
            usage_date,
            status,
            reserved_at,
            started_at,
            completed_at,
            released_at,
            failure_code,
            created_at,
            updated_at
        `,
        [
          round.id,
          round.entitlementId,
          round.idempotencyKey,
          round.prompt,
          round.usageDate,
          round.status,
          round.reservedAt,
          round.startedAt,
          round.completedAt,
          round.releasedAt,
          round.failureCode,
          round.createdAt,
          round.updatedAt,
        ],
      );

    return mapRound(
      requireRow(
        rows,
        "round",
      ),
    );
  }

  async updateRound(
    round: HostedRound,
  ): Promise<HostedRound> {
    const rows =
      await this.query<RoundRow>(
        `
          UPDATE hosted_rounds
          SET
            entitlement_id = $2,
            idempotency_key = $3,
            prompt = $4,
            usage_date = $5,
            status = $6,
            reserved_at = $7,
            started_at = $8,
            completed_at = $9,
            released_at = $10,
            failure_code = $11,
            updated_at = $12
          WHERE id = $1
          RETURNING
            id,
            entitlement_id,
            idempotency_key,
            prompt,
            usage_date,
            status,
            reserved_at,
            started_at,
            completed_at,
            released_at,
            failure_code,
            created_at,
            updated_at
        `,
        [
          round.id,
          round.entitlementId,
          round.idempotencyKey,
          round.prompt,
          round.usageDate,
          round.status,
          round.reservedAt,
          round.startedAt,
          round.completedAt,
          round.releasedAt,
          round.failureCode,
          round.updatedAt,
        ],
      );

    return mapRound(
      requireRow(
        rows,
        "round",
      ),
    );
  }

  async getRoundAttempts(
    roundId: string,
    options?: HostedRepositoryQueryOptions,
  ): Promise<HostedRoundAttempt[]> {
    const rows =
      await this.query<RoundAttemptRow>(
        `
          SELECT
            id,
            round_id,
            entrant_slot,
            attempt_number,
            attempt_key,
            provider,
            model,
            provider_request_id,
            status,
            started_at,
            completed_at,
            latency_ms,
            input_tokens,
            output_tokens,
            response_text,
            error_code,
            created_at
          FROM hosted_round_attempts
          WHERE round_id = $1
          ORDER BY
            entrant_slot ASC,
            attempt_number ASC
          ${this.lockClause(options)}
        `,
        [roundId],
      );

    return rows.map(
      mapRoundAttempt,
    );
  }

  async createRoundAttempt(
    attempt: HostedRoundAttempt,
  ): Promise<HostedRoundAttempt> {
    const rows =
      await this.query<RoundAttemptRow>(
        `
          INSERT INTO hosted_round_attempts (
            id,
            round_id,
            entrant_slot,
            attempt_number,
            attempt_key,
            provider,
            model,
            provider_request_id,
            status,
            started_at,
            completed_at,
            latency_ms,
            input_tokens,
            output_tokens,
            response_text,
            error_code,
            created_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            $17
          )
          RETURNING
            id,
            round_id,
            entrant_slot,
            attempt_number,
            attempt_key,
            provider,
            model,
            provider_request_id,
            status,
            started_at,
            completed_at,
            latency_ms,
            input_tokens,
            output_tokens,
            response_text,
            error_code,
            created_at
        `,
        [
          attempt.id,
          attempt.roundId,
          attempt.entrantSlot,
          attempt.attemptNumber,
          attempt.attemptKey,
          attempt.provider,
          attempt.model,
          attempt.providerRequestId,
          attempt.status,
          attempt.startedAt,
          attempt.completedAt,
          attempt.latencyMs,
          attempt.inputTokens,
          attempt.outputTokens,
          attempt.responseText,
          attempt.errorCode,
          attempt.createdAt,
        ],
      );

    return mapRoundAttempt(
      requireRow(
        rows,
        "round attempt",
      ),
    );
  }

  async updateRoundAttempt(
    attempt: HostedRoundAttempt,
  ): Promise<HostedRoundAttempt> {
    const rows =
      await this.query<RoundAttemptRow>(
        `
          UPDATE hosted_round_attempts
          SET
            round_id = $2,
            entrant_slot = $3,
            attempt_number = $4,
            attempt_key = $5,
            provider = $6,
            model = $7,
            provider_request_id = $8,
            status = $9,
            started_at = $10,
            completed_at = $11,
            latency_ms = $12,
            input_tokens = $13,
            output_tokens = $14,
            response_text = $15,
            error_code = $16
          WHERE id = $1
          RETURNING
            id,
            round_id,
            entrant_slot,
            attempt_number,
            attempt_key,
            provider,
            model,
            provider_request_id,
            status,
            started_at,
            completed_at,
            latency_ms,
            input_tokens,
            output_tokens,
            response_text,
            error_code,
            created_at
        `,
        [
          attempt.id,
          attempt.roundId,
          attempt.entrantSlot,
          attempt.attemptNumber,
          attempt.attemptKey,
          attempt.provider,
          attempt.model,
          attempt.providerRequestId,
          attempt.status,
          attempt.startedAt,
          attempt.completedAt,
          attempt.latencyMs,
          attempt.inputTokens,
          attempt.outputTokens,
          attempt.responseText,
          attempt.errorCode,
        ],
      );

    return mapRoundAttempt(
      requireRow(
        rows,
        "round attempt",
      ),
    );
  }

  async getWebhookEvent(
    provider: string,
    providerEventId: string,
  ): Promise<HostedWebhookEvent | null> {
    const rows =
      await this.query<WebhookEventRow>(
        `
          SELECT
            id,
            provider,
            provider_event_id,
            payment_id,
            received_at,
            processed_at,
            status
          FROM hosted_payment_webhook_events
          WHERE provider = $1
            AND provider_event_id = $2
          LIMIT 1
        `,
        [
          provider,
          providerEventId,
        ],
      );

    return rows[0]
      ? mapWebhookEvent(rows[0])
      : null;
  }

  async createWebhookEvent(
    event: HostedWebhookEvent,
  ): Promise<HostedWebhookEvent> {
    /*
     * Webhook event creation is also the acquisition point
     * for idempotent webhook processing.
     *
     * If this transaction creates the event, RETURNING gives
     * us the newly inserted row.
     *
     * If another transaction already created the same
     * provider/event pair, the unique constraint is handled
     * by ON CONFLICT DO NOTHING. The existing row is then
     * loaded. When this repository is operating inside an
     * active transaction, the fallback SELECT locks that row
     * before returning it.
     */
    const rows =
      await this.query<WebhookEventRow>(
        `
          INSERT INTO hosted_payment_webhook_events (
            id,
            provider,
            provider_event_id,
            payment_id,
            received_at,
            processed_at,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )
          ON CONFLICT (
            provider,
            provider_event_id
          )
          DO NOTHING
          RETURNING
            id,
            provider,
            provider_event_id,
            payment_id,
            received_at,
            processed_at,
            status
        `,
        [
          event.id,
          event.provider,
          event.providerEventId,
          event.paymentId,
          event.receivedAt,
          event.processedAt,
          event.status,
        ],
      );

    if (rows[0]) {
      return mapWebhookEvent(
        rows[0],
      );
    }

    const existingRows =
      await this.query<WebhookEventRow>(
        `
          SELECT
            id,
            provider,
            provider_event_id,
            payment_id,
            received_at,
            processed_at,
            status
          FROM hosted_payment_webhook_events
          WHERE provider = $1
            AND provider_event_id = $2
          LIMIT 1
          ${this.lockClause({
            forUpdate: true,
          })}
        `,
        [
          event.provider,
          event.providerEventId,
        ],
      );

    return mapWebhookEvent(
      requireRow(
        existingRows,
        "webhook event",
      ),
    );
  }

  async updateWebhookEvent(
    event: HostedWebhookEvent,
  ): Promise<HostedWebhookEvent> {
    const rows =
      await this.query<WebhookEventRow>(
        `
          UPDATE hosted_payment_webhook_events
          SET
            provider = $2,
            provider_event_id = $3,
            payment_id = $4,
            received_at = $5,
            processed_at = $6,
            status = $7
          WHERE id = $1
          RETURNING
            id,
            provider,
            provider_event_id,
            payment_id,
            received_at,
            processed_at,
            status
        `,
        [
          event.id,
          event.provider,
          event.providerEventId,
          event.paymentId,
          event.receivedAt,
          event.processedAt,
          event.status,
        ],
      );

    return mapWebhookEvent(
      requireRow(
        rows,
        "webhook event",
      ),
    );
  }

  async executeTransaction<T>(
    callback: (
      repository: HostedWebhookRepository,
    ) => Promise<T>,
  ): Promise<T> {
    if (this.inTransaction) {
      throw new Error(
        "Nested Hosted repository transactions are not supported.",
      );
    }

    return withHostedDbTransaction(
      async (client) => {
        const repository =
          new NeonHostedRepository(
            client,
            true,
          );

        return callback(
          repository,
        );
      },
    );
  }
}

export function createNeonHostedRepository():
  HostedWebhookRepository {
  return new NeonHostedRepository();
}