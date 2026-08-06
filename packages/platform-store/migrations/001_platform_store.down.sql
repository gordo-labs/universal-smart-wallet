BEGIN;
DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS idempotency_records;
DROP TABLE IF EXISTS platform_records;
COMMIT;
