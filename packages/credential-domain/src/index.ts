/** Dependency-free domain ports for presentation challenges and replay safety. */

export interface CredentialDomainPort {
  readonly kind: 'credential-domain';
}
export const credentialDomainPort: CredentialDomainPort = { kind: 'credential-domain' };

export interface ClockPort { now(): number; }
export interface RandomPort { randomBytes(length: number): Uint8Array; }

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const base64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
};
const fromBase64Url = (value: string): Uint8Array => {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('invalid challenge encoding');
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

export const defaultRandomPort: RandomPort = {
  randomBytes(length) {
    if (!Number.isInteger(length) || length < 16) throw new Error('challenge entropy must be at least 128 bits');
    const bytes = new Uint8Array(length);
    if (!globalThis.crypto?.getRandomValues) throw new Error('secure randomness unavailable');
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
  constructor(message: string) { super(message); this.name = 'ChallengePolicyError'; }
}

export function createChallenge(
  audience: string,
  options: { readonly ttlMs?: number; readonly clock?: ClockPort; readonly random?: RandomPort; readonly bytes?: number } = {},
): PresentationChallenge {
  if (!audience || audience.length > 256) throw new ChallengePolicyError('invalid audience');
  const ttlMs = options.ttlMs ?? 60_000;
  if (!Number.isInteger(ttlMs) || ttlMs < MIN_TTL_MS || ttlMs > MAX_TTL_MS) throw new ChallengePolicyError('ttl outside bounded policy');
  const bytes = options.bytes ?? DEFAULT_CHALLENGE_BYTES;
  if (!Number.isInteger(bytes) || bytes < MIN_CHALLENGE_BYTES) throw new ChallengePolicyError('challenge entropy must be at least 128 bits');
  const issuedAt = (options.clock ?? systemClock).now();
  const generated = (options.random ?? defaultRandomPort).randomBytes(bytes);
  if (!(generated instanceof Uint8Array) || generated.byteLength < MIN_CHALLENGE_BYTES) throw new ChallengePolicyError('random port returned insufficient entropy');
  return { value: base64Url(generated), audience, issuedAt, expiresAt: issuedAt + ttlMs };
}

export type ReplayFailureCode = 'CHALLENGE_EXPIRED' | 'CHALLENGE_WRONG_AUDIENCE' | 'CHALLENGE_UNKNOWN' | 'CHALLENGE_REUSED' | 'REPLAY_STORE_FAILURE';
export type VerificationFailureCode = ReplayFailureCode;
export interface ReplayConsumeRequest { readonly value: string; readonly audience: string; readonly now?: number; }
export interface ReplayStore {
  issue(challenge: PresentationChallenge): void;
  consume(request: ReplayConsumeRequest): ReplayFailureCode | null;
}

interface StoredChallenge extends PresentationChallenge { consumed: boolean; }
export class InMemoryReplayStore implements ReplayStore {
  private readonly entries = new Map<string, StoredChallenge>();
  issue(challenge: PresentationChallenge): void {
    // Replacing an existing value is safe only for a fresh challenge; random collisions are not accepted.
    if (this.entries.has(challenge.value)) throw new Error('challenge collision');
    this.entries.set(challenge.value, { ...challenge, consumed: false });
  }
  consume(request: ReplayConsumeRequest): ReplayFailureCode | null {
    const entry = this.entries.get(request.value);
    if (!entry) return 'CHALLENGE_UNKNOWN';
    if (entry.consumed) return 'CHALLENGE_REUSED';
    const now = request.now ?? Date.now();
    if (now > entry.expiresAt + CLOCK_SKEW_MS) { entry.consumed = true; return 'CHALLENGE_EXPIRED'; }
    if (entry.audience !== request.audience) { entry.consumed = true; return 'CHALLENGE_WRONG_AUDIENCE'; }
    // Mark before returning: this synchronous critical section is atomic in the JS runtime.
    entry.consumed = true;
    return null;
  }
  size(): number { return this.entries.size; }
}

export class ReplayStoreError extends Error {
  readonly code = 'REPLAY_STORE_FAILURE' as const;
  constructor() { super('replay protection unavailable'); this.name = 'ReplayStoreError'; }
}

export interface VerificationSuccess { readonly ok: true; readonly challenge: PresentationChallenge; }
export interface VerificationFailure { readonly ok: false; readonly code: VerificationFailureCode; }
export type ChallengeVerification = VerificationSuccess | VerificationFailure;

export function verifyChallenge(
  store: ReplayStore,
  request: ReplayConsumeRequest,
  challenge: PresentationChallenge,
): ChallengeVerification {
  if (request.value !== challenge.value) return { ok: false, code: 'CHALLENGE_UNKNOWN' };
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
  if (!parsed || typeof parsed !== 'object') throw new ChallengePolicyError('invalid challenge');
  const candidate = parsed as Record<string, unknown>;
  if (typeof candidate.value !== 'string' || typeof candidate.audience !== 'string' || typeof candidate.issuedAt !== 'number' || typeof candidate.expiresAt !== 'number') throw new ChallengePolicyError('invalid challenge');
  if (fromBase64Url(candidate.value).byteLength < MIN_CHALLENGE_BYTES) throw new ChallengePolicyError('challenge entropy below minimum');
  return { value: candidate.value, audience: candidate.audience, issuedAt: candidate.issuedAt, expiresAt: candidate.expiresAt };
}
