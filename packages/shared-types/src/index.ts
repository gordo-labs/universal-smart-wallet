/** Versioned, dependency-free runtime schemas shared by wallet components. */
export const SHARED_SCHEMA_VERSION = 1 as const;
export const MAX_STRING_LENGTH = 256;
export const MAX_ARRAY_ITEMS = 16;
export const MAX_NESTING_DEPTH = 4;

export type RuntimeEnvironment = 'local' | 'testnet';
export interface HealthStatus { readonly name: string; readonly ok: true }
export const foundationHealth = (name: string): HealthStatus => ({ name, ok: true });

export type CredentialFormat = 'dc+sd-jwt';
export interface CredentialMetadata {
  readonly schemaVersion: typeof SHARED_SCHEMA_VERSION;
  readonly format: CredentialFormat;
  readonly vct: string;
  readonly issuer?: string;
  readonly validFrom?: string;
  readonly validUntil?: string;
}

export type VerificationStatus = 'verified' | 'rejected';
export interface VerificationResult {
  readonly schemaVersion: typeof SHARED_SCHEMA_VERSION;
  readonly status: VerificationStatus;
  readonly credentialId: string;
  readonly disclosedClaims: Readonly<Record<string, unknown>>;
  readonly checks: readonly string[];
}

export class SchemaValidationError extends Error {
  readonly code = 'SCHEMA_INVALID';
  constructor(message: string) { super(message); this.name = 'SchemaValidationError'; }
}

const fail = (message: string): never => { throw new SchemaValidationError(message); };
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const boundedString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_STRING_LENGTH)
    return fail(`${field} must be a non-empty string of at most ${MAX_STRING_LENGTH} characters`);
  return value;
};
const exactKeys = (object: Record<string, unknown>, allowed: readonly string[]): void => {
  for (const key of Object.keys(object)) if (!allowed.includes(key)) fail(`unknown field: ${key}`);
};
const version = (value: unknown): typeof SHARED_SCHEMA_VERSION =>
  value === SHARED_SCHEMA_VERSION ? SHARED_SCHEMA_VERSION : fail('unsupported schema version');

export function parseCredentialMetadata(value: unknown): CredentialMetadata {
  if (!isRecord(value)) return fail('credential metadata must be an object');
  exactKeys(value, ['schemaVersion', 'format', 'vct', 'issuer', 'validFrom', 'validUntil']);
  version(value.schemaVersion);
  if (value.format !== 'dc+sd-jwt') return fail('unsupported credential format');
  const result: CredentialMetadata = { schemaVersion: 1, format: 'dc+sd-jwt', vct: boundedString(value.vct, 'vct') };
  for (const field of ['issuer', 'validFrom', 'validUntil'] as const)
    if (value[field] !== undefined) (result as unknown as Record<string, unknown>)[field] = boundedString(value[field], field);
  return result;
}

export function parseVerificationResult(value: unknown): VerificationResult {
  if (!isRecord(value)) return fail('verification result must be an object');
  exactKeys(value, ['schemaVersion', 'status', 'credentialId', 'disclosedClaims', 'checks']);
  version(value.schemaVersion);
  if (value.status !== 'verified' && value.status !== 'rejected') return fail('invalid verification status');
  boundedString(value.credentialId, 'credentialId');
  if (!isRecord(value.disclosedClaims)) return fail('disclosedClaims must be an object');
  if (!Array.isArray(value.checks) || value.checks.length > MAX_ARRAY_ITEMS) return fail('checks exceeds bound');
  const checks = value.checks.map((check) => boundedString(check, 'check'));
  return { schemaVersion: 1, status: value.status, credentialId: value.credentialId as string, disclosedClaims: value.disclosedClaims, checks };
}
