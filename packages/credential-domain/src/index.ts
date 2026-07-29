/** Dependency-free domain ports for presentation challenges and replay safety. */

export interface CredentialDomainPort {
  readonly kind: 'credential-domain';
}
export const credentialDomainPort: CredentialDomainPort = {
  kind: 'credential-domain',
};

/**
 * A deliberately small, versioned bridge from an off-chain verification
 * result to an on-chain access decision.  `subject` is a nullifier-style
 * binding; it must never contain a DID, credential, or claim value.
 */
export const ONCHAIN_ATTESTATION_VERSION = 1 as const;
export type Hex = `0x${string}`;
export type OnChainAttestation = {
  readonly version: 1;
  readonly chainId: number;
  readonly consumer: Hex;
  readonly policy: Hex;
  readonly subject: Hex;
  readonly nonce: Hex;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly attestor: Hex;
  readonly attestorVersion: Hex;
  readonly signature: Hex;
};

export type AttestationSigner = (input: {
  readonly digest: Hex;
  readonly attestation: Omit<OnChainAttestation, 'signature'>;
}) => Promise<Hex> | Hex;
export type AttestationVerifier = (input: {
  readonly digest: Hex;
  readonly signature: Hex;
  readonly attestor: Hex;
}) => Promise<boolean> | boolean;

const hex32 = (value: string, name: string): Hex => {
  if (!/^0x[0-9a-fA-F]{64}$/u.test(value))
    throw new Error(`${name} must be bytes32`);
  return value as Hex;
};
const address = (value: string, name: string): Hex => {
  if (!/^0x[0-9a-fA-F]{40}$/u.test(value) || /^0x0+$/u.test(value))
    throw new Error(`${name} must be a non-zero address`);
  return value as Hex;
};

/** Canonical field ordering shared by signer implementations and Solidity. */
export function attestationSigningPayload(
  value: Omit<OnChainAttestation, 'signature'>,
): string {
  validateAttestation(value);
  return [
    'ssw-onchain-attestation-v1',
    value.version,
    value.chainId,
    value.consumer.toLowerCase(),
    value.policy.toLowerCase(),
    value.subject.toLowerCase(),
    value.nonce.toLowerCase(),
    value.issuedAt,
    value.expiresAt,
    value.attestor.toLowerCase(),
    value.attestorVersion.toLowerCase(),
  ].join('|');
}

/** Structural and privacy boundary; cryptographic verification is delegated. */
export function validateAttestation(
  value: Omit<OnChainAttestation, 'signature'> | OnChainAttestation,
): void {
  if (value.version !== ONCHAIN_ATTESTATION_VERSION)
    throw new Error('unsupported attestation version');
  if (!Number.isSafeInteger(value.chainId) || value.chainId <= 0)
    throw new Error('invalid chain id');
  address(value.consumer, 'consumer');
  hex32(value.policy, 'policy');
  hex32(value.subject, 'subject');
  hex32(value.nonce, 'nonce');
  if (
    !Number.isSafeInteger(value.issuedAt) ||
    !Number.isSafeInteger(value.expiresAt) ||
    value.expiresAt <= value.issuedAt
  )
    throw new Error('invalid attestation lifetime');
  address(value.attestor, 'attestor');
  hex32(value.attestorVersion, 'attestor version');
  if ('signature' in value && !/^0x[0-9a-fA-F]{130}$/u.test(value.signature))
    throw new Error('signature must be 65 bytes');
}

export async function signAttestation(
  value: Omit<OnChainAttestation, 'signature'>,
  signer: AttestationSigner,
  hash: (payload: string) => Hex,
): Promise<OnChainAttestation> {
  validateAttestation(value);
  const digest = hash(attestationSigningPayload(value));
  const signature = await signer({ digest, attestation: value });
  const result = { ...value, signature };
  validateAttestation(result);
  return result;
}

export async function verifyAttestation(
  value: OnChainAttestation,
  verifier: AttestationVerifier,
  hash: (payload: string) => Hex,
  now = Date.now(),
): Promise<boolean> {
  validateAttestation(value);
  if (now < value.issuedAt || now >= value.expiresAt) return false;
  return verifier({
    digest: hash(attestationSigningPayload(value)),
    signature: value.signature,
    attestor: value.attestor,
  });
}

export interface ClockPort {
  now(): number;
}
export interface RandomPort {
  randomBytes(length: number): Uint8Array;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const base64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
};
const fromBase64Url = (value: string): Uint8Array => {
  if (!/^[A-Za-z0-9_-]+$/u.test(value))
    throw new Error('invalid challenge encoding');
  const padded =
    value.replaceAll('-', '+').replaceAll('_', '/') +
    '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

export const defaultRandomPort: RandomPort = {
  randomBytes(length) {
    if (!Number.isInteger(length) || length < 16)
      throw new Error('challenge entropy must be at least 128 bits');
    const bytes = new Uint8Array(length);
    if (!globalThis.crypto?.getRandomValues)
      throw new Error('secure randomness unavailable');
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  },
};
export const systemClock: ClockPort = { now: () => Date.now() };

export const MIN_CHALLENGE_BYTES = 16;
export const DEFAULT_CHALLENGE_BYTES = 32;
export const MIN_TTL_MS = 1_000;
export const MAX_TTL_MS = 5 * 60_000;
export const CLOCK_SKEW_MS = 30_000;

export interface PresentationChallenge {
  readonly value: string;
  readonly audience: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

export class ChallengePolicyError extends Error {
  readonly code = 'CHALLENGE_POLICY_INVALID' as const;
  constructor(message: string) {
    super(message);
    this.name = 'ChallengePolicyError';
  }
}

export function createChallenge(
  audience: string,
  options: {
    readonly ttlMs?: number;
    readonly clock?: ClockPort;
    readonly random?: RandomPort;
    readonly bytes?: number;
  } = {},
): PresentationChallenge {
  if (!audience || audience.length > 256)
    throw new ChallengePolicyError('invalid audience');
  const ttlMs = options.ttlMs ?? 60_000;
  if (!Number.isInteger(ttlMs) || ttlMs < MIN_TTL_MS || ttlMs > MAX_TTL_MS)
    throw new ChallengePolicyError('ttl outside bounded policy');
  const bytes = options.bytes ?? DEFAULT_CHALLENGE_BYTES;
  if (!Number.isInteger(bytes) || bytes < MIN_CHALLENGE_BYTES)
    throw new ChallengePolicyError(
      'challenge entropy must be at least 128 bits',
    );
  const issuedAt = (options.clock ?? systemClock).now();
  const generated = (options.random ?? defaultRandomPort).randomBytes(bytes);
  if (
    !(generated instanceof Uint8Array) ||
    generated.byteLength < MIN_CHALLENGE_BYTES
  )
    throw new ChallengePolicyError('random port returned insufficient entropy');
  return {
    value: base64Url(generated),
    audience,
    issuedAt,
    expiresAt: issuedAt + ttlMs,
  };
}

export type ReplayFailureCode =
  | 'CHALLENGE_EXPIRED'
  | 'CHALLENGE_WRONG_AUDIENCE'
  | 'CHALLENGE_UNKNOWN'
  | 'CHALLENGE_REUSED'
  | 'REPLAY_STORE_FAILURE';
export type VerificationFailureCode = ReplayFailureCode;
export interface ReplayConsumeRequest {
  readonly value: string;
  readonly audience: string;
  readonly now?: number;
}
export interface ReplayStore {
  issue(challenge: PresentationChallenge): void;
  consume(request: ReplayConsumeRequest): ReplayFailureCode | null;
}

interface StoredChallenge extends PresentationChallenge {
  consumed: boolean;
}
export class InMemoryReplayStore implements ReplayStore {
  private readonly entries = new Map<string, StoredChallenge>();
  issue(challenge: PresentationChallenge): void {
    // Replacing an existing value is safe only for a fresh challenge; random collisions are not accepted.
    if (this.entries.has(challenge.value))
      throw new Error('challenge collision');
    this.entries.set(challenge.value, { ...challenge, consumed: false });
  }
  consume(request: ReplayConsumeRequest): ReplayFailureCode | null {
    const entry = this.entries.get(request.value);
    if (!entry) return 'CHALLENGE_UNKNOWN';
    if (entry.consumed) return 'CHALLENGE_REUSED';
    const now = request.now ?? Date.now();
    if (now > entry.expiresAt + CLOCK_SKEW_MS) {
      entry.consumed = true;
      return 'CHALLENGE_EXPIRED';
    }
    if (entry.audience !== request.audience) {
      entry.consumed = true;
      return 'CHALLENGE_WRONG_AUDIENCE';
    }
    // Mark before returning: this synchronous critical section is atomic in the JS runtime.
    entry.consumed = true;
    return null;
  }
  size(): number {
    return this.entries.size;
  }
}

export class ReplayStoreError extends Error {
  readonly code = 'REPLAY_STORE_FAILURE' as const;
  constructor() {
    super('replay protection unavailable');
    this.name = 'ReplayStoreError';
  }
}

export interface VerificationSuccess {
  readonly ok: true;
  readonly challenge: PresentationChallenge;
}
export interface VerificationFailure {
  readonly ok: false;
  readonly code: VerificationFailureCode;
}
export type ChallengeVerification = VerificationSuccess | VerificationFailure;

export function verifyChallenge(
  store: ReplayStore,
  request: ReplayConsumeRequest,
  challenge: PresentationChallenge,
): ChallengeVerification {
  if (request.value !== challenge.value)
    return { ok: false, code: 'CHALLENGE_UNKNOWN' };
  try {
    const failure = store.consume(request);
    return failure ? { ok: false, code: failure } : { ok: true, challenge };
  } catch {
    // Storage errors fail closed and deliberately do not include token material.
    return { ok: false, code: 'REPLAY_STORE_FAILURE' };
  }
}

export function encodeChallenge(challenge: PresentationChallenge): string {
  return base64Url(textEncoder.encode(JSON.stringify(challenge)));
}
export function decodeChallenge(value: string): PresentationChallenge {
  const parsed: unknown = JSON.parse(textDecoder.decode(fromBase64Url(value)));
  if (!parsed || typeof parsed !== 'object')
    throw new ChallengePolicyError('invalid challenge');
  const candidate = parsed as Record<string, unknown>;
  if (
    typeof candidate.value !== 'string' ||
    typeof candidate.audience !== 'string' ||
    typeof candidate.issuedAt !== 'number' ||
    typeof candidate.expiresAt !== 'number'
  )
    throw new ChallengePolicyError('invalid challenge');
  if (fromBase64Url(candidate.value).byteLength < MIN_CHALLENGE_BYTES)
    throw new ChallengePolicyError('challenge entropy below minimum');
  return {
    value: candidate.value,
    audience: candidate.audience,
    issuedAt: candidate.issuedAt,
    expiresAt: candidate.expiresAt,
  };
}

/** Versioned local issuer trust and credential-status boundary. */
export type TrustDecisionCode =
  | 'trusted'
  | 'unknown_issuer'
  | 'untrusted_key'
  | 'unsupported_version';

export interface TrustedIssuer {
  readonly issuer: string;
  readonly keyIds: readonly string[];
  readonly statusListOrigins?: readonly string[];
}

export interface TrustBundle {
  readonly version: number;
  readonly generatedAt: number;
  readonly expiresAt: number;
  readonly issuers: readonly TrustedIssuer[];
}

export interface TrustPolicy {
  readonly supportedBundleVersions?: readonly number[];
  readonly now?: () => number;
}

export function evaluateIssuerTrust(
  bundle: TrustBundle,
  issuer: string,
  keyId: string,
  policy: TrustPolicy = {},
): { readonly ok: boolean; readonly code: TrustDecisionCode } {
  const versions = policy.supportedBundleVersions ?? [1];
  if (!versions.includes(bundle.version))
    return { ok: false, code: 'unsupported_version' };
  const now = policy.now?.() ?? Date.now();
  if (bundle.expiresAt <= now) return { ok: false, code: 'unknown_issuer' };
  const trusted = bundle.issuers.find((entry) => entry.issuer === issuer);
  if (!trusted) return { ok: false, code: 'unknown_issuer' };
  if (!trusted.keyIds.includes(keyId))
    return { ok: false, code: 'untrusted_key' };
  return { ok: true, code: 'trusted' };
}

export type CredentialStatus = 'valid' | 'revoked' | 'suspended';
export type StatusDecisionCode =
  | 'valid'
  | 'revoked'
  | 'suspended'
  | 'stale'
  | 'unavailable'
  | 'invalid_response'
  | 'ssrf_blocked';

export interface StatusRecord {
  readonly status: CredentialStatus;
  readonly expiresAt: number;
  /** Opaque status-list index; never a holder identifier. */
  readonly index?: number;
}

export interface StatusTransportResponse {
  readonly status: number;
  readonly body: string;
}
export type StatusTransport = (
  url: string,
  init?: RequestInit,
) => Promise<StatusTransportResponse>;

export interface StatusLookupResult {
  readonly ok: boolean;
  readonly code: StatusDecisionCode;
  readonly status?: CredentialStatus;
  readonly cached: boolean;
}

const isPrivateHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1')
    return true;
  if (/^127\./u.test(host) || /^10\./u.test(host) || /^192\.168\./u.test(host))
    return true;
  const match = host.match(/^172\.(\d{1,3})\./u);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
};

const boundedStatusUrl = (value: string): URL => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('ssrf_blocked');
  }
  if (url.protocol !== 'https:' || isPrivateHost(url.hostname))
    throw new Error('ssrf_blocked');
  return url;
};

/** Bounded status cache. Cache keys are status URLs, never holder or credential IDs. */
export class StatusCache {
  private readonly entries = new Map<
    string,
    { record: StatusRecord; fetchedAt: number }
  >();
  constructor(
    private readonly transport: StatusTransport,
    private readonly options: {
      readonly maxResponseBytes?: number;
      readonly timeoutMs?: number;
      readonly clock?: () => number;
    } = {},
  ) {}

  async lookup(urlValue: string): Promise<StatusLookupResult> {
    let url: URL;
    try {
      url = boundedStatusUrl(urlValue);
    } catch {
      return { ok: false, code: 'ssrf_blocked', cached: false };
    }
    const key = url.toString();
    const now = this.options.clock?.() ?? Date.now();
    const cached = this.entries.get(key);
    if (cached && cached.record.expiresAt > now)
      return {
        ok: cached.record.status === 'valid',
        code: cached.record.status,
        status: cached.record.status,
        cached: true,
      };
    try {
      const timeoutMs = this.options.timeoutMs ?? 5_000;
      const response = await Promise.race([
        this.transport(key, { method: 'GET' }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeoutMs),
        ),
      ]);
      if (response.status < 200 || response.status >= 300)
        throw new Error('unavailable');
      if (response.body.length > (this.options.maxResponseBytes ?? 32_768))
        throw new Error('invalid_response');
      const parsed = JSON.parse(response.body) as Partial<StatusRecord>;
      if (
        !['valid', 'revoked', 'suspended'].includes(parsed.status ?? '') ||
        !Number.isFinite(parsed.expiresAt)
      )
        throw new Error('invalid_response');
      const record = {
        status: parsed.status as CredentialStatus,
        expiresAt: parsed.expiresAt as number,
        ...(typeof parsed.index === 'number' ? { index: parsed.index } : {}),
      };
      this.entries.set(key, { record, fetchedAt: now });
      return {
        ok: record.status === 'valid',
        code: record.status,
        status: record.status,
        cached: false,
      };
    } catch (error) {
      if (cached)
        return {
          ok: false,
          code: 'stale',
          status: cached.record.status,
          cached: true,
        };
      return { ok: false, code: 'unavailable', cached: false };
    }
  }
}
