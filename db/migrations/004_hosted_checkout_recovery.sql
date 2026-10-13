
BEGIN;

ALTER TABLE hosted_payments
  ADD COLUMN IF NOT EXISTS checkout_url TEXT;

CREATE INDEX IF NOT EXISTS hosted_payments_pending_account_created_idx
  ON hosted_payments (
    account_id,
    created_at DESC
  )
  WHERE status = 'pending';

COMMIT;
