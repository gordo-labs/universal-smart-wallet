import type {
  CredentialArtifact,
  CredentialFormat,
  CredentialFormatAdapter,
  CredentialInspection,
  FormatNeutralVerificationResult,
} from '@ssw/credential-formats';

export const SELF_ATTESTED_ASSURANCE = 'self_attested' as const;
export const SELF_ISSUED_CREDENTIAL_VERSION = 1 as const;
export const SELF_ISSUED_SIGNING_PURPOSE =
  'ssw:self-issued-credential:v1' as const;

export type IssuableCredentialFormat = Exclude<
  CredentialFormat,
  'jwt-vc-legacy'
>;
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface HolderBinding {
  readonly controller: string;
  readonly keyId: string;
}

export interface HolderKeyDescriptor extends HolderBinding {
  readonly algorithm: string;
  readonly status: 'active' | 'revoked';
}

export interface HolderSignRequest {
  readonly purpose: typeof SELF_ISSUED_SIGNING_PURPOSE;
  readonly controller: string;
  readonly keyId: string;
  readonly algorithm: string;
  readonly payload: Uint8Array;
}

export interface HolderSignature {
  readonly keyId: string;
  readonly algorithm: string;
  readonly signature: Uint8Array;
}

/**
 * Wallet-controlled signing boundary. Private key material never crosses it;
 * passkey, smart-account, secure-enclave, and test implementations remain
 * replaceable adapters.
 */
export interface HolderSignerPort {
  describeKey(keyId: string): Promise<HolderKeyDescriptor | undefined>;
  sign(request: HolderSignRequest): Promise<HolderSignature>;
  verify(
    request: HolderSignRequest & { readonly signature: Uint8Array },
  ): Promise<boolean>;
}

export interface SelfIssuedPayload<
  F extends IssuableCredentialFormat = IssuableCredentialFormat,
> {
  readonly schemaVersion: 1;
  readonly credentialId: string;
  readonly issuer: string;
  readonly subject: string;
  readonly assurance: typeof SELF_ATTESTED_ASSURANCE;
  readonly type: string;
  readonly format: F;
  readonly claims: Readonly<Record<string, JsonValue>>;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly holderBinding: HolderBinding;
}

export interface SelfIssuedCredential<
  F extends IssuableCredentialFormat = IssuableCredentialFormat,
> extends SelfIssuedPayload<F> {
  readonly holderProof: HolderSignature;
  readonly artifact: CredentialArtifact<F>;
}

export interface CreateSelfIssuedCredentialRequest<
  F extends IssuableCredentialFormat = IssuableCredentialFormat,
> {
  readonly credentialId: string;
  readonly holder: HolderBinding;
  /** Optional only so issuer-substitution attempts can fail explicitly. */
  readonly issuer?: string;
  /** Optional only so assurance-escalation attempts can fail explicitly. */
  readonly assurance?: typeof SELF_ATTESTED_ASSURANCE;
  readonly type: string;
  readonly format: F;
  readonly claims: Readonly<Record<string, JsonValue>>;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

export interface SelfIssuedFormatContext<
  F extends IssuableCredentialFormat = IssuableCredentialFormat,
> {
  readonly payload: SelfIssuedPayload<F>;
  readonly payloadBytes: Uint8Array;
  readonly holderProof: HolderSignature;
}

/**
 * Bridges the format-neutral self-issued domain to reviewed format-library
 * inputs. Implementations embed the supplied holder proof; they do not receive
 * wallet private keys from this package.
 */
export interface SelfIssuedFormatBinding<
  TIssue,
  TVerify,
  F extends IssuableCredentialFormat = IssuableCredentialFormat,
> {
  issueInput(context: SelfIssuedFormatContext<F>): TIssue;
  verifyInput(context: SelfIssuedFormatContext<F>): TVerify;
}

export type SelfIssuedCredentialFailureCode =
  | 'INVALID_REQUEST'
  | 'ASSURANCE_ESCALATION'
  | 'ISSUER_SUBSTITUTION'
  | 'HOLDER_KEY_DETACHED'
  | 'HOLDER_KEY_INACTIVE'
  | 'HOLDER_CONTROL_FAILED'
  | 'FORMAT_BINDING_FAILED'
  | 'FORMAT_ISSUANCE_FAILED'
  | 'FORMAT_VERIFICATION_FAILED';

export class SelfIssuedCredentialError extends Error {
  constructor(
    readonly code: SelfIssuedCredentialFailureCode,
    message = 'self-issued credential rejected',
  ) {
    super(message);
    this.name = 'SelfIssuedCredentialError';
  }
}

export type SelfIssuedVerificationResult<
  F extends IssuableCredentialFormat = IssuableCredentialFormat,
> =
  | {
      readonly status: 'verified';
      readonly assurance: typeof SELF_ATTESTED_ASSURANCE;
      readonly holderControlled: true;
      readonly formatResult: FormatNeutralVerificationResult<F>;
    }
  | {
      readonly status: 'rejected';
      readonly reasonCode: SelfIssuedCredentialFailureCode;
      readonly assurance: typeof SELF_ATTESTED_ASSURANCE;
      readonly holderControlled: false;
    };

export type InstitutionalAssurance =
  | 'institutional'
  | 'government'
  | 'qualified'
  | 'pid'
  | 'eaa'
  | 'qeaa';

export interface SelfIssuedAssurancePolicy {
  readonly kind: 'self_attested';
  readonly acceptedAssurance: readonly ['self_attested'];
}

export interface InstitutionalAssurancePolicy {
  readonly kind: 'institutional';
  readonly acceptedAssurance: readonly InstitutionalAssurance[];
}

export type SelfIssuedPolicy =
  | SelfIssuedAssurancePolicy
  | InstitutionalAssurancePolicy;

export type SelfIssuedPolicyDecision =
  | { readonly status: 'accepted'; readonly assurance: 'self_attested' }
  | {
      readonly status: 'rejected';
      readonly reasonCode:
        | 'INSTITUTIONAL_ASSURANCE_REQUIRED'
        | 'INVALID_SELF_ATTESTED_CREDENTIAL';
    };

const MAX_IDENTIFIER_LENGTH = 512;
const MAX_TYPE_LENGTH = 128;
const MAX_CLAIMS = 64;
const MAX_ARRAY_ITEMS = 64;
const MAX_JSON_DEPTH = 8;
const MAX_PAYLOAD_BYTES = 64 * 1024;
const RESERVED_CLAIMS = new Set([
  'assurance',
  'cnf',
  'credentialStatus',
  'holder',
  'holderBinding',
  'iss',
  'issuer',
  'proof',
  'sub',
  'subject',
]);

const fail = (
  code: SelfIssuedCredentialFailureCode,
  message?: string,
): never => {
  throw new SelfIssuedCredentialError(code, message);
};

function assertExactRecord(
  value: unknown,
  allowed: readonly string[],
  name: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('INVALID_REQUEST', `${name} must be an object`);
  for (const key of Object.keys(value as object))
    if (!allowed.includes(key))
      fail('INVALID_REQUEST', `${name} contains unknown field`);
}

function identifier(value: unknown, name: string): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_IDENTIFIER_LENGTH ||
    /\s/u.test(value)
  )
    fail('INVALID_REQUEST', `${name} is invalid`);
  return value as string;
}

function cloneJson(value: unknown, depth = 0): JsonValue {
  if (depth > MAX_JSON_DEPTH)
    fail('INVALID_REQUEST', 'claims exceed maximum depth');
  if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      fail('INVALID_REQUEST', 'claims require finite numbers');
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS)
      fail('INVALID_REQUEST', 'claim array exceeds size boundary');
    return value.map((item) => cloneJson(item, depth + 1));
  }
  if (!value || typeof value !== 'object')
    fail('INVALID_REQUEST', 'claims must be JSON values');
  const record = value as Record<string, unknown>;
  const entries = Object.entries(record);
  if (entries.length > MAX_CLAIMS)
    fail('INVALID_REQUEST', 'claims exceed size boundary');
  const cloned: Record<string, JsonValue> = {};
  for (const [key, child] of entries) {
    if (key.length === 0 || key.length > MAX_TYPE_LENGTH)
      fail('INVALID_REQUEST', 'claim name is invalid');
    cloned[key] = cloneJson(child, depth + 1);
  }
  return cloned;
}

function freezeJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    for (const child of value) freezeJson(child);
    return Object.freeze(value);
  }
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeJson(child);
    return Object.freeze(value);
  }
  return value;
}

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  const record = value as Readonly<Record<string, JsonValue>>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`;
}

function payloadBytes(payload: SelfIssuedPayload): Uint8Array {
  const bytes = new TextEncoder().encode(
    canonicalJson(payload as unknown as JsonValue),
  );
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PAYLOAD_BYTES)
    fail('INVALID_REQUEST', 'credential payload exceeds size boundary');
  return bytes;
}

function parseHolder(value: unknown): HolderBinding {
  assertExactRecord(value, ['controller', 'keyId'], 'holder binding');
  return Object.freeze({
    controller: identifier(value.controller, 'holder controller'),
    keyId: identifier(value.keyId, 'holder keyId'),
  });
}

function parsePayload<F extends IssuableCredentialFormat>(
  request: CreateSelfIssuedCredentialRequest<F>,
  expectedFormat: F,
): SelfIssuedPayload<F> {
  assertExactRecord(
    request,
    [
      'credentialId',
      'holder',
      'issuer',
      'assurance',
      'type',
      'format',
      'claims',
      'issuedAt',
      'expiresAt',
    ],
    'credential request',
  );
  const holder = parseHolder(request.holder);
  if (
    request.assurance !== undefined &&
    request.assurance !== SELF_ATTESTED_ASSURANCE
  )
    fail('ASSURANCE_ESCALATION');
  if (request.issuer !== undefined && request.issuer !== holder.controller)
    fail('ISSUER_SUBSTITUTION');
  if (request.format !== expectedFormat) fail('FORMAT_BINDING_FAILED');
  const type = identifier(request.type, 'credential type');
  if (type.length > MAX_TYPE_LENGTH)
    fail('INVALID_REQUEST', 'credential type is too long');
  if (
    !Number.isSafeInteger(request.issuedAt) ||
    !Number.isSafeInteger(request.expiresAt) ||
    request.issuedAt < 0 ||
    request.expiresAt <= request.issuedAt
  )
    fail('INVALID_REQUEST', 'credential lifetime is invalid');
  if (!request.claims || typeof request.claims !== 'object')
    fail('INVALID_REQUEST', 'claims must be an object');
  for (const key of Object.keys(request.claims))
    if (RESERVED_CLAIMS.has(key))
      fail('ASSURANCE_ESCALATION', 'reserved metadata cannot be a claim');
  const clonedClaims = cloneJson(request.claims);
  if (
    !clonedClaims ||
    typeof clonedClaims !== 'object' ||
    Array.isArray(clonedClaims)
  )
    fail('INVALID_REQUEST', 'claims must be an object');
  const claims = clonedClaims as Readonly<Record<string, JsonValue>>;
  freezeJson(claims);
  return Object.freeze({
    schemaVersion: SELF_ISSUED_CREDENTIAL_VERSION,
    credentialId: identifier(request.credentialId, 'credentialId'),
    issuer: holder.controller,
    subject: holder.controller,
    assurance: SELF_ATTESTED_ASSURANCE,
    type,
    format: request.format,
    claims,
    issuedAt: request.issuedAt,
    expiresAt: request.expiresAt,
    holderBinding: holder,
  });
}

function requestFromCredential<F extends IssuableCredentialFormat>(
  credential: SelfIssuedCredential<F>,
): CreateSelfIssuedCredentialRequest<F> {
  assertExactRecord(
    credential,
    [
      'schemaVersion',
      'credentialId',
      'issuer',
      'subject',
      'assurance',
      'type',
      'format',
      'claims',
      'issuedAt',
      'expiresAt',
      'holderBinding',
      'holderProof',
      'artifact',
    ],
    'self-issued credential',
  );
  if (credential.schemaVersion !== SELF_ISSUED_CREDENTIAL_VERSION)
    fail('INVALID_REQUEST', 'unsupported self-issued credential version');
  if (credential.assurance !== SELF_ATTESTED_ASSURANCE)
    fail('ASSURANCE_ESCALATION');
  if (
    credential.issuer !== credential.holderBinding.controller ||
    credential.subject !== credential.holderBinding.controller
  )
    fail('ISSUER_SUBSTITUTION');
  return {
    credentialId: credential.credentialId,
    holder: credential.holderBinding,
    issuer: credential.issuer,
    assurance: credential.assurance,
    type: credential.type,
    format: credential.format,
    claims: credential.claims,
    issuedAt: credential.issuedAt,
    expiresAt: credential.expiresAt,
  };
}

function signature(value: HolderSignature): HolderSignature {
  assertExactRecord(value, ['keyId', 'algorithm', 'signature'], 'holder proof');
  identifier(value.keyId, 'holder proof keyId');
  identifier(value.algorithm, 'holder proof algorithm');
  if (
    !(value.signature instanceof Uint8Array) ||
    value.signature.byteLength === 0
  )
    fail('HOLDER_CONTROL_FAILED');
  return Object.freeze({
    keyId: value.keyId,
    algorithm: value.algorithm,
    signature: new Uint8Array(value.signature),
  });
}

function copyArtifact<F extends IssuableCredentialFormat>(
  artifact: CredentialArtifact<F>,
): CredentialArtifact<F> {
  return Object.freeze({
    ...artifact,
    value:
      typeof artifact.value === 'string'
        ? artifact.value
        : new Uint8Array(artifact.value),
  });
}

function assertInspection<F extends IssuableCredentialFormat>(
  inspection: CredentialInspection<F>,
  payload: SelfIssuedPayload<F>,
  key: HolderKeyDescriptor,
): void {
  if (
    inspection.format !== payload.format ||
    inspection.kind !== 'credential' ||
    inspection.issuer !== payload.issuer ||
    (inspection.subject !== undefined &&
      inspection.subject !== payload.subject) ||
    !inspection.holderBound ||
    inspection.keyId !== key.keyId ||
    inspection.algorithm !== key.algorithm
  )
    fail('FORMAT_BINDING_FAILED');
}

export class SelfIssuedCredentialService<
  TIssue,
  TVerify,
  F extends IssuableCredentialFormat,
> {
  constructor(
    private readonly adapter: CredentialFormatAdapter<
      TIssue,
      unknown,
      TVerify,
      F
    >,
    private readonly signer: HolderSignerPort,
    private readonly formatBinding: SelfIssuedFormatBinding<TIssue, TVerify, F>,
  ) {
    if (!adapter.descriptor.canIssue)
      fail('FORMAT_BINDING_FAILED', 'credential format is verify-only');
  }

  async create(
    request: CreateSelfIssuedCredentialRequest<F>,
  ): Promise<SelfIssuedCredential<F>> {
    const payload = parsePayload(request, this.adapter.descriptor.format);
    const key = await this.requireControlledKey(payload.holderBinding);
    const bytes = payloadBytes(payload);
    const signRequest = this.signRequest(payload, key, bytes);
    const proof = signature(await this.signer.sign(signRequest));
    if (proof.keyId !== key.keyId || proof.algorithm !== key.algorithm)
      fail('HOLDER_KEY_DETACHED');
    if (
      !(await this.signer.verify({
        ...signRequest,
        signature: proof.signature,
      }))
    )
      fail('HOLDER_CONTROL_FAILED');
    const context = { payload, payloadBytes: bytes, holderProof: proof };
    let artifact: CredentialArtifact<F>;
    try {
      artifact = await this.adapter.issue({
        expectedFormat: this.adapter.descriptor.format,
        expectedProfile: this.adapter.descriptor.profile,
        expectedVersion: this.adapter.descriptor.version,
        input: this.formatBinding.issueInput(context),
      });
    } catch {
      return fail('FORMAT_ISSUANCE_FAILED');
    }
    const inspection = await this.inspect(artifact);
    assertInspection(inspection, payload, key);
    return Object.freeze({
      ...payload,
      holderProof: proof,
      artifact: copyArtifact(artifact),
    });
  }

  async verify(
    credential: SelfIssuedCredential<F>,
  ): Promise<SelfIssuedVerificationResult<F>> {
    try {
      const payload = parsePayload(
        requestFromCredential(credential),
        this.adapter.descriptor.format,
      );
      if (
        credential.artifact.format !== payload.format ||
        credential.artifact.kind !== 'credential'
      )
        fail('FORMAT_BINDING_FAILED');
      const proof = signature(credential.holderProof);
      const key = await this.requireControlledKey(payload.holderBinding);
      if (proof.keyId !== key.keyId || proof.algorithm !== key.algorithm)
        fail('HOLDER_KEY_DETACHED');
      const bytes = payloadBytes(payload);
      const signRequest = this.signRequest(payload, key, bytes);
      if (
        !(await this.signer.verify({
          ...signRequest,
          signature: proof.signature,
        }))
      )
        fail('HOLDER_CONTROL_FAILED');
      assertInspection(await this.inspect(credential.artifact), payload, key);
      const context = { payload, payloadBytes: bytes, holderProof: proof };
      const formatResult = await this.adapter.verify({
        expectedFormat: this.adapter.descriptor.format,
        expectedProfile: this.adapter.descriptor.profile,
        expectedVersion: this.adapter.descriptor.version,
        presentation: credential.artifact,
        input: this.formatBinding.verifyInput(context),
      });
      if (
        formatResult.status !== 'verified' ||
        formatResult.issuer !== payload.issuer ||
        (formatResult.subject !== undefined &&
          formatResult.subject !== payload.subject) ||
        !formatResult.holderBound ||
        !formatResult.credentialTypes.includes(payload.type) ||
        canonicalJson(cloneJson(formatResult.claims)) !==
          canonicalJson(payload.claims)
      )
        fail('FORMAT_VERIFICATION_FAILED');
      return {
        status: 'verified',
        assurance: SELF_ATTESTED_ASSURANCE,
        holderControlled: true,
        formatResult,
      };
    } catch (error) {
      return {
        status: 'rejected',
        reasonCode:
          error instanceof SelfIssuedCredentialError
            ? error.code
            : 'FORMAT_VERIFICATION_FAILED',
        assurance: SELF_ATTESTED_ASSURANCE,
        holderControlled: false,
      };
    }
  }

  private async inspect(
    artifact: CredentialArtifact<F>,
  ): Promise<CredentialInspection<F>> {
    try {
      return await this.adapter.inspect({
        expectedFormat: this.adapter.descriptor.format,
        expectedProfile: this.adapter.descriptor.profile,
        expectedVersion: this.adapter.descriptor.version,
        artifact,
      });
    } catch {
      return fail('FORMAT_BINDING_FAILED');
    }
  }

  private async requireControlledKey(
    holder: HolderBinding,
  ): Promise<HolderKeyDescriptor> {
    const key = await this.signer.describeKey(holder.keyId);
    if (
      !key ||
      key.keyId !== holder.keyId ||
      key.controller !== holder.controller
    )
      return fail('HOLDER_KEY_DETACHED');
    if (key.status !== 'active') return fail('HOLDER_KEY_INACTIVE');
    if (!this.adapter.descriptor.algorithms.includes(key.algorithm))
      return fail('FORMAT_BINDING_FAILED');
    return key;
  }

  private signRequest(
    payload: SelfIssuedPayload<F>,
    key: HolderKeyDescriptor,
    bytes: Uint8Array,
  ): HolderSignRequest {
    return {
      purpose: SELF_ISSUED_SIGNING_PURPOSE,
      controller: payload.holderBinding.controller,
      keyId: key.keyId,
      algorithm: key.algorithm,
      payload: new Uint8Array(bytes),
    };
  }
}

/** Institutional policies always reject this credential class by construction. */
export function evaluateSelfIssuedPolicy(
  verification: SelfIssuedVerificationResult,
  policy: SelfIssuedPolicy,
): SelfIssuedPolicyDecision {
  if (
    verification.status !== 'verified' ||
    verification.assurance !== SELF_ATTESTED_ASSURANCE ||
    !verification.holderControlled
  )
    return {
      status: 'rejected',
      reasonCode: 'INVALID_SELF_ATTESTED_CREDENTIAL',
    };
  if (policy.kind === 'institutional')
    return {
      status: 'rejected',
      reasonCode: 'INSTITUTIONAL_ASSURANCE_REQUIRED',
    };
  return { status: 'accepted', assurance: SELF_ATTESTED_ASSURANCE };
}
