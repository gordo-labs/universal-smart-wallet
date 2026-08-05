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
  // Block loopback, RFC1918, link-local and carrier-grade NAT ranges. Status
  // endpoints are attacker-controlled input and must not be an SSRF primitive.
  if (
    /^127\./u.test(host) ||
    /^10\./u.test(host) ||
    /^192\.168\./u.test(host) ||
    /^169\.254\./u.test(host) ||
    /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./u.test(host)
  )
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
  if (
    url.protocol !== 'https:' ||
    isPrivateHost(url.hostname) ||
    url.username.length > 0 ||
    url.password.length > 0
  )
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
        typeof parsed.expiresAt !== 'number' ||
        !Number.isSafeInteger(parsed.expiresAt) ||
        parsed.expiresAt <= now
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
      if (error instanceof Error && error.message === 'invalid_response')
        return { ok: false, code: 'invalid_response', cached: false };
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

// Institutional credential domain v1. These objects contain metadata and
// policy only; raw evidence and credential values are intentionally absent.
export const IDENTITY_DOMAIN_VERSION = 1 as const;
export type AssuranceLevel =
  | 'self_attested'
  | 'institutional'
  | 'government'
  | 'qualified'
  | 'pid'
  | 'eaa'
  | 'qeaa';
export type CredentialFormat =
  | 'sd-jwt-vc'
  | 'iso-mdoc'
  | 'w3c-vc-di'
  | 'jwt-vc-legacy';
export type TemplateStatus = 'draft' | 'review' | 'published' | 'deprecated';
export type ClaimDefinition = {
  readonly name: string;
  readonly type: 'string' | 'boolean' | 'number' | 'date';
  readonly required: boolean;
  readonly selectivelyDisclosable: boolean;
};
export type CredentialTemplate = {
  readonly schemaVersion: 1;
  readonly tenantId: string;
  readonly templateId: string;
  readonly version: number;
  readonly type: string;
  readonly assurance: AssuranceLevel;
  readonly formats: readonly CredentialFormat[];
  readonly claims: readonly ClaimDefinition[];
  readonly status: TemplateStatus;
};
export type CredentialSchema = {
  readonly schemaVersion: 1;
  readonly tenantId: string;
  readonly schemaId: string;
  readonly templateId: string;
  readonly templateVersion: number;
  readonly digest: string;
};
export type IssuerProfile = {
  readonly schemaVersion: 1;
  readonly tenantId: string;
  readonly issuerId: string;
  readonly issuerUri: string;
  readonly assurance: Exclude<AssuranceLevel, 'self_attested'>;
  readonly keyRef: string;
  readonly authorizedTemplateIds: readonly string[];
};
export type SubjectBinding = {
  readonly schemaVersion: 1;
  readonly bindingId: string;
  readonly method: 'jwk-thumbprint' | 'did-pkh' | 'mdoc-device-key';
  readonly value: string;
};
export type IssuanceSession = {
  readonly schemaVersion: 1;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly templateId: string;
  readonly issuerId: string;
  readonly subjectBinding: SubjectBinding;
  readonly state:
    | 'pending_review'
    | 'approved'
    | 'offered'
    | 'issued'
    | 'rejected'
    | 'expired';
  readonly expiresAt: string;
};
export type VerificationPolicy = {
  readonly schemaVersion: 1;
  readonly tenantId: string;
  readonly policyId: string;
  readonly acceptedTemplateIds: readonly string[];
  readonly acceptedAssurance: readonly AssuranceLevel[];
  readonly requiredClaims: readonly string[];
  readonly maxStatusAgeSeconds: number;
};
export type VerificationSession = {
  readonly schemaVersion: 1;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly policyId: string;
  readonly nonce: string;
  readonly state: 'created' | 'requested' | 'consumed' | 'expired';
  readonly expiresAt: string;
};
export type VerificationReceipt = {
  readonly schemaVersion: 1;
  readonly tenantId: string;
  readonly receiptId: string;
  readonly policyId: string;
  readonly result: 'verified' | 'rejected' | 'indeterminate';
  readonly assurance?: AssuranceLevel;
  readonly reasonCode: string;
  readonly verifiedAt: string;
};

const assurance = new Set<AssuranceLevel>([
  'self_attested',
  'institutional',
  'government',
  'qualified',
  'pid',
  'eaa',
  'qeaa',
]);
const formats = new Set<CredentialFormat>([
  'sd-jwt-vc',
  'iso-mdoc',
  'w3c-vc-di',
  'jwt-vc-legacy',
]);
const opaqueIdentifier = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const piiLike = /@|\s|\+?[0-9][0-9 ()-]{7,}/u;
function assertOpaqueId(value: unknown, name: string): asserts value is string {
  if (
    typeof value !== 'string' ||
    !opaqueIdentifier.test(value) ||
    piiLike.test(value)
  )
    throw new Error(`${name} must be an opaque identifier`);
}
function assertStrictRecord(
  value: unknown,
  keys: readonly string[],
  name: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${name} must be an object`);
  for (const key of Object.keys(value))
    if (!keys.includes(key))
      throw new Error(`${name} contains unknown field ${key}`);
}
function assertHttps(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') throw new Error(`${name} must be https`);
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error(`${name} must be https`);
}
function freeze<T>(value: T): Readonly<T> {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>))
      freeze(child);
  }
  return value;
}

export function parseCredentialTemplate(value: unknown): CredentialTemplate {
  assertStrictRecord(
    value,
    [
      'schemaVersion',
      'tenantId',
      'templateId',
      'version',
      'type',
      'assurance',
      'formats',
      'claims',
      'status',
    ],
    'template',
  );
  if (value.schemaVersion !== IDENTITY_DOMAIN_VERSION)
    throw new Error('unsupported template schema version');
  assertOpaqueId(value.tenantId, 'tenantId');
  assertOpaqueId(value.templateId, 'templateId');
  assertOpaqueId(value.type, 'type');
  if (!Number.isSafeInteger(value.version) || Number(value.version) < 1)
    throw new Error('invalid template version');
  if (!assurance.has(value.assurance as AssuranceLevel))
    throw new Error('unknown assurance');
  if (
    !Array.isArray(value.formats) ||
    value.formats.length === 0 ||
    value.formats.some((item) => !formats.has(item as CredentialFormat))
  )
    throw new Error('unsupported credential format');
  if (value.formats.includes('jwt-vc-legacy'))
    throw new Error('legacy JWT-VC is verify-only');
  if (!Array.isArray(value.claims) || value.claims.length === 0)
    throw new Error('template requires claims');
  const names = new Set<string>();
  for (const item of value.claims) {
    assertStrictRecord(
      item,
      ['name', 'type', 'required', 'selectivelyDisclosable'],
      'claim',
    );
    assertOpaqueId(item.name, 'claim name');
    if (names.has(item.name)) throw new Error('duplicate claim');
    names.add(item.name);
    if (!['string', 'boolean', 'number', 'date'].includes(String(item.type)))
      throw new Error('unsupported claim type');
    if (
      typeof item.required !== 'boolean' ||
      typeof item.selectivelyDisclosable !== 'boolean'
    )
      throw new Error('invalid claim flags');
  }
  if (
    !['draft', 'review', 'published', 'deprecated'].includes(
      String(value.status),
    )
  )
    throw new Error('invalid template status');
  return freeze({
    ...value,
    formats: [...value.formats],
    claims: value.claims.map((item) => ({ ...item })),
  } as unknown as CredentialTemplate) as CredentialTemplate;
}

export function publishCredentialTemplate(
  value: CredentialTemplate,
): CredentialTemplate {
  const template = parseCredentialTemplate(value);
  if (template.status !== 'review')
    throw new Error('only reviewed templates can be published');
  return parseCredentialTemplate({ ...template, status: 'published' });
}
export function deprecateCredentialTemplate(
  value: CredentialTemplate,
): CredentialTemplate {
  const template = parseCredentialTemplate(value);
  if (template.status !== 'published')
    throw new Error('only published templates can be deprecated');
  return parseCredentialTemplate({ ...template, status: 'deprecated' });
}
export function assertSameTenant(
  left: { readonly tenantId: string },
  right: { readonly tenantId: string },
): void {
  assertOpaqueId(left.tenantId, 'tenantId');
  assertOpaqueId(right.tenantId, 'tenantId');
  if (left.tenantId !== right.tenantId)
    throw new Error('cross-tenant reference rejected');
}
export function assuranceAllowed(
  actual: AssuranceLevel,
  policy: VerificationPolicy,
): boolean {
  if (
    !assurance.has(actual) ||
    !policy.acceptedAssurance.every((item) => assurance.has(item))
  )
    return false;
  return policy.acceptedAssurance.includes(actual);
}
export function parseIssuerProfile(value: unknown): IssuerProfile {
  assertStrictRecord(
    value,
    [
      'schemaVersion',
      'tenantId',
      'issuerId',
      'issuerUri',
      'assurance',
      'keyRef',
      'authorizedTemplateIds',
    ],
    'issuer profile',
  );
  if (value.schemaVersion !== 1)
    throw new Error('unsupported issuer profile version');
  assertOpaqueId(value.tenantId, 'tenantId');
  assertOpaqueId(value.issuerId, 'issuerId');
  assertOpaqueId(value.keyRef, 'keyRef');
  assertHttps(value.issuerUri, 'issuerUri');
  if (
    value.assurance === 'self_attested' ||
    !assurance.has(value.assurance as AssuranceLevel)
  )
    throw new Error('institutional issuer requires institutional assurance');
  if (
    !Array.isArray(value.authorizedTemplateIds) ||
    value.authorizedTemplateIds.some((id) => {
      try {
        assertOpaqueId(id, 'templateId');
        return false;
      } catch {
        return true;
      }
    })
  )
    throw new Error('invalid authorized templates');
  return freeze({
    ...value,
    authorizedTemplateIds: [...value.authorizedTemplateIds],
  } as unknown as IssuerProfile) as IssuerProfile;
}
