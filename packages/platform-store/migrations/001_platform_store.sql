BEGIN;
CREATE TABLE IF NOT EXISTS platform_records (tenant_id text NOT NULL, entity_kind text NOT NULL, entity_id text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tenant_id, entity_kind, entity_id));
CREATE TABLE IF NOT EXISTS idempotency_records (tenant_id text NOT NULL, idempotency_key text NOT NULL, request_hash text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tenant_id, idempotency_key));
CREATE TABLE IF NOT EXISTS audit_events (tenant_id text NOT NULL, event_id text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tenant_id, event_id));
COMMIT;
