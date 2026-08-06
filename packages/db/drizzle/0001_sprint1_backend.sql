CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS piece_count integer;

CREATE OR REPLACE FUNCTION reject_credit_txn_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'credit_txns is append-only';
END;
$$;

DROP TRIGGER IF EXISTS credit_txns_append_only ON credit_txns;
CREATE TRIGGER credit_txns_append_only
BEFORE UPDATE OR DELETE ON credit_txns
FOR EACH ROW
EXECUTE FUNCTION reject_credit_txn_mutation();
