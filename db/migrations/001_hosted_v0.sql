BEGIN;

CREATE TABLE IF NOT EXISTS hosted_accounts (
  id TEXT PRIMARY KEY,
  auth_subject_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  age_confirmed_at TIMESTAMPTZ,
  status TEXT NOT NULL
    CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS hosted_payments (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL
    REFERENCES hosted_accounts(id)
    ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  provider_payment_reference TEXT NOT NULL,
  checkout_reference TEXT,
  amount_minor INTEGER NOT NULL
    CHECK (amount_minor > 0),
  currency TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (
      status IN (
        'pending',
        'confirmed',
        'failed',
        'expired',
        'reversed'
      )
    ),
  created_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  CONSTRAINT hosted_payments_provider_reference_unique
    UNIQUE (
      provider,
      provider_payment_reference
    )
);

CREATE INDEX IF NOT EXISTS hosted_payments_account_idx
  ON hosted_payments(account_id);

CREATE TABLE IF NOT EXISTS hosted_entitlements (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL
    REFERENCES hosted_accounts(id)
    ON DELETE RESTRICT,
  payment_id TEXT NOT NULL UNIQUE
    REFERENCES hosted_payments(id)
    ON DELETE RESTRICT,
  status TEXT NOT NULL
    CHECK (
      status IN (
        'active',
        'expired',
        'suspended',
        'cancelled'
      )
    ),
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  total_rounds INTEGER NOT NULL
    CHECK (total_rounds > 0),
  completed_rounds INTEGER NOT NULL DEFAULT 0
    CHECK (completed_rounds >= 0),
  reserved_rounds INTEGER NOT NULL DEFAULT 0
    CHECK (reserved_rounds >= 0),
  daily_limit INTEGER NOT NULL
    CHECK (daily_limit > 0),
  usage_timezone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT hosted_entitlements_dates_valid
    CHECK (expires_at > starts_at),
  CONSTRAINT hosted_entitlements_counter_valid
    CHECK (
      completed_rounds + reserved_rounds
      <= total_rounds
    )
);

CREATE INDEX IF NOT EXISTS hosted_entitlements_account_idx
  ON hosted_entitlements(account_id);

CREATE UNIQUE INDEX IF NOT EXISTS hosted_entitlements_one_active_per_account_idx
  ON hosted_entitlements(account_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS hosted_daily_usage (
  id TEXT PRIMARY KEY,
  entitlement_id TEXT NOT NULL
    REFERENCES hosted_entitlements(id)
    ON DELETE RESTRICT,
  usage_date DATE NOT NULL,
  reserved_rounds INTEGER NOT NULL DEFAULT 0
    CHECK (reserved_rounds >= 0),
  completed_rounds INTEGER NOT NULL DEFAULT 0
    CHECK (completed_rounds >= 0),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT hosted_daily_usage_unique
    UNIQUE (
      entitlement_id,
      usage_date
    ),
  CONSTRAINT hosted_daily_usage_counter_valid
    CHECK (
      completed_rounds + reserved_rounds
      <= 2
    )
);

CREATE INDEX IF NOT EXISTS hosted_daily_usage_entitlement_idx
  ON hosted_daily_usage(entitlement_id);

CREATE TABLE IF NOT EXISTS hosted_rounds (
  id TEXT PRIMARY KEY,
  entitlement_id TEXT NOT NULL
    REFERENCES hosted_entitlements(id)
    ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  prompt TEXT NOT NULL
    CHECK (length(trim(prompt)) > 0),
  usage_date DATE NOT NULL,
  status TEXT NOT NULL
    CHECK (
      status IN (
        'reserved',
        'running',
        'completed',
        'retryable',
        'failed',
        'released'
      )
    ),
  reserved_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  failure_code TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT hosted_rounds_idempotency_unique
    UNIQUE (
      entitlement_id,
      idempotency_key
    )
);

CREATE INDEX IF NOT EXISTS hosted_rounds_entitlement_idx
  ON hosted_rounds(entitlement_id);

CREATE INDEX IF NOT EXISTS hosted_rounds_status_idx
  ON hosted_rounds(status);

CREATE TABLE IF NOT EXISTS hosted_round_attempts (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL
    REFERENCES hosted_rounds(id)
    ON DELETE RESTRICT,
  entrant_slot SMALLINT NOT NULL
    CHECK (entrant_slot IN (1, 2)),
  attempt_number INTEGER NOT NULL
    CHECK (attempt_number >= 1),
  attempt_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL
    CHECK (provider IN ('gemini', 'groq')),
  model TEXT NOT NULL,
  provider_request_id TEXT,
  status TEXT NOT NULL
    CHECK (
      status IN (
        'pending',
        'running',
        'completed',
        'retryable',
        'failed'
      )
    ),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  latency_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  response_text TEXT,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT hosted_round_attempt_identity_unique
    UNIQUE (
      round_id,
      entrant_slot,
      attempt_number
    )
);

CREATE INDEX IF NOT EXISTS hosted_round_attempts_round_idx
  ON hosted_round_attempts(round_id);

CREATE INDEX IF NOT EXISTS hosted_round_attempts_status_idx
  ON hosted_round_attempts(status);

CREATE TABLE IF NOT EXISTS hosted_payment_webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  payment_id TEXT
    REFERENCES hosted_payments(id)
    ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL
    CHECK (
      status IN (
        'received',
        'processed',
        'failed'
      )
    ),
  CONSTRAINT hosted_payment_webhook_provider_event_unique
    UNIQUE (
      provider,
      provider_event_id
    )
);

CREATE INDEX IF NOT EXISTS hosted_payment_webhook_payment_idx
  ON hosted_payment_webhook_events(payment_id);

CREATE INDEX IF NOT EXISTS hosted_payment_webhook_status_idx
  ON hosted_payment_webhook_events(status);

COMMIT;