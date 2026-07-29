import { MAX_ARRAY_ITEMS, MAX_NESTING_DEPTH, MAX_STRING_LENGTH, SchemaValidationError, SHARED_SCHEMA_VERSION } from '@ssw/shared-types';

export const POLICY_SCHEMA_VERSION = 1 as const;
export type SupportedOperator = 'equals';
export interface ClaimRequirement { readonly path: readonly [string, ...string[]]; readonly operator: SupportedOperator; readonly value: string | number | boolean; readonly requiredDisclosure: boolean }
export interface CredentialQuery { readonly id: string; readonly format: 'dc+sd-jwt'; readonly vct: string; readonly claims: readonly ClaimRequirement[] }
export interface PresentationPolicy { readonly schemaVersion: typeof POLICY_SCHEMA_VERSION; readonly id: string; readonly purpose: string; readonly credentials: readonly CredentialQuery[] }

export interface DcqlQuery { readonly credentials: readonly DcqlCredentialQuery[] }
export interface DcqlCredentialQuery { readonly id: string; readonly format: 'dc+sd-jwt'; readonly meta: { readonly vct_values: readonly [string] }; readonly claims: readonly [{ readonly path: readonly [string, ...string[]]; readonly values: readonly [string | number | boolean] }] }

const fail = (message: string): never => { throw new SchemaValidationError(message); };
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, field: string): string => typeof v === 'string' && v.length > 0 && v.length <= MAX_STRING_LENGTH ? v : fail(`${field} is invalid`);
const keys = (o: Record<string, unknown>, allowed: readonly string[]) => { for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(`unknown field: ${k}`); };
const path = (v: unknown): [string, ...string[]] => { if (!Array.isArray(v) || v.length < 1 || v.length > MAX_NESTING_DEPTH) return fail('invalid claim path'); const p = v.map((x) => text(x, 'path')); return p as [string, ...string[]]; };
const scalar = (v: unknown): string | number | boolean => (typeof v === 'string' && v.length <= MAX_STRING_LENGTH) || typeof v === 'number' || typeof v === 'boolean' ? v : fail('claim value must be a bounded scalar');

export function parsePresentationPolicy(value: unknown): PresentationPolicy {
  if (!record(value)) return fail('policy must be an object');
  keys(value, ['schemaVersion', 'id', 'purpose', 'credentials']);
  if (value.schemaVersion !== POLICY_SCHEMA_VERSION) return fail('unsupported policy schema version');
  if (SHARED_SCHEMA_VERSION !== 1) return fail('incompatible shared schema');
  if (!Array.isArray(value.credentials) || value.credentials.length < 1 || value.credentials.length > MAX_ARRAY_ITEMS) return fail('invalid credentials');
  const credentials = value.credentials.map(parseCredentialQuery);
  return { schemaVersion: 1, id: text(value.id, 'id'), purpose: text(value.purpose, 'purpose'), credentials };
}
function parseCredentialQuery(value: unknown): CredentialQuery {
  if (!record(value)) return fail('credential query must be an object');
  keys(value, ['id', 'format', 'vct', 'claims']);
  if (value.format !== 'dc+sd-jwt' || !Array.isArray(value.claims) || value.claims.length < 1 || value.claims.length > MAX_ARRAY_ITEMS) return fail('unsupported credential query');
  return { id: text(value.id, 'credential id'), format: 'dc+sd-jwt', vct: text(value.vct, 'vct'), claims: value.claims.map(parseClaim) };
}
function parseClaim(value: unknown): ClaimRequirement {
  if (!record(value)) return fail('claim must be an object');
  keys(value, ['path', 'operator', 'value', 'requiredDisclosure']);
  if (value.operator !== 'equals' || typeof value.requiredDisclosure !== 'boolean') return fail('unsupported claim operator or disclosure');
  return { path: path(value.path), operator: 'equals', value: scalar(value.value), requiredDisclosure: value.requiredDisclosure };
}

export const ageOver18Policy = (id = 'age-over-18', purpose = 'age verification'): PresentationPolicy => parsePresentationPolicy({ schemaVersion: 1, id, purpose, credentials: [{ id: 'age-credential', format: 'dc+sd-jwt', vct: 'urn:ssw:age-over-18', claims: [{ path: ['is_over_18'], operator: 'equals', value: true, requiredDisclosure: true }] }] });

export function toDcql(policy: PresentationPolicy): DcqlQuery {
  const parsed = parsePresentationPolicy(policy);
  return { credentials: parsed.credentials.map((credential) => ({ id: credential.id, format: credential.format, meta: { vct_values: [credential.vct] as [string] }, claims: credential.claims.map((claim) => ({ path: claim.path, values: [claim.value] as [string | number | boolean] })) as unknown as [{ path: readonly [string, ...string[]]; values: readonly [string | number | boolean] }] })) };
}
export function fromDcql(value: unknown, purpose = 'DCQL presentation'): PresentationPolicy {
  if (!record(value)) return fail('DCQL query must be an object');
  keys(value, ['credentials']);
  if (!Array.isArray(value.credentials) || value.credentials.length < 1 || value.credentials.length > MAX_ARRAY_ITEMS) return fail('invalid DCQL credentials');
  const credentials = value.credentials.map((item) => {
    if (!record(item)) return fail('invalid DCQL credential');
    keys(item, ['id', 'format', 'meta', 'claims']);
    if (item.format !== 'dc+sd-jwt' || !record(item.meta) || !Array.isArray(item.meta.vct_values) || item.meta.vct_values.length !== 1 || !Array.isArray(item.claims) || item.claims.length < 1 || item.claims.length > MAX_ARRAY_ITEMS) return fail('unsupported DCQL credential');
    keys(item.meta, ['vct_values']);
    const vct = text(item.meta.vct_values[0], 'vct');
    const claims = item.claims.map((claim) => {
      if (!record(claim)) return fail('invalid DCQL claim');
      keys(claim, ['path', 'values']);
      if (!Array.isArray(claim.values) || claim.values.length !== 1) return fail('DCQL claim must have one value');
      return { path: path(claim.path), operator: 'equals' as const, value: scalar(claim.values[0]), requiredDisclosure: true };
    });
    return { id: text(item.id, 'credential id'), format: 'dc+sd-jwt' as const, vct, claims };
  });
  return parsePresentationPolicy({ schemaVersion: 1, id: 'dcql-policy', purpose, credentials });
}
