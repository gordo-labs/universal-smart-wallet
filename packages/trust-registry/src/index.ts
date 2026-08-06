/**
 * Signed, off-chain trust and status registry domain.
 *
 * Cryptography and transport deliberately remain behind narrow ports. This
 * package validates, scopes and caches signed policy snapshots; it does not
 * implement a signature algorithm or depend on a hosted registry.
 */

export const REGISTRY_SNAPSHOT_VERSION = 1 as const;

export type RegistryDecisionKind = 'verified' | 'rejected' | 'indeterminate';

export type RegistryDecisionCode =
  | 'TRUST_VERIFIED'
  | 'STATUS_VALID'
  | 'CREDENTIAL_VERIFIED'
  | 'SNAPSHOT_FRESH'
  | 'ISSUER_UNKNOWN'
  | 'SCHEMA_UNKNOWN'
  | 'KEY_UNKNOWN'
  | 'STATUS_UNKNOWN'
  | 'ISSUER_SUSPENDED'
  | 'ISSUER_REVOKED'
  | 'SCHEMA_SUSPENDED'
  | 'SCHEMA_REVOKED'
  | 'KEY_REVOKED'
  | 'KEY_NOT_AUTHORIZED_AT_ISSUANCE'
  | 'CREDENTIAL_SUSPENDED'
  | 'CREDENTIAL_REVOKED'
  | 'SNAPSHOT_MISSING'
  | 'SNAPSHOT_STALE'
  | 'SNAPSHOT_INVALID'
  | 'REGISTRY_UNAVAILABLE';

export interface RegistryDecision {
  readonly decision: RegistryDecisionKind;
  readonly code: RegistryDecisionCode;
  /** Safe audit metadata only. Never includes credential or holder data. */
  readonly snapshotId?: string;
  readonly snapshotExpiresAt?: number;
}

export interface RegistryScope {
  readonly tenantId: string;
  readonly jurisdiction: string;
}

export type AuthorizationStatus = 'active' | 'suspended' | 'revoked';
export type KeyAuthorizationStatus = 'active' | 'retired' | 'revoked';
export type CredentialStatus = 'valid' | 'suspended' | 'revoked';

export interface SchemaAuthorization {
  readonly schemaId: string;
  readonly status: AuthorizationStatus;
}

export interface IssuerKeyAuthorization {
  readonly keyId: string;
  readonly status: KeyAuthorizationStatus;
  readonly authorizedFrom: number;
  /** Exclusive upper bound. Required for retired keys. */
  readonly authorizedUntil?: number;
}

export interface IssuerAuthorization {
  readonly issuerId: string;
  readonly status: AuthorizationStatus;
  readonly schemas: readonly SchemaAuthorization[];
  readonly keys: readonly IssuerKeyAuthorization[];
  /** Policy labels only; never inferred legal accreditation. */
  readonly trustMarks: readonly string[];
}

export interface KeyRotationRecord {
  readonly issuerId: string;
  readonly previousKeyId: string;
  readonly newKeyId: string;
  readonly rotatedAt: number;
}

export interface CredentialStatusEntry {
  readonly issuerId: string;
  /** Opaque list entry or status identifier; never a holder identifier. */
  readonly statusId: string;
  readonly status: CredentialStatus;
  readonly updatedAt: number;
}

export interface UnsignedRegistrySnapshot extends RegistryScope {
  readonly schemaVersion: 1;
  readonly snapshotId: string;
  /** Monotonic within a tenant/jurisdiction scope. */
  readonly sequence: number;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly signingKeyId: string;
  readonly issuers: readonly IssuerAuthorization[];
  /** Append-only rotation evidence retained alongside current authorization. */
  readonly rotations: readonly KeyRotationRecord[];
  readonly statuses: readonly CredentialStatusEntry[];
}

export interface SignedRegistrySnapshot extends UnsignedRegistrySnapshot {
  /** Detached signature encoded by the configured signer adapter. */
  readonly signature: string;
}

export interface SnapshotSignRequest {
  readonly scope: RegistryScope;
  readonly keyId: string;
  readonly payload: string;
}

export interface SnapshotVerifyRequest extends SnapshotSignRequest {
  readonly signature: string;
}

export interface SnapshotSignerPort {
  sign(request: SnapshotSignRequest): Promise<string>;
}

export interface SnapshotVerifierPort {
  /** Also enforces that keyId is pinned for request.scope. */
  verify(request: SnapshotVerifyRequest): Promise<boolean>;
}

export interface SignedSnapshotSourcePort {
  load(scope: RegistryScope): Promise<unknown>;
}

export interface TrustEvaluationRequest extends RegistryScope {
  readonly issuerId: string;
  readonly schemaId: string;
  readonly keyId: string;
  /** Credential issuance time used to evaluate historical key authorization. */
  readonly issuedAt: number;
  readonly now?: number;
}

export interface StatusEvaluationRequest extends RegistryScope {
  readonly issuerId: string;
  readonly statusId: string;
  readonly now?: number;
}

export interface CredentialEvaluationRequest extends TrustEvaluationRequest {
  readonly statusId: string;
}

export interface TrustRegistryPort {
  evaluateTrust(request: TrustEvaluationRequest): Promise<RegistryDecision>;
}

export interface StatusPort {
  evaluateStatus(request: StatusEvaluationRequest): Promise<RegistryDecision>;
}

export interface CredentialRegistryPort extends TrustRegistryPort, StatusPort {
  evaluateCredential(
    request: CredentialEvaluationRequest,
  ): Promise<RegistryDecision>;
}

export class RegistrySnapshotError extends Error {
  constructor(
    readonly code:
      | 'SNAPSHOT_INVALID'
      | 'SNAPSHOT_UNSIGNED'
      | 'SNAPSHOT_SIGNATURE_INVALID'
      | 'SNAPSHOT_SCOPE_MISMATCH'
      | 'SNAPSHOT_STALE'
      | 'SNAPSHOT_ROLLBACK',
    message: string,
  ) {
    super(message);
    this.name = 'RegistrySnapshotError';
  }
}

const scopePattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const controlCharacters = /[\u0000-\u001f\u007f]/u;

const fail = (message: string): never => {
  throw new RegistrySnapshotError('SNAPSHOT_INVALID', message);
};

const object = (value: unknown, name: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return fail(`${name} must be an object`);
  return value as Record<string, unknown>;
};

const exactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): void => {
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !Object.hasOwn(value, key)) ||
    Object.keys(value).some((key) => !allowed.has(key))
  )
    fail('snapshot has missing or unknown fields');
};

const safeString = (value: unknown, name: string, max = 512): string => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > max ||
    controlCharacters.test(value)
  )
    return fail(`${name} is invalid`);
  return value;
};

const scopeString = (value: unknown, name: string): string => {
  const parsed = safeString(value, name, 128);
  if (!scopePattern.test(parsed)) return fail(`${name} is invalid`);
  return parsed;
};

const integer = (value: unknown, name: string, minimum = 0): number => {
  if (!Number.isSafeInteger(value) || (value as number) < minimum)
    return fail(`${name} is invalid`);
  return value as number;
};

const values = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  name: string,
): T => {
  if (typeof value !== 'string' || !allowed.includes(value as T))
    return fail(`${name} is invalid`);
  return value as T;
};

const list = (
  value: unknown,
  name: string,
  max = 10_000,
): readonly unknown[] => {
  if (!Array.isArray(value) || value.length > max)
    return fail(`${name} is invalid`);
  return value;
};

const unique = (items: readonly string[], name: string): void => {
  if (new Set(items).size !== items.length) fail(`${name} contains duplicates`);
};

const parseSchema = (value: unknown): SchemaAuthorization => {
  const input = object(value, 'schema authorization');
  exactKeys(input, ['schemaId', 'status']);
  return {
    schemaId: safeString(input.schemaId, 'schemaId'),
    status: values(
      input.status,
      ['active', 'suspended', 'revoked'],
      'schema status',
    ),
  };
};

const parseKey = (value: unknown): IssuerKeyAuthorization => {
  const input = object(value, 'key authorization');
  exactKeys(input, ['keyId', 'status', 'authorizedFrom'], ['authorizedUntil']);
  const status = values(
    input.status,
    ['active', 'retired', 'revoked'],
    'key status',
  );
  const authorizedFrom = integer(input.authorizedFrom, 'authorizedFrom');
  const authorizedUntil =
    input.authorizedUntil === undefined
      ? undefined
      : integer(input.authorizedUntil, 'authorizedUntil');
  if (authorizedUntil !== undefined && authorizedUntil <= authorizedFrom)
    fail('key authorization interval is invalid');
  if (status === 'retired' && authorizedUntil === undefined)
    fail('retired key requires authorizedUntil');
  return {
    keyId: safeString(input.keyId, 'keyId'),
    status,
    authorizedFrom,
    ...(authorizedUntil === undefined ? {} : { authorizedUntil }),
  };
};

const parseIssuer = (value: unknown): IssuerAuthorization => {
  const input = object(value, 'issuer authorization');
  exactKeys(input, ['issuerId', 'status', 'schemas', 'keys', 'trustMarks']);
  const schemas = list(input.schemas, 'schemas').map(parseSchema);
  const keys = list(input.keys, 'keys').map(parseKey);
  const trustMarks = list(input.trustMarks, 'trustMarks', 128).map((entry) =>
    safeString(entry, 'trustMark', 128),
  );
  unique(
    schemas.map((entry) => entry.schemaId),
    'schemas',
  );
  unique(
    keys.map((entry) => entry.keyId),
    'keys',
  );
  unique(trustMarks, 'trustMarks');
  return {
    issuerId: safeString(input.issuerId, 'issuerId'),
    status: values(
      input.status,
      ['active', 'suspended', 'revoked'],
      'issuer status',
    ),
    schemas,
    keys,
    trustMarks,
  };
};

const parseRotation = (value: unknown): KeyRotationRecord => {
  const input = object(value, 'rotation');
  exactKeys(input, ['issuerId', 'previousKeyId', 'newKeyId', 'rotatedAt']);
  const previousKeyId = safeString(input.previousKeyId, 'previousKeyId');
  const newKeyId = safeString(input.newKeyId, 'newKeyId');
  if (previousKeyId === newKeyId) fail('rotation must change key');
  return {
    issuerId: safeString(input.issuerId, 'rotation issuerId'),
    previousKeyId,
    newKeyId,
    rotatedAt: integer(input.rotatedAt, 'rotatedAt'),
  };
};

const parseStatus = (value: unknown): CredentialStatusEntry => {
  const input = object(value, 'credential status');
  exactKeys(input, ['issuerId', 'statusId', 'status', 'updatedAt']);
  return {
    issuerId: safeString(input.issuerId, 'status issuerId'),
    statusId: scopeString(input.statusId, 'statusId'),
    status: values(
      input.status,
      ['valid', 'suspended', 'revoked'],
      'credential status',
    ),
    updatedAt: integer(input.updatedAt, 'status updatedAt'),
  };
};

const validateRelations = (snapshot: UnsignedRegistrySnapshot): void => {
  const issuers = new Map(
    snapshot.issuers.map((issuer) => [issuer.issuerId, issuer]),
  );
  for (const rotation of snapshot.rotations) {
    const issuer = issuers.get(rotation.issuerId);
    if (!issuer)
      throw new RegistrySnapshotError(
        'SNAPSHOT_INVALID',
        'rotation references unknown issuer',
      );
    const previous = issuer.keys.find(
      (key) => key.keyId === rotation.previousKeyId,
    );
    const next = issuer.keys.find((key) => key.keyId === rotation.newKeyId);
    if (!previous || !next)
      throw new RegistrySnapshotError(
        'SNAPSHOT_INVALID',
        'rotation references unknown key',
      );
    if (
      previous.status !== 'retired' ||
      previous.authorizedUntil !== rotation.rotatedAt ||
      next.authorizedFrom !== rotation.rotatedAt ||
      rotation.rotatedAt > snapshot.issuedAt
    )
      fail('rotation does not match key authorization intervals');
  }
  for (const status of snapshot.statuses) {
    if (!issuers.has(status.issuerId)) fail('status references unknown issuer');
    if (status.updatedAt > snapshot.issuedAt)
      fail('status update is later than snapshot issuance');
  }
};

const parseUnsigned = (
  value: Record<string, unknown>,
): UnsignedRegistrySnapshot => {
  exactKeys(value, [
    'schemaVersion',
    'snapshotId',
    'tenantId',
    'jurisdiction',
    'sequence',
    'issuedAt',
    'expiresAt',
    'signingKeyId',
    'issuers',
    'rotations',
    'statuses',
  ]);
  if (value.schemaVersion !== REGISTRY_SNAPSHOT_VERSION)
    fail('unsupported snapshot version');
  const issuedAt = integer(value.issuedAt, 'issuedAt');
  const expiresAt = integer(value.expiresAt, 'expiresAt');
  if (expiresAt <= issuedAt) fail('snapshot lifetime is invalid');
  const issuers = list(value.issuers, 'issuers').map(parseIssuer);
  const rotations = list(value.rotations, 'rotations').map(parseRotation);
  const statuses = list(value.statuses, 'statuses').map(parseStatus);
  unique(
    issuers.map((entry) => entry.issuerId),
    'issuers',
  );
  unique(
    rotations.map(
      (entry) =>
        `${entry.issuerId}\u0000${entry.previousKeyId}\u0000${entry.newKeyId}\u0000${entry.rotatedAt}`,
    ),
    'rotations',
  );
  unique(
    rotations.map(
      (entry) => `${entry.issuerId}\u0000previous\u0000${entry.previousKeyId}`,
    ),
    'rotation predecessors',
  );
  unique(
    rotations.map(
      (entry) => `${entry.issuerId}\u0000next\u0000${entry.newKeyId}`,
    ),
    'rotation successors',
  );
  unique(
    statuses.map((entry) => `${entry.issuerId}\u0000${entry.statusId}`),
    'statuses',
  );
  const parsed: UnsignedRegistrySnapshot = {
    schemaVersion: REGISTRY_SNAPSHOT_VERSION,
    snapshotId: scopeString(value.snapshotId, 'snapshotId'),
    tenantId: scopeString(value.tenantId, 'tenantId'),
    jurisdiction: scopeString(value.jurisdiction, 'jurisdiction'),
    sequence: integer(value.sequence, 'sequence', 1),
    issuedAt,
    expiresAt,
    signingKeyId: safeString(value.signingKeyId, 'signingKeyId', 256),
    issuers,
    rotations,
    statuses,
  };
  validateRelations(parsed);
  return parsed;
};

export function parseUnsignedRegistrySnapshot(
  value: unknown,
): UnsignedRegistrySnapshot {
  return parseUnsigned(object(value, 'snapshot'));
}

export function parseSignedRegistrySnapshot(
  value: unknown,
): SignedRegistrySnapshot {
  const input = object(value, 'signed snapshot');
  if (!Object.hasOwn(input, 'signature'))
    throw new RegistrySnapshotError(
      'SNAPSHOT_UNSIGNED',
      'snapshot signature is required',
    );
  const signature = safeString(input.signature, 'signature', 8_192);
  const { signature: _signature, ...unsigned } = input;
  return { ...parseUnsigned(unsigned), signature };
}

const canonicalValue = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) fail('canonical number is invalid');
    return JSON.stringify(value);
  }
  if (Array.isArray(value))
    return `[${value.map((entry) => canonicalValue(entry)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalValue(entry)}`)
      .join(',')}}`;
  }
  return fail('canonical value is invalid');
};

/** Stable signing payload independent of input object key order. */
export function registrySnapshotSigningPayload(
  snapshot: UnsignedRegistrySnapshot,
): string {
  const parsed = parseUnsignedRegistrySnapshot(snapshot);
  return `ssw-trust-registry-v1\n${canonicalValue(parsed)}`;
}

export async function signRegistrySnapshot(
  snapshot: UnsignedRegistrySnapshot,
  signer: SnapshotSignerPort,
): Promise<SignedRegistrySnapshot> {
  const parsed = parseUnsignedRegistrySnapshot(snapshot);
  const signature = await signer.sign({
    scope: { tenantId: parsed.tenantId, jurisdiction: parsed.jurisdiction },
    keyId: parsed.signingKeyId,
    payload: registrySnapshotSigningPayload(parsed),
  });
  return parseSignedRegistrySnapshot({ ...parsed, signature });
}

export async function verifyRegistrySnapshot(
  value: unknown,
  scope: RegistryScope,
  verifier: SnapshotVerifierPort,
): Promise<SignedRegistrySnapshot> {
  const snapshot = parseSignedRegistrySnapshot(value);
  const expected = parseScope(scope);
  if (
    snapshot.tenantId !== expected.tenantId ||
    snapshot.jurisdiction !== expected.jurisdiction
  )
    throw new RegistrySnapshotError(
      'SNAPSHOT_SCOPE_MISMATCH',
      'snapshot scope does not match request',
    );
  const { signature, ...unsigned } = snapshot;
  const valid = await verifier.verify({
    scope: expected,
    keyId: snapshot.signingKeyId,
    payload: registrySnapshotSigningPayload(unsigned),
    signature,
  });
  if (!valid)
    throw new RegistrySnapshotError(
      'SNAPSHOT_SIGNATURE_INVALID',
      'snapshot signature is invalid',
    );
  return snapshot;
}

const parseScope = (scope: RegistryScope): RegistryScope => ({
  tenantId: scopeString(scope.tenantId, 'tenantId'),
  jurisdiction: scopeString(scope.jurisdiction, 'jurisdiction'),
});

const scopeKey = (scope: RegistryScope): string =>
  `${scope.tenantId}\u0000${scope.jurisdiction}`;

const evidence = (
  decision: RegistryDecisionKind,
  code: RegistryDecisionCode,
  snapshot?: SignedRegistrySnapshot,
): RegistryDecision => ({
  decision,
  code,
  ...(snapshot
    ? {
        snapshotId: snapshot.snapshotId,
        snapshotExpiresAt: snapshot.expiresAt,
      }
    : {}),
});

type SnapshotResolution =
  | { readonly ok: true; readonly snapshot: SignedRegistrySnapshot }
  | { readonly ok: false; readonly decision: RegistryDecision };

export interface SignedSnapshotCacheOptions {
  readonly clock?: () => number;
}

/**
 * Fresh signed snapshots are usable offline. A missing, stale, invalid or
 * unavailable refresh is indeterminate and can never produce `verified`.
 */
export class SignedSnapshotCache implements CredentialRegistryPort {
  private readonly entries = new Map<string, SignedRegistrySnapshot>();

  constructor(
    private readonly source: SignedSnapshotSourcePort,
    private readonly verifier: SnapshotVerifierPort,
    private readonly options: SignedSnapshotCacheOptions = {},
  ) {}

  async prime(value: unknown): Promise<SignedRegistrySnapshot> {
    const unscoped = parseSignedRegistrySnapshot(value);
    const scope = {
      tenantId: unscoped.tenantId,
      jurisdiction: unscoped.jurisdiction,
    };
    const snapshot = await this.verify(value, scope);
    const now = this.now();
    if (snapshot.issuedAt > now || snapshot.expiresAt <= now)
      throw new RegistrySnapshotError(
        'SNAPSHOT_STALE',
        'snapshot is outside its freshness window',
      );
    this.store(snapshot, scope);
    return snapshot;
  }

  invalidate(scope: RegistryScope): void {
    const parsed = parseScope(scope);
    this.entries.delete(scopeKey(parsed));
  }

  async refresh(scope: RegistryScope, now?: number): Promise<RegistryDecision> {
    const resolved = await this.fetch(parseScope(scope), now ?? this.now());
    return resolved.ok
      ? evidence('verified', 'SNAPSHOT_FRESH', resolved.snapshot)
      : resolved.decision;
  }

  async evaluateTrust(
    request: TrustEvaluationRequest,
  ): Promise<RegistryDecision> {
    const now = request.now ?? this.now();
    const resolved = await this.resolve(request, now);
    if (!resolved.ok) return resolved.decision;
    return evaluateTrustSnapshot(resolved.snapshot, { ...request, now });
  }

  async evaluateStatus(
    request: StatusEvaluationRequest,
  ): Promise<RegistryDecision> {
    const now = request.now ?? this.now();
    const resolved = await this.resolve(request, now);
    if (!resolved.ok) return resolved.decision;
    return evaluateStatusSnapshot(resolved.snapshot, { ...request, now });
  }

  async evaluateCredential(
    request: CredentialEvaluationRequest,
  ): Promise<RegistryDecision> {
    const now = request.now ?? this.now();
    const resolved = await this.resolve(request, now);
    if (!resolved.ok) return resolved.decision;
    const trust = evaluateTrustSnapshot(resolved.snapshot, { ...request, now });
    if (trust.decision !== 'verified') return trust;
    const status = evaluateStatusSnapshot(resolved.snapshot, {
      ...request,
      now,
    });
    if (status.decision !== 'verified') return status;
    return evidence('verified', 'CREDENTIAL_VERIFIED', resolved.snapshot);
  }

  private now(): number {
    return this.options.clock?.() ?? Date.now();
  }

  private async resolve(
    scope: RegistryScope,
    now: number,
  ): Promise<SnapshotResolution> {
    const parsed = parseScope(scope);
    const cached = this.entries.get(scopeKey(parsed));
    if (cached && cached.issuedAt <= now && now < cached.expiresAt)
      return { ok: true, snapshot: cached };
    return this.fetch(parsed, now, cached);
  }

  private async fetch(
    scope: RegistryScope,
    now: number,
    stale?: SignedRegistrySnapshot,
  ): Promise<SnapshotResolution> {
    let value: unknown;
    try {
      value = await this.source.load(scope);
    } catch {
      return {
        ok: false,
        decision: evidence('indeterminate', 'REGISTRY_UNAVAILABLE', stale),
      };
    }
    if (value === undefined || value === null)
      return {
        ok: false,
        decision: evidence('indeterminate', 'SNAPSHOT_MISSING', stale),
      };
    let snapshot: SignedRegistrySnapshot;
    try {
      snapshot = await this.verify(value, scope);
    } catch {
      return {
        ok: false,
        decision: evidence('indeterminate', 'SNAPSHOT_INVALID', stale),
      };
    }
    if (snapshot.issuedAt > now || snapshot.expiresAt <= now)
      return {
        ok: false,
        decision: evidence('indeterminate', 'SNAPSHOT_STALE', snapshot),
      };
    try {
      this.store(snapshot, scope);
    } catch {
      return {
        ok: false,
        decision: evidence('indeterminate', 'SNAPSHOT_INVALID', stale),
      };
    }
    return { ok: true, snapshot };
  }

  private async verify(
    value: unknown,
    scope: RegistryScope,
  ): Promise<SignedRegistrySnapshot> {
    return verifyRegistrySnapshot(value, scope, this.verifier);
  }

  private store(snapshot: SignedRegistrySnapshot, scope: RegistryScope): void {
    const key = scopeKey(scope);
    const previous = this.entries.get(key);
    if (previous && snapshot.sequence < previous.sequence)
      throw new RegistrySnapshotError(
        'SNAPSHOT_ROLLBACK',
        'snapshot sequence rollback rejected',
      );
    if (
      previous &&
      snapshot.sequence === previous.sequence &&
      (snapshot.snapshotId !== previous.snapshotId ||
        snapshot.signature !== previous.signature)
    )
      throw new RegistrySnapshotError(
        'SNAPSHOT_ROLLBACK',
        'conflicting snapshot sequence rejected',
      );
    this.entries.set(key, snapshot);
  }
}

export function evaluateTrustSnapshot(
  snapshot: SignedRegistrySnapshot,
  request: TrustEvaluationRequest,
): RegistryDecision {
  if (
    snapshot.tenantId !== request.tenantId ||
    snapshot.jurisdiction !== request.jurisdiction
  )
    return evidence('indeterminate', 'SNAPSHOT_INVALID');
  const now = request.now ?? Date.now();
  if (snapshot.issuedAt > now || snapshot.expiresAt <= now)
    return evidence('indeterminate', 'SNAPSHOT_STALE', snapshot);
  const issuer = snapshot.issuers.find(
    (entry) => entry.issuerId === request.issuerId,
  );
  if (!issuer) return evidence('indeterminate', 'ISSUER_UNKNOWN', snapshot);
  if (issuer.status === 'suspended')
    return evidence('rejected', 'ISSUER_SUSPENDED', snapshot);
  if (issuer.status === 'revoked')
    return evidence('rejected', 'ISSUER_REVOKED', snapshot);
  const schema = issuer.schemas.find(
    (entry) => entry.schemaId === request.schemaId,
  );
  if (!schema) return evidence('indeterminate', 'SCHEMA_UNKNOWN', snapshot);
  if (schema.status === 'suspended')
    return evidence('rejected', 'SCHEMA_SUSPENDED', snapshot);
  if (schema.status === 'revoked')
    return evidence('rejected', 'SCHEMA_REVOKED', snapshot);
  const key = issuer.keys.find((entry) => entry.keyId === request.keyId);
  if (!key) return evidence('indeterminate', 'KEY_UNKNOWN', snapshot);
  if (key.status === 'revoked')
    return evidence('rejected', 'KEY_REVOKED', snapshot);
  if (
    !Number.isSafeInteger(request.issuedAt) ||
    request.issuedAt < key.authorizedFrom ||
    (key.authorizedUntil !== undefined &&
      request.issuedAt >= key.authorizedUntil)
  )
    return evidence('rejected', 'KEY_NOT_AUTHORIZED_AT_ISSUANCE', snapshot);
  return evidence('verified', 'TRUST_VERIFIED', snapshot);
}

export function evaluateStatusSnapshot(
  snapshot: SignedRegistrySnapshot,
  request: StatusEvaluationRequest,
): RegistryDecision {
  if (
    snapshot.tenantId !== request.tenantId ||
    snapshot.jurisdiction !== request.jurisdiction
  )
    return evidence('indeterminate', 'SNAPSHOT_INVALID');
  const now = request.now ?? Date.now();
  if (snapshot.issuedAt > now || snapshot.expiresAt <= now)
    return evidence('indeterminate', 'SNAPSHOT_STALE', snapshot);
  const issuer = snapshot.issuers.find(
    (entry) => entry.issuerId === request.issuerId,
  );
  if (!issuer) return evidence('indeterminate', 'ISSUER_UNKNOWN', snapshot);
  if (issuer.status === 'suspended')
    return evidence('rejected', 'ISSUER_SUSPENDED', snapshot);
  if (issuer.status === 'revoked')
    return evidence('rejected', 'ISSUER_REVOKED', snapshot);
  const status = snapshot.statuses.find(
    (entry) =>
      entry.issuerId === request.issuerId &&
      entry.statusId === request.statusId,
  );
  if (!status) return evidence('indeterminate', 'STATUS_UNKNOWN', snapshot);
  if (status.status === 'suspended')
    return evidence('rejected', 'CREDENTIAL_SUSPENDED', snapshot);
  if (status.status === 'revoked')
    return evidence('rejected', 'CREDENTIAL_REVOKED', snapshot);
  return evidence('verified', 'STATUS_VALID', snapshot);
}
