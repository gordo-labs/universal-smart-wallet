/**
 * Signed offline QR envelopes.
 *
 * This module is deliberately transport- and crypto-neutral.  It owns the
 * bounded envelope format, strict parsing, freshness and replay policy, and a
 * cache that is safe to use without network access.  Signature algorithms and
 * key custody stay behind the ports below.
 */

export const OFFLINE_ENVELOPE_SCHEMA_VERSION = 1 as const;
export const OFFLINE_ENVELOPE_FORMAT = 'ssw-offline-envelope' as const;
export const MAX_OFFLINE_ENVELOPE_BYTES = 12_288;
export const MAX_OFFLINE_CREDENTIAL_BYTES = 8_192;
export const MAX_OFFLINE_IDENTIFIER_BYTES = 256;
export const MAX_OFFLINE_SIGNATURE_BYTES = 4_096;
export const MAX_OFFLINE_SNAPSHOT_BYTES = 256_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const base64Url = /^[A-Za-z0-9_-]+$/u;
const identifier = /^[A-Za-z0-9][A-Za-z0-9._:/#?@%+~\-]{0,255}$/u;
const noncePattern = /^[A-Za-z0-9_-]{16,128}$/u;
const control = /[\u0000-\u001f\u007f]/u;

export type OfflineVerificationOutcome =
  | 'verified'
  | 'rejected'
  | 'indeterminate';

export type OfflineVerificationCode =
  | 'VERIFIED'
  | 'MALFORMED_ENVELOPE'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_VERSION'
  | 'DOWNGRADE_DETECTED'
  | 'SIGNATURE_INVALID'
  | 'SIGNATURE_UNAVAILABLE'
  | 'FRESHNESS_EXPIRED'
  | 'FRESHNESS_NOT_YET_VALID'
  | 'FRESHNESS_LIFETIME_EXCEEDED'
  | 'REPLAY_DETECTED'
  | 'TRUST_UNKNOWN'
  | 'STATUS_UNKNOWN'
  | 'TRUST_REJECTED'
  | 'STATUS_REJECTED'
  | 'CACHE_MISSING'
  | 'CACHE_STALE'
  | 'CACHE_INVALID'
  | 'CACHE_ROLLBACK'
  | 'CACHE_SIGNATURE_INVALID';

export class OfflineVerificationError extends Error {
  constructor(
    readonly code: OfflineVerificationCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'OfflineVerificationError';
  }
}

export type OfflineEnvelopeUnsigned = {
  readonly format: typeof OFFLINE_ENVELOPE_FORMAT;
  readonly schemaVersion: 1;
  readonly envelopeId: string;
  readonly tenantId: string;
  readonly jurisdiction: string;
  readonly issuerId: string;
  readonly schemaId: string;
  readonly keyId: string;
  readonly statusId: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly nonce: string;
  /** Opaque compact credential/presentation bytes; never returned in results. */
  readonly credential: string;
};

export type OfflineEnvelope = OfflineEnvelopeUnsigned & {
  readonly signature: string;
};

export interface OfflineEnvelopeSigner {
  sign(input: {
    readonly keyId: string;
    readonly payload: string;
  }): Promise<string> | string;
}

export interface OfflineEnvelopeVerifier {
  verify(input: {
    readonly issuerId: string;
    readonly keyId: string;
    readonly payload: string;
    readonly signature: string;
  }): Promise<boolean> | boolean;
}

export interface OfflineReplayBoundary {
  /** Must be atomic: only the first consume for a nonce/envelope is true. */
  consume(token: string, now: number): boolean;
}

export type OfflineFreshnessPolicy = {
  readonly now: number;
  /** Small, explicit clock tolerance. Defaults to zero. */
  readonly clockSkewSeconds?: number;
  /** Maximum lifetime accepted for an envelope. Defaults to 24 hours. */
  readonly maxLifetimeSeconds?: number;
};

export type OfflineFreshnessResult =
  | { readonly fresh: true }
  | {
      readonly fresh: false;
      readonly code:
        | 'FRESHNESS_EXPIRED'
        | 'FRESHNESS_NOT_YET_VALID'
        | 'FRESHNESS_LIFETIME_EXCEEDED';
    };

export type OfflineRegistryDecision = {
  readonly decision: 'verified' | 'rejected' | 'indeterminate';
  readonly code: string;
  readonly snapshotId?: string;
  readonly snapshotExpiresAt?: number;
};

export type OfflineCredentialLookup = Pick<
  OfflineEnvelopeUnsigned,
  | 'tenantId'
  | 'jurisdiction'
  | 'issuerId'
  | 'schemaId'
  | 'keyId'
  | 'statusId'
  | 'issuedAt'
>;

export interface OfflineTrustStatusResolver {
  evaluateCredential(
    input: OfflineCredentialLookup & { readonly now: number },
  ): Promise<OfflineRegistryDecision> | OfflineRegistryDecision;
}

export type OfflineVerificationResult = {
  readonly result: OfflineVerificationOutcome;
  readonly code: OfflineVerificationCode;
  readonly envelopeId?: string;
  readonly issuerId?: string;
  readonly schemaId?: string;
  readonly snapshotId?: string;
  readonly snapshotExpiresAt?: number;
};

const fail = (
  code: OfflineVerificationCode,
  message: string = code,
): never => {
  throw new OfflineVerificationError(code, message);
};

const bytes = (value: string): number => encoder.encode(value).byteLength;

const safeString = (
  value: unknown,
  name: string,
  max: number,
  pattern?: RegExp,
): string => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    bytes(value) > max ||
    control.test(value) ||
    (pattern && !pattern.test(value))
  )
    fail('MALFORMED_ENVELOPE', `${name} is invalid`);
  return value as string;
};

const integer = (value: unknown, name: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    fail('MALFORMED_ENVELOPE', `${name} is invalid`);
  return value as number;
};

const signature = (value: unknown): string =>
  safeString(value, 'signature', MAX_OFFLINE_SIGNATURE_BYTES, base64Url);

const nonce = (value: unknown): string =>
  safeString(value, 'nonce', 128, noncePattern);

/**
 * Small strict JSON reader.  JSON.parse permits duplicate keys, which would
 * make the signed bytes ambiguous.  The reader rejects duplicate and unsafe
 * object keys before any value is accepted.
 */
class StrictJson {
  private index = 0;

  constructor(private readonly source: string) {}

  parse(): unknown {
    const result = this.value(0);
    this.ws();
    if (this.index !== this.source.length) throw new Error('trailing data');
    return result;
  }

  private ws(): void {
    while (/\s/u.test(this.source[this.index] ?? '')) this.index += 1;
  }

  private value(depth: number): unknown {
    if (depth > 12) throw new Error('nesting too deep');
    this.ws();
    const char = this.source[this.index];
    if (char === '{') return this.object(depth + 1);
    if (char === '[') return this.array(depth + 1);
    if (char === '"') return this.string();
    if (this.source.startsWith('true', this.index)) {
      this.index += 4;
      return true;
    }
    if (this.source.startsWith('false', this.index)) {
      this.index += 5;
      return false;
    }
    if (this.source.startsWith('null', this.index)) {
      this.index += 4;
      return null;
    }
    const number = this.source
      .slice(this.index)
      .match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u);
    if (number) {
      this.index += number[0].length;
      const parsed = Number(number[0]);
      if (!Number.isSafeInteger(parsed)) throw new Error('unsafe number');
      return parsed;
    }
    throw new Error('invalid value');
  }

  private string(): string {
    const start = this.index++;
    let escaped = false;
    while (this.index < this.source.length) {
      const char = this.source[this.index++];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        const raw = this.source.slice(start, this.index);
        const result = JSON.parse(raw) as unknown;
        if (typeof result !== 'string' || control.test(result))
          throw new Error('invalid string');
        return result;
      }
      if (char < ' ') throw new Error('control character');
    }
    throw new Error('unterminated string');
  }

  private object(depth: number): Record<string, unknown> {
    this.index += 1;
    const result: Record<string, unknown> = {};
    const keys = new Set<string>();
    this.ws();
    if (this.source[this.index] === '}') {
      this.index += 1;
      return result;
    }
    while (true) {
      this.ws();
      if (this.source[this.index] !== '"') throw new Error('object key');
      const key = this.string();
      if (
        keys.has(key) ||
        key === '__proto__' ||
        key === 'constructor' ||
        key === 'prototype'
      )
        throw new Error('duplicate or unsafe key');
      keys.add(key);
      this.ws();
      if (this.source[this.index++] !== ':') throw new Error('colon');
      result[key] = this.value(depth);
      this.ws();
      const delimiter = this.source[this.index++];
      if (delimiter === '}') return result;
      if (delimiter !== ',') throw new Error('object delimiter');
    }
  }

  private array(depth: number): readonly unknown[] {
    this.index += 1;
    const result: unknown[] = [];
    this.ws();
    if (this.source[this.index] === ']') {
      this.index += 1;
      return result;
    }
    while (true) {
      result.push(this.value(depth));
      if (result.length > 256) throw new Error('array too large');
      this.ws();
      const delimiter = this.source[this.index++];
      if (delimiter === ']') return result;
      if (delimiter !== ',') throw new Error('array delimiter');
    }
  }
}

const canonical = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('unsafe number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(',')}}`;
  }
  throw new Error('unsupported canonical value');
};

const base64Encode = (value: string): string => {
  const bytesValue = encoder.encode(value);
  let binary = '';
  for (const byte of bytesValue) binary += String.fromCharCode(byte);
  return globalThis
    .btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};

const base64Decode = (value: string): string => {
  if (
    !base64Url.test(value) ||
    value.length % 4 === 1 ||
    bytes(value) > MAX_OFFLINE_ENVELOPE_BYTES
  )
    fail('PAYLOAD_TOO_LARGE', 'offline envelope encoding is invalid or too large');
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  let binary = '';
  try {
    binary = globalThis.atob(padded);
  } catch {
    fail('MALFORMED_ENVELOPE', 'offline envelope base64 is invalid');
  }
  const bytesValue = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  try {
    return decoder.decode(bytesValue);
  } catch {
    fail('MALFORMED_ENVELOPE', 'offline envelope is not UTF-8');
  }
  return fail('MALFORMED_ENVELOPE', 'offline envelope is not UTF-8');
};

const exactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
): void => {
  const expected = new Set(required);
  if (
    required.some((key) => !Object.hasOwn(value, key)) ||
    Object.keys(value).some((key) => !expected.has(key))
  )
    fail('MALFORMED_ENVELOPE', 'unknown or missing envelope fields');
};

const parseUnsignedEnvelope = (value: unknown): OfflineEnvelopeUnsigned => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('MALFORMED_ENVELOPE', 'envelope must be an object');
  const input = value as Record<string, unknown>;
  exactKeys(input, [
    'format',
    'schemaVersion',
    'envelopeId',
    'tenantId',
    'jurisdiction',
    'issuerId',
    'schemaId',
    'keyId',
    'statusId',
    'issuedAt',
    'expiresAt',
    'nonce',
    'credential',
  ]);
  if (input.format !== OFFLINE_ENVELOPE_FORMAT)
    fail('MALFORMED_ENVELOPE', 'offline envelope format is invalid');
  if (input.schemaVersion !== OFFLINE_ENVELOPE_SCHEMA_VERSION)
    fail(
      input.schemaVersion === 0 ||
        (typeof input.schemaVersion === 'number' && input.schemaVersion < 1)
        ? 'DOWNGRADE_DETECTED'
        : 'UNSUPPORTED_VERSION',
      'offline envelope version is not supported',
    );
  const issuedAt = integer(input.issuedAt, 'issuedAt');
  const expiresAt = integer(input.expiresAt, 'expiresAt');
  if (expiresAt <= issuedAt)
    fail('MALFORMED_ENVELOPE', 'envelope lifetime is invalid');
  return {
    format: OFFLINE_ENVELOPE_FORMAT,
    schemaVersion: OFFLINE_ENVELOPE_SCHEMA_VERSION,
    envelopeId: safeString(input.envelopeId, 'envelopeId', MAX_OFFLINE_IDENTIFIER_BYTES, identifier),
    tenantId: safeString(input.tenantId, 'tenantId', MAX_OFFLINE_IDENTIFIER_BYTES, identifier),
    jurisdiction: safeString(input.jurisdiction, 'jurisdiction', MAX_OFFLINE_IDENTIFIER_BYTES, identifier),
    issuerId: safeString(input.issuerId, 'issuerId', MAX_OFFLINE_IDENTIFIER_BYTES, identifier),
    schemaId: safeString(input.schemaId, 'schemaId', MAX_OFFLINE_IDENTIFIER_BYTES, identifier),
    keyId: safeString(input.keyId, 'keyId', MAX_OFFLINE_IDENTIFIER_BYTES, identifier),
    statusId: safeString(input.statusId, 'statusId', MAX_OFFLINE_IDENTIFIER_BYTES, identifier),
    issuedAt,
    expiresAt,
    nonce: nonce(input.nonce),
    credential: safeString(input.credential, 'credential', MAX_OFFLINE_CREDENTIAL_BYTES),
  };
};

export function offlineEnvelopeSigningPayload(
  envelope: OfflineEnvelopeUnsigned,
): string {
  return `ssw-offline-envelope-v1\n${canonical(parseUnsignedEnvelope(envelope))}`;
}

export async function createOfflineEnvelope(
  input: OfflineEnvelopeUnsigned,
  signer: OfflineEnvelopeSigner,
): Promise<string> {
  const unsigned = parseUnsignedEnvelope(input);
  const signed = await signer.sign({
    keyId: unsigned.keyId,
    payload: offlineEnvelopeSigningPayload(unsigned),
  });
  const parsedSignature = signature(signed);
  const encoded = base64Encode(
    canonical({ ...unsigned, signature: parsedSignature }),
  );
  if (bytes(encoded) > MAX_OFFLINE_ENVELOPE_BYTES)
    fail('PAYLOAD_TOO_LARGE', 'offline envelope exceeds QR bounds');
  return encoded;
}

export function parseOfflineEnvelope(
  input: string | Uint8Array,
): OfflineEnvelope {
  const encoded =
    typeof input === 'string'
      ? input
      : (() => {
          if (input.byteLength === 0 || input.byteLength > MAX_OFFLINE_ENVELOPE_BYTES)
            fail('PAYLOAD_TOO_LARGE', 'offline envelope exceeds QR bounds');
          try {
            return decoder.decode(input);
          } catch {
            return fail('MALFORMED_ENVELOPE', 'offline envelope is not UTF-8');
          }
        })();
  if (
    encoded.length === 0 ||
    bytes(encoded) > MAX_OFFLINE_ENVELOPE_BYTES ||
    !base64Url.test(encoded) ||
    encoded.length % 4 === 1
  )
    fail('PAYLOAD_TOO_LARGE', 'offline envelope encoding is invalid or too large');
  let parsed: unknown;
  try {
    parsed = new StrictJson(base64Decode(encoded)).parse();
  } catch (error) {
    if (error instanceof OfflineVerificationError) throw error;
    fail('MALFORMED_ENVELOPE', 'offline envelope JSON is invalid or ambiguous');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    fail('MALFORMED_ENVELOPE', 'offline envelope must be an object');
  const object = parsed as Record<string, unknown>;
  exactKeys(object, [
    'format',
    'schemaVersion',
    'envelopeId',
    'tenantId',
    'jurisdiction',
    'issuerId',
    'schemaId',
    'keyId',
    'statusId',
    'issuedAt',
    'expiresAt',
    'nonce',
    'credential',
    'signature',
  ]);
  const { signature: rawSignature, ...unsigned } = object;
  return {
    ...parseUnsignedEnvelope(unsigned),
    signature: signature(rawSignature),
  };
}

export function evaluateOfflineFreshness(
  envelope: Pick<OfflineEnvelopeUnsigned, 'issuedAt' | 'expiresAt'>,
  policy: OfflineFreshnessPolicy,
): OfflineFreshnessResult {
  if (!Number.isSafeInteger(policy.now) || policy.now < 0)
    fail('MALFORMED_ENVELOPE', 'clock value is invalid');
  const skew = policy.clockSkewSeconds ?? 0;
  const maxLifetime = policy.maxLifetimeSeconds ?? 86_400;
  if (
    !Number.isSafeInteger(skew) ||
    skew < 0 ||
    !Number.isSafeInteger(maxLifetime) ||
    maxLifetime <= 0
  )
    fail('MALFORMED_ENVELOPE', 'freshness policy is invalid');
  if (envelope.expiresAt - envelope.issuedAt > maxLifetime)
    return { fresh: false, code: 'FRESHNESS_LIFETIME_EXCEEDED' };
  if (envelope.issuedAt > policy.now + skew)
    return { fresh: false, code: 'FRESHNESS_NOT_YET_VALID' };
  if (envelope.expiresAt <= policy.now - skew)
    return { fresh: false, code: 'FRESHNESS_EXPIRED' };
  return { fresh: true };
}

const result = (
  envelope: OfflineEnvelope,
  outcome: OfflineVerificationOutcome,
  code: OfflineVerificationCode,
  decision?: OfflineRegistryDecision,
): OfflineVerificationResult => ({
  result: outcome,
  code,
  envelopeId: envelope.envelopeId,
  issuerId: envelope.issuerId,
  schemaId: envelope.schemaId,
  ...(decision?.snapshotId ? { snapshotId: decision.snapshotId } : {}),
  ...(decision?.snapshotExpiresAt !== undefined
    ? { snapshotExpiresAt: decision.snapshotExpiresAt }
    : {}),
});

/**
 * Verify an offline envelope without fetching anything.  Unknown/stale
 * registry state is deliberately mapped to `indeterminate`; only a fresh,
 * signed envelope with verified trust and status can return `verified`.
 */
export async function verifyOfflineEnvelope(
  input: string | Uint8Array | OfflineEnvelope,
  options: {
    readonly verifier: OfflineEnvelopeVerifier;
    readonly registry: OfflineTrustStatusResolver;
    readonly now: number;
    readonly clockSkewSeconds?: number;
    readonly maxLifetimeSeconds?: number;
    readonly replay?: OfflineReplayBoundary;
  },
): Promise<OfflineVerificationResult> {
  let envelope: OfflineEnvelope;
  try {
    envelope =
      typeof input === 'string' || input instanceof Uint8Array
        ? parseOfflineEnvelope(input)
        : parseOfflineEnvelope(base64Encode(canonical(input)));
  } catch (error) {
    if (error instanceof OfflineVerificationError)
      return { result: 'rejected', code: error.code };
    return { result: 'rejected', code: 'MALFORMED_ENVELOPE' };
  }
  const unsigned = parseUnsignedEnvelope(
    Object.fromEntries(
      Object.entries(envelope).filter(([key]) => key !== 'signature'),
    ),
  );
  let validSignature = false;
  try {
    validSignature = await options.verifier.verify({
      issuerId: envelope.issuerId,
      keyId: envelope.keyId,
      payload: offlineEnvelopeSigningPayload(unsigned),
      signature: envelope.signature,
    });
  } catch {
    return result(envelope, 'rejected', 'SIGNATURE_UNAVAILABLE');
  }
  if (!validSignature) return result(envelope, 'rejected', 'SIGNATURE_INVALID');

  const freshness = evaluateOfflineFreshness(envelope, {
    now: options.now,
    clockSkewSeconds: options.clockSkewSeconds,
    maxLifetimeSeconds: options.maxLifetimeSeconds,
  });
  if (!freshness.fresh) {
    return result(
      envelope,
      'indeterminate',
      freshness.code === 'FRESHNESS_EXPIRED'
        ? 'FRESHNESS_EXPIRED'
        : freshness.code === 'FRESHNESS_NOT_YET_VALID'
          ? 'FRESHNESS_NOT_YET_VALID'
          : 'FRESHNESS_LIFETIME_EXCEEDED',
    );
  }

  let decision: OfflineRegistryDecision;
  try {
    decision = await options.registry.evaluateCredential({ ...unsigned, now: options.now });
  } catch {
    return result(envelope, 'indeterminate', 'CACHE_INVALID');
  }
  if (decision.decision === 'indeterminate') {
    const code: OfflineVerificationCode =
      decision.code.includes('STALE') || decision.code.includes('EXPIRED')
        ? 'CACHE_STALE'
        : decision.code.includes('UNKNOWN')
          ? decision.code.includes('STATUS')
            ? 'STATUS_UNKNOWN'
            : 'TRUST_UNKNOWN'
          : 'CACHE_INVALID';
    return result(envelope, 'indeterminate', code, decision);
  }
  if (decision.decision === 'rejected') {
    const code: OfflineVerificationCode = decision.code.includes('STATUS') || decision.code.includes('CREDENTIAL')
      ? 'STATUS_REJECTED'
      : 'TRUST_REJECTED';
    return result(envelope, 'rejected', code, decision);
  }
  if (options.replay && !options.replay.consume(`${envelope.envelopeId}:${envelope.nonce}`, options.now))
    return result(envelope, 'rejected', 'REPLAY_DETECTED', decision);
  return result(envelope, 'verified', 'VERIFIED', decision);
}

export type OfflineSnapshot = {
  readonly schemaVersion: 1;
  readonly snapshotId: string;
  readonly tenantId: string;
  readonly jurisdiction: string;
  readonly sequence: number;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly signingKeyId: string;
  readonly issuers: readonly {
    readonly issuerId: string;
    readonly status: 'active' | 'suspended' | 'revoked';
    readonly schemas: readonly {
      readonly schemaId: string;
      readonly status: 'active' | 'suspended' | 'revoked';
    }[];
    readonly keys: readonly {
      readonly keyId: string;
      readonly status: 'active' | 'retired' | 'revoked';
      readonly authorizedFrom: number;
      readonly authorizedUntil?: number;
    }[];
  }[];
  readonly statuses: readonly {
    readonly issuerId: string;
    readonly statusId: string;
    readonly status: 'valid' | 'suspended' | 'revoked';
  }[];
  readonly signature: string;
};

export interface OfflineSnapshotVerifier {
  verify(input: {
    readonly keyId: string;
    readonly payload: string;
    readonly signature: string;
  }): Promise<boolean> | boolean;
}

const snapshotUnsigned = (snapshot: OfflineSnapshot): Record<string, unknown> => {
  const { signature: _signature, ...unsigned } = snapshot;
  return unsigned;
};

const snapshotPayload = (snapshot: OfflineSnapshot): string =>
  `ssw-offline-trust-snapshot-v1\n${canonical(snapshotUnsigned(snapshot))}`;

/**
 * A local-only trust/status cache.  It has no source/load method by design:
 * callers must explicitly prime a signed snapshot.  Once stale, it returns
 * indeterminate and never falls back to a network source.
 */
export class OfflineTrustStatusCache implements OfflineTrustStatusResolver {
  private snapshot?: OfflineSnapshot;

  constructor(
    private readonly verifier: OfflineSnapshotVerifier,
    private readonly clock: () => number = () => Math.floor(Date.now() / 1000),
  ) {}

  async prime(value: OfflineSnapshot): Promise<void> {
    const snapshot = parseOfflineSnapshot(value);
    let valid = false;
    try {
      valid = await this.verifier.verify({
        keyId: snapshot.signingKeyId,
        payload: snapshotPayload(snapshot),
        signature: snapshot.signature,
      });
    } catch {
      throw new OfflineVerificationError('CACHE_SIGNATURE_INVALID');
    }
    if (!valid) throw new OfflineVerificationError('CACHE_SIGNATURE_INVALID');
    const now = this.clock();
    if (snapshot.issuedAt > now || snapshot.expiresAt <= now)
      throw new OfflineVerificationError('CACHE_STALE');
    if (this.snapshot && snapshot.sequence < this.snapshot.sequence)
      throw new OfflineVerificationError('CACHE_ROLLBACK');
    if (
      this.snapshot &&
      snapshot.sequence === this.snapshot.sequence &&
      (snapshot.snapshotId !== this.snapshot.snapshotId ||
        snapshot.signature !== this.snapshot.signature)
    )
      throw new OfflineVerificationError('CACHE_ROLLBACK');
    this.snapshot = snapshot;
  }

  evaluateCredential(input: OfflineCredentialLookup & { readonly now: number }): OfflineRegistryDecision {
    const snapshot = this.snapshot;
    if (!snapshot) return { decision: 'indeterminate', code: 'SNAPSHOT_MISSING' };
    if (snapshot.issuedAt > input.now || snapshot.expiresAt <= input.now)
      return {
        decision: 'indeterminate',
        code: 'SNAPSHOT_STALE',
        snapshotId: snapshot.snapshotId,
        snapshotExpiresAt: snapshot.expiresAt,
      };
    if (snapshot.tenantId !== input.tenantId || snapshot.jurisdiction !== input.jurisdiction)
      return { decision: 'indeterminate', code: 'SNAPSHOT_INVALID' };
    const issuer = snapshot.issuers.find((entry) => entry.issuerId === input.issuerId);
    if (!issuer) return { decision: 'indeterminate', code: 'ISSUER_UNKNOWN', snapshotId: snapshot.snapshotId, snapshotExpiresAt: snapshot.expiresAt };
    if (issuer.status !== 'active') return { decision: 'rejected', code: `ISSUER_${issuer.status.toUpperCase()}`, snapshotId: snapshot.snapshotId, snapshotExpiresAt: snapshot.expiresAt };
    const schema = issuer.schemas.find((entry) => entry.schemaId === input.schemaId);
    if (!schema) return { decision: 'indeterminate', code: 'SCHEMA_UNKNOWN', snapshotId: snapshot.snapshotId, snapshotExpiresAt: snapshot.expiresAt };
    if (schema.status !== 'active') return { decision: 'rejected', code: `SCHEMA_${schema.status.toUpperCase()}`, snapshotId: snapshot.snapshotId, snapshotExpiresAt: snapshot.expiresAt };
    const key = issuer.keys.find((entry) => entry.keyId === input.keyId);
    if (!key) return { decision: 'indeterminate', code: 'KEY_UNKNOWN', snapshotId: snapshot.snapshotId, snapshotExpiresAt: snapshot.expiresAt };
    if (key.status === 'revoked') return { decision: 'rejected', code: 'KEY_REVOKED', snapshotId: snapshot.snapshotId, snapshotExpiresAt: snapshot.expiresAt };
    if (input.issuedAt < key.authorizedFrom || (key.authorizedUntil !== undefined && input.issuedAt >= key.authorizedUntil))
      return { decision: 'rejected', code: 'KEY_NOT_AUTHORIZED_AT_ISSUANCE', snapshotId: snapshot.snapshotId, snapshotExpiresAt: snapshot.expiresAt };
    const status = snapshot.statuses.find((entry) => entry.issuerId === input.issuerId && entry.statusId === input.statusId);
    if (!status) return { decision: 'indeterminate', code: 'STATUS_UNKNOWN', snapshotId: snapshot.snapshotId, snapshotExpiresAt: snapshot.expiresAt };
    if (status.status !== 'valid') return { decision: 'rejected', code: `CREDENTIAL_${status.status.toUpperCase()}`, snapshotId: snapshot.snapshotId, snapshotExpiresAt: snapshot.expiresAt };
    return { decision: 'verified', code: 'CREDENTIAL_VERIFIED', snapshotId: snapshot.snapshotId, snapshotExpiresAt: snapshot.expiresAt };
  }
}

function parseOfflineSnapshot(value: OfflineSnapshot): OfflineSnapshot {
  if (!value || typeof value !== 'object') throw new OfflineVerificationError('CACHE_INVALID');
  const encoded = JSON.stringify(value);
  if (bytes(encoded) > MAX_OFFLINE_SNAPSHOT_BYTES) throw new OfflineVerificationError('PAYLOAD_TOO_LARGE');
  if (value.schemaVersion !== 1 || !value.snapshotId || !value.tenantId || !value.jurisdiction || !value.signingKeyId || !value.signature)
    throw new OfflineVerificationError('CACHE_INVALID');
  if (!Number.isSafeInteger(value.sequence) || value.sequence < 1 || !Number.isSafeInteger(value.issuedAt) || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= value.issuedAt)
    throw new OfflineVerificationError('CACHE_INVALID');
  return value;
}

export class InMemoryOfflineReplayBoundary implements OfflineReplayBoundary {
  private readonly consumed = new Set<string>();

  consume(token: string, _now: number): boolean {
    if (!token || this.consumed.has(token)) return false;
    this.consumed.add(token);
    return true;
  }
}
