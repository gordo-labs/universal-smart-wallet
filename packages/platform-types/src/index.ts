/**
 * Dependency-free, versioned public contracts for the self-hosted wallet
 * platform. The parsers intentionally reject unknown fields so an older
 * service cannot silently accept a newer, unsafe wire shape.
 */
export const PLATFORM_SCHEMA_VERSION = 1 as const;
export const MAX_STRING_LENGTH = 256;
export const MAX_ID_LENGTH = 128;
export const MAX_ARRAY_ITEMS = 32;
export const MAX_HEX_BYTES = 32_768;

export class PlatformSchemaError extends Error {
  readonly code:
    | 'SCHEMA_INVALID'
    | 'UNKNOWN_FIELD'
    | 'UNSUPPORTED_VERSION'
    | 'LOCATOR_INVALID'
    | 'LOCATOR_TENANT_MISMATCH'
    | 'SERIALIZATION_INVALID';

  constructor(code: PlatformSchemaError['code'], message: string) {
    super(message);
    this.name = 'PlatformSchemaError';
    this.code = code;
  }
}

const fail = (message: string, code: PlatformSchemaError['code'] = 'SCHEMA_INVALID'): never => {
  throw new PlatformSchemaError(code, message);
};

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const keys = (value: RecordValue, allowed: readonly string[]): void => {
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) fail(`unknown field: ${key}`, 'UNKNOWN_FIELD');
};

const version = (value: unknown): typeof PLATFORM_SCHEMA_VERSION =>
  value === PLATFORM_SCHEMA_VERSION
    ? PLATFORM_SCHEMA_VERSION
    : fail('unsupported schema version', 'UNSUPPORTED_VERSION');

const string = (value: unknown, field: string, max = MAX_STRING_LENGTH): string => {
  if (typeof value !== 'string' || value.length === 0 || value.length > max)
    return fail(`${field} must be a non-empty string of at most ${max} characters`);
  return value;
};

const id = (value: unknown, field: string): string => {
  const result = string(value, field, MAX_ID_LENGTH);
  if (!/^[A-Za-z0-9._:-]+$/u.test(result)) return fail(`${field} contains unsafe characters`);
  return result;
};

const integer = (value: unknown, field: string, minimum = 0): number => {
  if (!Number.isSafeInteger(value) || (value as number) < minimum)
    return fail(`${field} must be a safe integer >= ${minimum}`);
  return value as number;
};

const timestamp = (value: unknown, field: string): string => {
  const result = string(value, field, 64);
  if (Number.isNaN(Date.parse(result))) return fail(`${field} must be an ISO timestamp`);
  return result;
};

const address = (value: unknown, field: string): `0x${string}` => {
  const result = string(value, field, 42);
  if (!/^0x[0-9a-fA-F]{40}$/u.test(result)) return fail(`${field} must be a 20-byte hex address`);
  return result.toLowerCase() as `0x${string}`;
};

const hex = (value: unknown, field: string, maxBytes = MAX_HEX_BYTES): `0x${string}` => {
  const result = string(value, field, maxBytes * 2 + 2);
  if (!/^0x(?:[0-9a-fA-F]{2})*$/u.test(result) || (result.length - 2) / 2 > maxBytes)
    return fail(`${field} must be even-length hex within ${maxBytes} bytes`);
  return result.toLowerCase() as `0x${string}`;
};

const decimal = (value: unknown, field: string): string => {
  const result = string(value, field, 80);
  if (!/^(?:0|[1-9][0-9]*)$/u.test(result)) return fail(`${field} must be an unsigned decimal string`);
  return result;
};

export type WalletLocator = `wlt_v${typeof PLATFORM_SCHEMA_VERSION}_${string}_${string}`;

const hexDigest = (bytes: Uint8Array): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

const digest = async (value: string): Promise<string> =>
  hexDigest(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));

/** Creates an opaque locator. Neither tenantId nor walletId is present in the token. */
export async function createWalletLocator(input: {
  readonly tenantId: string;
  readonly walletId: string;
}): Promise<WalletLocator> {
  const tenant = id(input.tenantId, 'tenantId');
  const wallet = id(input.walletId, 'walletId');
  return `wlt_v1_${await digest(`tenant:${tenant}`)}_${await digest(`wallet:${tenant}:${wallet}`)}` as WalletLocator;
}

export function parseWalletLocator(value: unknown): WalletLocator {
  if (typeof value !== 'string' || !/^wlt_v1_[0-9a-f]{64}_[0-9a-f]{64}$/u.test(value))
    return fail('invalid wallet locator', 'LOCATOR_INVALID');
  return value as WalletLocator;
}

/** Recomputes the tenant binding and prevents a locator being used cross-tenant. */
export async function assertWalletLocatorTenant(input: {
  readonly locator: unknown;
  readonly tenantId: string;
  readonly walletId?: string;
}): Promise<WalletLocator> {
  const locator = parseWalletLocator(input.locator);
  const expectedTenant = await digest(`tenant:${id(input.tenantId, 'tenantId')}`);
  if (locator.split('_')[2] !== expectedTenant)
    return fail('wallet locator is not scoped to this tenant', 'LOCATOR_TENANT_MISMATCH');
  if (input.walletId !== undefined) {
    const expectedWallet = await digest(`wallet:${id(input.tenantId, 'tenantId')}:${id(input.walletId, 'walletId')}`);
    if (locator.split('_')[3] !== expectedWallet)
      return fail('wallet locator does not identify this wallet', 'LOCATOR_TENANT_MISMATCH');
  }
  return locator;
}

export interface Tenant {
  readonly schemaVersion: typeof PLATFORM_SCHEMA_VERSION;
  readonly tenantId: string;
  readonly displayName: string;
  readonly createdAt: string;
}
export interface Principal {
  readonly schemaVersion: typeof PLATFORM_SCHEMA_VERSION;
  readonly principalId: string;
  readonly tenantId: string;
  readonly kind: 'user' | 'service';
  readonly status: 'active' | 'suspended';
}
export interface Wallet {
  readonly schemaVersion: typeof PLATFORM_SCHEMA_VERSION;
  readonly walletId: string;
  readonly tenantId: string;
  readonly locator: WalletLocator;
  readonly chainId: number;
  readonly address: `0x${string}`;
  readonly status: 'active' | 'suspended' | 'closed';
  readonly did?: string;
}
export interface SignerBinding {
  readonly schemaVersion: typeof PLATFORM_SCHEMA_VERSION;
  readonly signerId: string;
  readonly walletLocator: WalletLocator;
  readonly kind: 'passkey' | 'recovery' | 'operational';
  readonly status: 'active' | 'revoked';
  readonly publicKey?: `0x${string}`;
}
export interface AuthIdentity {
  readonly schemaVersion: typeof PLATFORM_SCHEMA_VERSION;
  readonly identityId: string;
  readonly principalId: string;
  readonly provider: 'email' | 'oidc' | 'passkey';
  /** Provider subject hash; raw email and social subject are never accepted. */
  readonly subjectHash: `0x${string}`;
  readonly verifiedAt: string;
}
export interface TransactionIntent {
  readonly schemaVersion: typeof PLATFORM_SCHEMA_VERSION;
  readonly intentId: string;
  readonly walletLocator: WalletLocator;
  readonly chainId: number;
  readonly target: `0x${string}`;
  readonly value: string;
  readonly data: `0x${string}`;
  readonly expiresAt: string;
}
export interface AuthorizationChallenge {
  readonly schemaVersion: typeof PLATFORM_SCHEMA_VERSION;
  readonly challengeId: string;
  readonly walletLocator: WalletLocator;
  readonly nonce: `0x${string}`;
  readonly audience: string;
  readonly expiresAt: string;
}
export interface AuditEvent {
  readonly schemaVersion: typeof PLATFORM_SCHEMA_VERSION;
  readonly eventId: string;
  readonly tenantId: string;
  readonly eventType: string;
  readonly actorKind: 'user' | 'service' | 'system';
  readonly outcome: 'accepted' | 'rejected';
  readonly resource: string;
  readonly createdAt: string;
}
export interface MigrationBundle {
  readonly schemaVersion: typeof PLATFORM_SCHEMA_VERSION;
  readonly bundleId: string;
  readonly walletLocator: WalletLocator;
  readonly sourceVendor: string;
  readonly targetVendor: string;
  readonly payloadDigest: `0x${string}`;
  readonly signature: `0x${string}`;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

const parse = <T>(value: unknown, name: string, allowed: readonly string[], body: (v: RecordValue) => T): T => {
  if (!isRecord(value)) return fail(`${name} must be an object`);
  keys(value, allowed);
  version(value.schemaVersion);
  return body(value);
};

export const parseTenant = (v: unknown): Tenant => parse(v, 'tenant', ['schemaVersion', 'tenantId', 'displayName', 'createdAt'], (x) => ({ schemaVersion: 1, tenantId: id(x.tenantId, 'tenantId'), displayName: string(x.displayName, 'displayName'), createdAt: timestamp(x.createdAt, 'createdAt') }));
export const parsePrincipal = (v: unknown): Principal => parse(v, 'principal', ['schemaVersion', 'principalId', 'tenantId', 'kind', 'status'], (x) => ({ schemaVersion: 1, principalId: id(x.principalId, 'principalId'), tenantId: id(x.tenantId, 'tenantId'), kind: x.kind === 'user' || x.kind === 'service' ? x.kind : fail('invalid principal kind'), status: x.status === 'active' || x.status === 'suspended' ? x.status : fail('invalid principal status') }));
export const parseWallet = (v: unknown): Wallet => parse(v, 'wallet', ['schemaVersion', 'walletId', 'tenantId', 'locator', 'chainId', 'address', 'status', 'did'], (x) => ({ schemaVersion: 1, walletId: id(x.walletId, 'walletId'), tenantId: id(x.tenantId, 'tenantId'), locator: parseWalletLocator(x.locator), chainId: integer(x.chainId, 'chainId', 1), address: address(x.address, 'address'), status: x.status === 'active' || x.status === 'suspended' || x.status === 'closed' ? x.status : fail('invalid wallet status'), ...(x.did === undefined ? {} : { did: string(x.did, 'did') }) }));
export const parseSignerBinding = (v: unknown): SignerBinding => parse(v, 'signer binding', ['schemaVersion', 'signerId', 'walletLocator', 'kind', 'status', 'publicKey'], (x) => ({ schemaVersion: 1, signerId: id(x.signerId, 'signerId'), walletLocator: parseWalletLocator(x.walletLocator), kind: x.kind === 'passkey' || x.kind === 'recovery' || x.kind === 'operational' ? x.kind : fail('invalid signer kind'), status: x.status === 'active' || x.status === 'revoked' ? x.status : fail('invalid signer status'), ...(x.publicKey === undefined ? {} : { publicKey: hex(x.publicKey, 'publicKey') }) }));
export const parseAuthIdentity = (v: unknown): AuthIdentity => parse(v, 'auth identity', ['schemaVersion', 'identityId', 'principalId', 'provider', 'subjectHash', 'verifiedAt'], (x) => ({ schemaVersion: 1, identityId: id(x.identityId, 'identityId'), principalId: id(x.principalId, 'principalId'), provider: x.provider === 'email' || x.provider === 'oidc' || x.provider === 'passkey' ? x.provider : fail('invalid auth provider'), subjectHash: hex(x.subjectHash, 'subjectHash', 64), verifiedAt: timestamp(x.verifiedAt, 'verifiedAt') }));
export const parseTransactionIntent = (v: unknown): TransactionIntent => parse(v, 'transaction intent', ['schemaVersion', 'intentId', 'walletLocator', 'chainId', 'target', 'value', 'data', 'expiresAt'], (x) => ({ schemaVersion: 1, intentId: id(x.intentId, 'intentId'), walletLocator: parseWalletLocator(x.walletLocator), chainId: integer(x.chainId, 'chainId', 1), target: address(x.target, 'target'), value: decimal(x.value, 'value'), data: hex(x.data, 'data'), expiresAt: timestamp(x.expiresAt, 'expiresAt') }));
export const parseAuthorizationChallenge = (v: unknown): AuthorizationChallenge => parse(v, 'authorization challenge', ['schemaVersion', 'challengeId', 'walletLocator', 'nonce', 'audience', 'expiresAt'], (x) => ({ schemaVersion: 1, challengeId: id(x.challengeId, 'challengeId'), walletLocator: parseWalletLocator(x.walletLocator), nonce: hex(x.nonce, 'nonce', 64), audience: string(x.audience, 'audience'), expiresAt: timestamp(x.expiresAt, 'expiresAt') }));
export const parseAuditEvent = (v: unknown): AuditEvent => parse(v, 'audit event', ['schemaVersion', 'eventId', 'tenantId', 'eventType', 'actorKind', 'outcome', 'resource', 'createdAt'], (x) => ({ schemaVersion: 1, eventId: id(x.eventId, 'eventId'), tenantId: id(x.tenantId, 'tenantId'), eventType: string(x.eventType, 'eventType'), actorKind: x.actorKind === 'user' || x.actorKind === 'service' || x.actorKind === 'system' ? x.actorKind : fail('invalid actor kind'), outcome: x.outcome === 'accepted' || x.outcome === 'rejected' ? x.outcome : fail('invalid audit outcome'), resource: string(x.resource, 'resource'), createdAt: timestamp(x.createdAt, 'createdAt') }));
export const parseMigrationBundle = (v: unknown): MigrationBundle => parse(v, 'migration bundle', ['schemaVersion', 'bundleId', 'walletLocator', 'sourceVendor', 'targetVendor', 'payloadDigest', 'signature', 'issuedAt', 'expiresAt'], (x) => ({ schemaVersion: 1, bundleId: id(x.bundleId, 'bundleId'), walletLocator: parseWalletLocator(x.walletLocator), sourceVendor: id(x.sourceVendor, 'sourceVendor'), targetVendor: id(x.targetVendor, 'targetVendor'), payloadDigest: hex(x.payloadDigest, 'payloadDigest', 64), signature: hex(x.signature, 'signature', 16_384), issuedAt: timestamp(x.issuedAt, 'issuedAt'), expiresAt: timestamp(x.expiresAt, 'expiresAt') }));

const MAX_DEPTH = 8;
const stableValue = (value: unknown, depth: number): string => {
  if (depth > MAX_DEPTH) return fail('serialization nesting limit exceeded', 'SERIALIZATION_INVALID');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) return fail('unsafe number in serialization', 'SERIALIZATION_INVALID');
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) return fail('array exceeds serialization bound', 'SERIALIZATION_INVALID');
    return `[${value.map((item) => stableValue(item, depth + 1)).join(',')}]`;
  }
  if (isRecord(value)) {
    const names = Object.keys(value).sort();
    return `{${names.map((name) => `${JSON.stringify(name)}:${stableValue(value[name], depth + 1)}`).join(',')}}`;
  }
  return fail('unsupported value in serialization', 'SERIALIZATION_INVALID');
};

/** Canonical JSON used for signatures and idempotency keys. */
export const serializeCanonical = (value: unknown): string => stableValue(value, 0);
