import {
  assertWalletLocatorTenant,
  parseAuthIdentity,
  parseAuditEvent,
  parseAuthorizationChallenge,
  parseMigrationBundle,
  parsePrincipal,
  parseSignerBinding,
  parseTenant,
  parseTransactionIntent,
  parseWallet,
  type AuthIdentity,
  type AuditEvent,
  type AuthorizationChallenge,
  type MigrationBundle,
  type Principal,
  type SignerBinding,
  type Tenant,
  type TransactionIntent,
  type Wallet,
} from '@ssw/platform-types';

export type StoreEntity =
  | Tenant
  | Principal
  | Wallet
  | SignerBinding
  | AuthIdentity
  | TransactionIntent
  | AuthorizationChallenge
  | MigrationBundle;
export type StoreEntityKind =
  | 'tenant'
  | 'principal'
  | 'wallet'
  | 'signer'
  | 'identity'
  | 'intent'
  | 'challenge'
  | 'migration';

export interface TenantContext {
  readonly tenantId: string;
}
export interface IdempotencyResult<T> {
  readonly value: T;
  readonly replayed: boolean;
}
export interface IdempotencyRecord {
  readonly tenantId: string;
  readonly key: string;
  readonly requestHash: string;
  readonly response: unknown;
}

export interface AuditInput {
  readonly eventId: string;
  readonly tenantId: string;
  readonly eventType: string;
  readonly actorKind: AuditEvent['actorKind'];
  readonly outcome: AuditEvent['outcome'];
  readonly resource: string;
  readonly createdAt: string;
  readonly metadata?: Readonly<
    Record<string, string | number | boolean | null>
  >;
}
export interface RedactedAuditEvent extends AuditEvent {
  readonly metadata?: Readonly<
    Record<string, string | number | boolean | null>
  >;
}
export interface AuditQuery {
  readonly after?: string;
  readonly limit?: number;
}

export class StoreError extends Error {
  constructor(
    readonly code:
      | 'TENANT_INVALID'
      | 'NOT_FOUND'
      | 'IDEMPOTENCY_CONFLICT'
      | 'TRANSACTION_REQUIRED'
      | 'STORAGE_FAILURE'
      | 'AUDIT_REDACTION_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'StoreError';
  }
}
export class AuditRedactionError extends StoreError {
  constructor(message: string) {
    super('AUDIT_REDACTION_FAILED', message);
    this.name = 'AuditRedactionError';
  }
}

const entityParsers: Record<StoreEntityKind, (value: unknown) => StoreEntity> =
  {
    tenant: parseTenant,
    principal: parsePrincipal,
    wallet: parseWallet,
    signer: parseSignerBinding,
    identity: parseAuthIdentity,
    intent: parseTransactionIntent,
    challenge: parseAuthorizationChallenge,
    migration: parseMigrationBundle,
  };
const keyPattern = /^[A-Za-z0-9._:-]{1,128}$/u;
const clone = <T>(value: T): T => structuredClone(value);
const validTenant = (tenantId: string): void => {
  if (typeof tenantId !== 'string' || !keyPattern.test(tenantId))
    throw new StoreError('TENANT_INVALID', 'tenant context is invalid');
};
const context = (ctx: TenantContext): string => {
  validTenant(ctx.tenantId);
  return ctx.tenantId;
};
const entityId = (kind: StoreEntityKind, value: StoreEntity): string => {
  if (kind === 'tenant') return (value as Tenant).tenantId;
  if (kind === 'principal') return (value as Principal).principalId;
  if (kind === 'wallet') return (value as Wallet).walletId;
  if (kind === 'signer') return (value as SignerBinding).signerId;
  if (kind === 'identity') return (value as AuthIdentity).identityId;
  if (kind === 'intent') return (value as TransactionIntent).intentId;
  if (kind === 'challenge')
    return (value as AuthorizationChallenge).challengeId;
  return (value as MigrationBundle).bundleId;
};
export interface StorePort {
  put<T extends StoreEntity>(
    ctx: TenantContext,
    kind: StoreEntityKind,
    value: T,
  ): Promise<T>;
  get<T extends StoreEntity>(
    ctx: TenantContext,
    kind: StoreEntityKind,
    id: string,
  ): Promise<T | undefined>;
  list<T extends StoreEntity>(
    ctx: TenantContext,
    kind: StoreEntityKind,
  ): Promise<readonly T[]>;
  runIdempotent<T>(
    ctx: TenantContext,
    key: string,
    requestHash: string,
    operation: () => Promise<T>,
  ): Promise<IdempotencyResult<T>>;
  appendAudit(
    ctx: TenantContext,
    event: AuditInput,
  ): Promise<RedactedAuditEvent>;
  listAudit(
    ctx: TenantContext,
    query?: AuditQuery,
  ): Promise<readonly RedactedAuditEvent[]>;
}

const scopedId = (
  tenantId: string,
  kind: StoreEntityKind,
  id: string,
): string => `${tenantId}\u0000${kind}\u0000${id}`;

export function redactAuditEvent(input: AuditInput): RedactedAuditEvent {
  const base = parseAuditEvent({
    schemaVersion: 1,
    eventId: input.eventId,
    tenantId: input.tenantId,
    eventType: input.eventType,
    actorKind: input.actorKind,
    outcome: input.outcome,
    resource: input.resource,
    createdAt: input.createdAt,
  });
  const forbidden =
    /(credential|verifiable|vc|otp|token|secret|password|recovery|private.?key|seed|mnemonic|email|social|subject|phone|bearer|authorization)/iu;
  const metadata =
    input.metadata === undefined
      ? undefined
      : Object.fromEntries(
          Object.entries(input.metadata).map(([key, value]) => {
            if (
              !/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/u.test(key) ||
              forbidden.test(key)
            )
              throw new AuditRedactionError(`forbidden audit field: ${key}`);
            if (typeof value === 'string') {
              if (
                value.length > 256 ||
                forbidden.test(value) ||
                /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u.test(value) ||
                /^eyJ[A-Za-z0-9_-]+\./u.test(value)
              )
                throw new AuditRedactionError(
                  `sensitive audit value rejected for ${key}`,
                );
            }
            if (
              value !== null &&
              typeof value !== 'string' &&
              typeof value !== 'number' &&
              typeof value !== 'boolean'
            )
              throw new AuditRedactionError(
                `non-scalar audit value rejected for ${key}`,
              );
            if (typeof value === 'number' && !Number.isSafeInteger(value))
              throw new AuditRedactionError(`unsafe audit number for ${key}`);
            return [key, value];
          }),
        );
  if (forbidden.test(base.resource) || forbidden.test(base.eventType))
    throw new AuditRedactionError(
      'sensitive audit resource or event type rejected',
    );
  return clone({ ...base, ...(metadata === undefined ? {} : { metadata }) });
}

export class InMemoryPlatformStore implements StorePort {
  private readonly records = new Map<string, StoreEntity>();
  private readonly idempotency = new Map<
    string,
    { requestHash: string; result: Promise<unknown> }
  >();
  private readonly audits = new Map<string, RedactedAuditEvent[]>();

  async put<T extends StoreEntity>(
    ctx: TenantContext,
    kind: StoreEntityKind,
    value: T,
  ): Promise<T> {
    const tenantId = context(ctx);
    const parsed = entityParsers[kind](clone(value)) as T;
    if (kind === 'tenant' && (parsed as Tenant).tenantId !== tenantId)
      throw new StoreError(
        'TENANT_INVALID',
        'tenant record does not match context',
      );
    if (kind === 'principal' && (parsed as Principal).tenantId !== tenantId)
      throw new StoreError(
        'TENANT_INVALID',
        'principal does not match context',
      );
    if (kind === 'wallet' && (parsed as Wallet).tenantId !== tenantId)
      throw new StoreError('TENANT_INVALID', 'wallet does not match context');
    if (kind !== 'tenant' && kind !== 'principal' && kind !== 'wallet') {
      const locator = (
        parsed as
          | SignerBinding
          | TransactionIntent
          | AuthorizationChallenge
          | MigrationBundle
      ).walletLocator;
      await assertWalletLocatorTenant({ locator, tenantId });
    }
    const id = entityId(kind, parsed);
    if (!keyPattern.test(id))
      throw new StoreError('TENANT_INVALID', 'record identifier is invalid');
    this.records.set(scopedId(tenantId, kind, id), clone(parsed));
    return clone(parsed);
  }
  async get<T extends StoreEntity>(
    ctx: TenantContext,
    kind: StoreEntityKind,
    id: string,
  ): Promise<T | undefined> {
    const tenantId = context(ctx);
    if (!keyPattern.test(id))
      throw new StoreError('TENANT_INVALID', 'record identifier is invalid');
    const value = this.records.get(scopedId(tenantId, kind, id));
    return value === undefined ? undefined : clone(value as T);
  }
  async list<T extends StoreEntity>(
    ctx: TenantContext,
    kind: StoreEntityKind,
  ): Promise<readonly T[]> {
    const tenantId = context(ctx);
    const prefix = `${tenantId}\u0000${kind}\u0000`;
    return [...this.records.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => clone(value as T));
  }
  async runIdempotent<T>(
    ctx: TenantContext,
    key: string,
    requestHash: string,
    operation: () => Promise<T>,
  ): Promise<IdempotencyResult<T>> {
    const tenantId = context(ctx);
    if (!keyPattern.test(key) || !keyPattern.test(requestHash))
      throw new StoreError('TENANT_INVALID', 'idempotency key/hash is invalid');
    const mapKey = scopedId(tenantId, 'intent', key);
    const existing = this.idempotency.get(mapKey);
    if (existing) {
      if (existing.requestHash !== requestHash)
        throw new StoreError(
          'IDEMPOTENCY_CONFLICT',
          'idempotency key was used with another request',
        );
      return { value: clone((await existing.result) as T), replayed: true };
    }
    const result = operation();
    this.idempotency.set(mapKey, { requestHash, result });
    try {
      return { value: clone(await result), replayed: false };
    } catch (error) {
      this.idempotency.delete(mapKey);
      throw error;
    }
  }
  async appendAudit(
    ctx: TenantContext,
    event: AuditInput,
  ): Promise<RedactedAuditEvent> {
    const tenantId = context(ctx);
    if (event.tenantId !== tenantId)
      throw new StoreError('TENANT_INVALID', 'audit tenant mismatch');
    const redacted = redactAuditEvent(event);
    const entries = this.audits.get(tenantId) ?? [];
    if (entries.some((entry) => entry.eventId === redacted.eventId))
      throw new StoreError('STORAGE_FAILURE', 'audit event already exists');
    entries.push(clone(redacted));
    this.audits.set(tenantId, entries);
    return clone(redacted);
  }
  async listAudit(
    ctx: TenantContext,
    query: AuditQuery = {},
  ): Promise<readonly RedactedAuditEvent[]> {
    const tenantId = context(ctx);
    const limit = query.limit ?? 100;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
      throw new StoreError('TENANT_INVALID', 'audit limit is invalid');
    const entries = this.audits.get(tenantId) ?? [];
    return clone(
      entries
        .filter(
          (entry) => query.after === undefined || entry.createdAt > query.after,
        )
        .slice(0, limit),
    );
  }
}

export interface SqlResult<T = Record<string, unknown>> {
  readonly rows: readonly T[];
  readonly rowCount?: number;
}
export interface SqlExecutor {
  query<T = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<SqlResult<T>>;
}
export interface SqlTransaction extends SqlExecutor {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export class PostgresPlatformStore implements StorePort {
  constructor(
    private readonly db: SqlExecutor,
    private readonly transaction?: SqlTransaction,
  ) {}
  private async queryEntity<T extends StoreEntity>(
    ctx: TenantContext,
    kind: StoreEntityKind,
    id: string,
    values?: unknown[],
  ): Promise<T | undefined> {
    const tenantId = context(ctx);
    if (!keyPattern.test(id))
      throw new StoreError('TENANT_INVALID', 'record identifier is invalid');
    const result = await this.db.query<{ payload: unknown }>(
      'SELECT payload FROM platform_records WHERE tenant_id = $1 AND entity_kind = $2 AND entity_id = $3',
      [tenantId, kind, id, ...(values ?? [])],
    );
    return result.rows[0] === undefined
      ? undefined
      : clone(entityParsers[kind](result.rows[0].payload) as T);
  }
  async put<T extends StoreEntity>(
    ctx: TenantContext,
    kind: StoreEntityKind,
    value: T,
  ): Promise<T> {
    const tenantId = context(ctx);
    const parsed = entityParsers[kind](clone(value)) as T;
    if (
      (kind === 'tenant' && (parsed as Tenant).tenantId !== tenantId) ||
      (kind === 'principal' && (parsed as Principal).tenantId !== tenantId) ||
      (kind === 'wallet' && (parsed as Wallet).tenantId !== tenantId)
    )
      throw new StoreError('TENANT_INVALID', 'record does not match context');
    if (kind !== 'tenant' && kind !== 'principal' && kind !== 'wallet') {
      await assertWalletLocatorTenant({
        locator: (
          parsed as
            | SignerBinding
            | TransactionIntent
            | AuthorizationChallenge
            | MigrationBundle
        ).walletLocator,
        tenantId,
      });
    }
    const id = entityId(kind, parsed);
    await this.db.query(
      'INSERT INTO platform_records (tenant_id, entity_kind, entity_id, payload) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (tenant_id,entity_kind,entity_id) DO UPDATE SET payload=EXCLUDED.payload',
      [tenantId, kind, id, JSON.stringify(parsed)],
    );
    return clone(parsed);
  }
  async get<T extends StoreEntity>(
    ctx: TenantContext,
    kind: StoreEntityKind,
    id: string,
  ): Promise<T | undefined> {
    return this.queryEntity<T>(ctx, kind, id);
  }
  async list<T extends StoreEntity>(
    ctx: TenantContext,
    kind: StoreEntityKind,
  ): Promise<readonly T[]> {
    const tenantId = context(ctx);
    const result = await this.db.query<{ payload: unknown }>(
      'SELECT payload FROM platform_records WHERE tenant_id = $1 AND entity_kind = $2 ORDER BY entity_id',
      [tenantId, kind],
    );
    return result.rows.map((row) =>
      clone(entityParsers[kind](row.payload) as T),
    );
  }
  async runIdempotent<T>(
    ctx: TenantContext,
    key: string,
    requestHash: string,
    operation: () => Promise<T>,
  ): Promise<IdempotencyResult<T>> {
    const tenantId = context(ctx);
    if (!this.transaction)
      throw new StoreError(
        'TRANSACTION_REQUIRED',
        'PostgreSQL idempotency requires a transaction-capable executor',
      );
    if (!keyPattern.test(key) || !keyPattern.test(requestHash))
      throw new StoreError('TENANT_INVALID', 'idempotency key/hash is invalid');
    await this.transaction.begin();
    try {
      // Serialize the check/execute/record sequence for the tenant/key. The
      // advisory lock closes the race where two transactions observe no row
      // before either inserts the unique idempotency record.
      await this.transaction.query(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        [`ssw:idempotency:${tenantId}:${key}`],
      );
      const current = await this.transaction.query<{
        request_hash: string;
        response: T | null;
      }>(
        'SELECT request_hash, response FROM idempotency_records WHERE tenant_id=$1 AND idempotency_key=$2 FOR UPDATE',
        [tenantId, key],
      );
      if (current.rows[0]) {
        if (current.rows[0].request_hash !== requestHash)
          throw new StoreError(
            'IDEMPOTENCY_CONFLICT',
            'idempotency key was used with another request',
          );
        await this.transaction.commit();
        return { value: clone(current.rows[0].response as T), replayed: true };
      }
      const value = await operation();
      await this.transaction.query(
        'INSERT INTO idempotency_records (tenant_id,idempotency_key,request_hash,response) VALUES ($1,$2,$3,$4::jsonb)',
        [tenantId, key, requestHash, JSON.stringify(value)],
      );
      await this.transaction.commit();
      return { value: clone(value), replayed: false };
    } catch (error) {
      await this.transaction.rollback();
      throw error;
    }
  }
  async appendAudit(
    ctx: TenantContext,
    event: AuditInput,
  ): Promise<RedactedAuditEvent> {
    const tenantId = context(ctx);
    if (event.tenantId !== tenantId)
      throw new StoreError('TENANT_INVALID', 'audit tenant mismatch');
    const redacted = redactAuditEvent(event);
    await this.db.query(
      'INSERT INTO audit_events (tenant_id,event_id,payload) VALUES ($1,$2,$3::jsonb)',
      [tenantId, redacted.eventId, JSON.stringify(redacted)],
    );
    return clone(redacted);
  }
  async listAudit(
    ctx: TenantContext,
    query: AuditQuery = {},
  ): Promise<readonly RedactedAuditEvent[]> {
    const tenantId = context(ctx);
    const limit = query.limit ?? 100;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
      throw new StoreError('TENANT_INVALID', 'audit limit is invalid');
    const result = await this.db.query<{ payload: unknown }>(
      "SELECT payload FROM audit_events WHERE tenant_id=$1 AND ($2::text IS NULL OR (payload->>'createdAt') > $2) ORDER BY payload->>'createdAt' LIMIT $3",
      [tenantId, query.after ?? null, limit],
    );
    return result.rows.map((row) =>
      clone(redactAuditEvent(row.payload as AuditInput)),
    );
  }
}

export const MIGRATIONS = [
  {
    version: 1,
    up: `CREATE TABLE IF NOT EXISTS platform_records (tenant_id text NOT NULL, entity_kind text NOT NULL, entity_id text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tenant_id, entity_kind, entity_id));\nCREATE TABLE IF NOT EXISTS idempotency_records (tenant_id text NOT NULL, idempotency_key text NOT NULL, request_hash text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tenant_id, idempotency_key));\nCREATE TABLE IF NOT EXISTS audit_events (tenant_id text NOT NULL, event_id text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tenant_id, event_id));`,
    down: `DROP TABLE IF EXISTS audit_events;\nDROP TABLE IF EXISTS idempotency_records;\nDROP TABLE IF EXISTS platform_records;`,
  },
] as const;

export async function migrate(db: SqlExecutor): Promise<void> {
  for (const migration of MIGRATIONS) {
    await db.query('BEGIN');
    try {
      await db.query(migration.up);
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }
}
export async function rollbackLatest(db: SqlExecutor): Promise<void> {
  const migration = MIGRATIONS[MIGRATIONS.length - 1];
  await db.query('BEGIN');
  try {
    await db.query(migration.down);
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
