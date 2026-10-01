BEGIN;

ALTER TABLE hosted_payments
  ADD COLUMN IF NOT EXISTS provider_transaction_reference TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS hosted_payments_provider_transaction_reference_unique
  ON hosted_payments(
    provider,
    provider_transaction_reference
  )
  WHERE provider_transaction_reference IS NOT NULL;

COMMIT;