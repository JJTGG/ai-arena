BEGIN;

ALTER TABLE hosted_payments
  ADD CONSTRAINT hosted_payments_account_id_id_unique
  UNIQUE (
    account_id,
    id
  );

ALTER TABLE hosted_entitlements
  ADD CONSTRAINT hosted_entitlements_payment_account_fk
  FOREIGN KEY (
    account_id,
    payment_id
  )
  REFERENCES hosted_payments (
    account_id,
    id
  )
  ON DELETE RESTRICT;

COMMIT;