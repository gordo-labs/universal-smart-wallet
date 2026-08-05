import {
  CREDENTIAL_FORMAT_PINS,
  type CredentialArtifact,
  type CredentialFormat,
  type FormatNeutralVerificationResult,
  type PinnedCredentialAdapterRegistry,
} from '@ssw/credential-formats';
import {
  OpenId4VpError,
  buildOpenId4VpRequest,
  verifyOpenId4VpDirectPost,
  type OpenId4VpRequest,
} from '@ssw/openid4vc';
import type {
  CredentialRegistryPort,
  RegistryDecision,
  RegistryDecisionCode,
} from '@ssw/trust-registry';

export const VERIFIER_SCHEMA_VERSION = 1 as const;
export type VerificationOutcome = 'verified' | 'rejected' | 'indeterminate';

export type ClaimRequirement = {
  readonly name: string;
  readonly equals?: string | number | boolean;
};

export type VerificationPolicy = {
  readonly schemaVersion: 1;
  readonly policyId: string;
  readonly tenantId: string;
  readonly jurisdiction: string;
  readonly format: CredentialFormat;
  readonly profile: string;
  readonly version: string;
  readonly schemaId: string;
  readonly credentialTypes: readonly string[];
  readonly requestedClaims: readonly ClaimRequirement[];
  readonly requireHolderBinding: boolean;
  readonly acceptedIssuers?: readonly string[];
};

export type PresentationMetadata = {
  /** These fields must be extracted from the signed/protected credential. */
  readonly issuerId: string;
  readonly schemaId: string;
  readonly keyId: string;
  readonly statusId: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
};

export type ResolvedPresentation = {
  readonly artifact: CredentialArtifact;
  readonly verificationInput: unknown;
  readonly disclosures: readonly string[];
  readonly metadata: PresentationMetadata;
};

/** Parses an opaque VP token without persisting it or logging its contents. */
export interface PresentationResolverPort {
  resolve(
    vpToken: string,
    expected: { readonly audience: string; readonly nonce: string },
  ): Promise<ResolvedPresentation>;
}

export type VerificationReceipt = {
  readonly schemaVersion: 1;
  readonly receiptId: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly policyId: string;
  readonly result: VerificationOutcome;
  readonly reasonCode: string;
  readonly verifiedAt: string;
  readonly checks: readonly string[];
  readonly snapshotId?: string;
  readonly snapshotExpiresAt?: number;
};

export type VerificationSession = {
  readonly schemaVersion: 1;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly policyId: string;
  readonly nonce: string;
  readonly state: string;
  readonly status: 'requested' | 'consumed' | 'expired';
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly request: OpenId4VpRequest;
  readonly receipt?: VerificationReceipt;
};

export interface VerificationSessionStorePort {
  create(session: VerificationSession): void;
  get(sessionId: string): VerificationSession | undefined;
  consume(sessionId: string, state: string, now: number): boolean;
  complete(sessionId: string, receipt: VerificationReceipt): void;
  getReceipt(receiptId: string): VerificationReceipt | undefined;
}

export class InMemoryVerificationSessionStore
  implements VerificationSessionStorePort
{
  private readonly sessions = new Map<string, VerificationSession>();
  private readonly receipts = new Map<string, VerificationReceipt>();

  create(session: VerificationSession): void {
    if (this.sessions.has(session.sessionId))
      throw new VerifierServiceError('SESSION_CONFLICT', 'session exists');
    this.sessions.set(session.sessionId, structuredClone(session));
  }

  get(sessionId: string): VerificationSession | undefined {
    const value = this.sessions.get(sessionId);
    return value ? structuredClone(value) : undefined;
  }

  consume(sessionId: string, state: string, now: number): boolean {
    const session = this.sessions.get(sessionId);
    if (
      !session ||
      session.state !== state ||
      session.status !== 'requested' ||
      Date.parse(session.expiresAt) <= now
    )
      return false;
    this.sessions.set(sessionId, { ...session, status: 'consumed' });
    return true;
  }

  complete(sessionId: string, receipt: VerificationReceipt): void {
    const session = this.sessions.get(sessionId);
    this.receipts.set(receipt.receiptId, structuredClone(receipt));
    if (!session || session.receipt || session.status !== 'consumed') return;
    this.sessions.set(sessionId, { ...session, receipt });
  }

  getReceipt(receiptId: string): VerificationReceipt | undefined {
    const value = this.receipts.get(receiptId);
    return value ? structuredClone(value) : undefined;
  }
}

export class VerifierServiceError extends Error {
  constructor(
    readonly code: string,
    message = code,
  ) {
    super(message);
    this.name = 'VerifierServiceError';
  }
}

export type CredentialVerifierServiceOptions = {
  readonly policies: readonly VerificationPolicy[];
  readonly formats: PinnedCredentialAdapterRegistry;
  readonly registry: CredentialRegistryPort;
  readonly presentations: PresentationResolverPort;
  readonly store?: VerificationSessionStorePort;
  readonly clientId: string;
  readonly responseUri: string;
  readonly sessionTtlSeconds?: number;
  readonly now?: () => number;
  readonly idFactory?: (
    kind: 'session' | 'state' | 'nonce' | 'receipt',
  ) => string;
};

const opaque = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const claim = /^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/u;
const safeId = (value: string, name: string): string => {
  if (!opaque.test(value))
    throw new VerifierServiceError('POLICY_INVALID', `${name} is invalid`);
  return value;
};

export function parseVerificationPolicy(
  value: VerificationPolicy,
): VerificationPolicy {
  if (!value || value.schemaVersion !== VERIFIER_SCHEMA_VERSION)
    throw new VerifierServiceError('POLICY_INVALID', 'unsupported policy');
  safeId(value.policyId, 'policyId');
  safeId(value.tenantId, 'tenantId');
  safeId(value.jurisdiction, 'jurisdiction');
  if (!(value.format in CREDENTIAL_FORMAT_PINS))
    throw new VerifierServiceError('POLICY_INVALID', 'format is unsupported');
  const pin = CREDENTIAL_FORMAT_PINS[value.format];
  if (value.profile !== pin.profile || value.version !== pin.version)
    throw new VerifierServiceError('POLICY_INVALID', 'format pin mismatch');
  if (!value.schemaId || value.schemaId.length > 512)
    throw new VerifierServiceError('POLICY_INVALID', 'schemaId is invalid');
  if (
    value.credentialTypes.length === 0 ||
    value.credentialTypes.length > 16 ||
    value.requestedClaims.length === 0 ||
    value.requestedClaims.length > 16
  )
    throw new VerifierServiceError('POLICY_INVALID', 'policy list is invalid');
  const names = value.requestedClaims.map((item) => item.name);
  if (
    names.some((name) => !claim.test(name)) ||
    new Set(names).size !== names.length
  )
    throw new VerifierServiceError('POLICY_INVALID', 'claims are invalid');
  if (value.acceptedIssuers?.length === 0)
    throw new VerifierServiceError(
      'POLICY_INVALID',
      'acceptedIssuers is empty',
    );
  return Object.freeze({
    ...value,
    credentialTypes: Object.freeze([...value.credentialTypes]),
    requestedClaims: Object.freeze(
      value.requestedClaims.map((item) => Object.freeze({ ...item })),
    ),
    ...(value.acceptedIssuers
      ? { acceptedIssuers: Object.freeze([...value.acceptedIssuers]) }
      : {}),
  });
}

const dcqlFormat = (format: CredentialFormat): string =>
  ({
    'sd-jwt-vc': 'dc+sd-jwt',
    'iso-mdoc': 'mso_mdoc',
    'w3c-vc-di': 'ldp_vc',
    'jwt-vc-legacy': 'jwt_vc_json',
  })[format];

export function policyToDcql(policy: VerificationPolicy): unknown {
  const parsed = parseVerificationPolicy(policy);
  return {
    credentials: [
      {
        id: parsed.policyId,
        format: dcqlFormat(parsed.format),
        meta: { credential_type_values: [...parsed.credentialTypes] },
        claims: parsed.requestedClaims.map(({ name, equals }) => ({
          path: name.split('.'),
          ...(equals === undefined ? {} : { values: [equals] }),
        })),
      },
    ],
  };
}

const defaultId = (kind: string): string =>
  `${kind}-${globalThis.crypto.randomUUID()}`;

export class CredentialVerifierService {
  private readonly policies = new Map<string, VerificationPolicy>();
  private readonly store: VerificationSessionStorePort;
  private readonly now: () => number;
  private readonly ttl: number;
  private readonly id: CredentialVerifierServiceOptions['idFactory'];

  constructor(private readonly options: CredentialVerifierServiceOptions) {
    if (!options.clientId || !options.responseUri)
      throw new VerifierServiceError('CONFIG_INVALID');
    for (const policy of options.policies) {
      const parsed = parseVerificationPolicy(policy);
      if (this.policies.has(parsed.policyId))
        throw new VerifierServiceError('POLICY_CONFLICT');
      this.policies.set(parsed.policyId, parsed);
    }
    this.store = options.store ?? new InMemoryVerificationSessionStore();
    this.now = options.now ?? (() => Date.now());
    this.ttl = options.sessionTtlSeconds ?? 300;
    if (!Number.isSafeInteger(this.ttl) || this.ttl < 30 || this.ttl > 900)
      throw new VerifierServiceError(
        'CONFIG_INVALID',
        'session TTL is invalid',
      );
    this.id = options.idFactory ?? defaultId;
  }

  createSession(policyId: string): VerificationSession {
    const policy = this.policies.get(policyId);
    if (!policy) throw new VerifierServiceError('POLICY_NOT_FOUND');
    const now = this.now();
    const sessionId = safeId(this.id!('session'), 'sessionId');
    const state = safeId(this.id!('state'), 'state');
    const nonce = safeId(this.id!('nonce'), 'nonce');
    const request = buildOpenId4VpRequest({
      clientId: this.options.clientId,
      responseUri: this.options.responseUri,
      nonce,
      state,
      dcqlQuery: policyToDcql(policy),
    });
    const session: VerificationSession = {
      schemaVersion: 1,
      sessionId,
      tenantId: policy.tenantId,
      policyId,
      nonce,
      state,
      status: 'requested',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.ttl * 1_000).toISOString(),
      request,
    };
    this.store.create(session);
    return session;
  }

  getSession(sessionId: string): VerificationSession | undefined {
    return this.store.get(sessionId);
  }

  getReceipt(receiptId: string): VerificationReceipt | undefined {
    return this.store.getReceipt(receiptId);
  }

  async verifyResponse(
    sessionId: string,
    body: string | URLSearchParams | Record<string, unknown>,
  ): Promise<VerificationReceipt> {
    const session = this.store.get(sessionId);
    if (!session) throw new VerifierServiceError('SESSION_NOT_FOUND');
    const policy = this.policies.get(session.policyId)!;
    if (Date.parse(session.expiresAt) <= this.now()) {
      return this.finish(session, 'rejected', 'SESSION_EXPIRED', []);
    }
    let evaluation:
      | {
          result: VerificationOutcome;
          code: string;
          checks: string[];
          registry?: RegistryDecision;
          claims?: Readonly<Record<string, unknown>>;
        }
      | undefined;
    try {
      await verifyOpenId4VpDirectPost({
        body,
        expected: session.request,
        consumeState: (state) =>
          this.store.consume(sessionId, state, this.now()),
        expectedDisclosures: policy.requestedClaims.map((item) => item.name),
        verifyVpToken: async (vpToken, expected) => {
          const resolved = await this.options.presentations.resolve(
            vpToken,
            expected,
          );
          evaluation = await this.evaluate(policy, resolved);
          return {
            disclosures: resolved.disclosures,
            claims:
              evaluation.result === 'verified'
                ? this.requestedClaims(
                    policy,
                    evaluationClaims(resolved, evaluation),
                  )
                : {},
          };
        },
      });
    } catch (error) {
      const mapped = this.mapProtocolError(error);
      return this.finish(session, mapped.result, mapped.code, mapped.checks);
    }
    if (!evaluation)
      return this.finish(session, 'rejected', 'PRESENTATION_INVALID', []);
    return this.finish(
      session,
      evaluation.result,
      evaluation.code,
      evaluation.checks,
      evaluation.registry,
    );
  }

  private async evaluate(
    policy: VerificationPolicy,
    input: ResolvedPresentation,
  ): Promise<{
    result: VerificationOutcome;
    code: string;
    checks: string[];
    registry?: RegistryDecision;
    claims?: Readonly<Record<string, unknown>>;
  }> {
    const checks: string[] = [];
    if (
      input.artifact.format !== policy.format ||
      input.artifact.profile !== policy.profile ||
      input.artifact.version !== policy.version ||
      input.artifact.kind !== 'presentation'
    )
      return { result: 'rejected', code: 'FORMAT_OR_PROFILE_MISMATCH', checks };
    const verified = await this.options.formats.verify({
      expectedFormat: policy.format,
      expectedProfile: policy.profile,
      expectedVersion: policy.version,
      presentation: input.artifact,
      input: input.verificationInput,
    });
    if (verified.status !== 'verified')
      return { result: 'rejected', code: verified.reasonCode, checks };
    checks.push('signature');
    if (!verified.issuer || verified.issuer !== input.metadata.issuerId)
      return { result: 'rejected', code: 'ISSUER_BINDING_MISMATCH', checks };
    if (
      policy.acceptedIssuers &&
      !policy.acceptedIssuers.includes(verified.issuer)
    )
      return { result: 'rejected', code: 'ISSUER_NOT_ACCEPTED', checks };
    if (input.metadata.schemaId !== policy.schemaId)
      return { result: 'rejected', code: 'SCHEMA_MISMATCH', checks };
    if (
      !policy.credentialTypes.some((type) =>
        verified.credentialTypes.includes(type),
      )
    )
      return { result: 'rejected', code: 'CREDENTIAL_TYPE_MISMATCH', checks };
    checks.push('schema');
    if (policy.requireHolderBinding && !verified.holderBound)
      return { result: 'rejected', code: 'HOLDER_BINDING_REQUIRED', checks };
    checks.push('holder_binding');
    const now = Math.floor(this.now() / 1_000);
    if (
      !Number.isSafeInteger(input.metadata.issuedAt) ||
      !Number.isSafeInteger(input.metadata.expiresAt) ||
      input.metadata.issuedAt > now ||
      input.metadata.expiresAt <= input.metadata.issuedAt
    )
      return { result: 'rejected', code: 'CREDENTIAL_TIME_INVALID', checks };
    if (now >= input.metadata.expiresAt)
      return { result: 'rejected', code: 'CREDENTIAL_EXPIRED', checks };
    checks.push('expiry');
    const names = Object.keys(verified.disclosedClaims).sort();
    const requested = policy.requestedClaims.map((item) => item.name).sort();
    if (
      names.length !== requested.length ||
      names.some((name, index) => name !== requested[index])
    )
      return { result: 'rejected', code: 'DISCLOSURE_MISMATCH', checks };
    for (const requirement of policy.requestedClaims) {
      if (
        requirement.equals !== undefined &&
        verified.disclosedClaims[requirement.name] !== requirement.equals
      )
        return { result: 'rejected', code: 'POLICY_CLAIM_MISMATCH', checks };
    }
    checks.push('policy', 'disclosure');
    let registry: RegistryDecision;
    try {
      registry = await this.options.registry.evaluateCredential({
        tenantId: policy.tenantId,
        jurisdiction: policy.jurisdiction,
        issuerId: verified.issuer,
        schemaId: policy.schemaId,
        keyId: input.metadata.keyId,
        statusId: input.metadata.statusId,
        issuedAt: input.metadata.issuedAt,
        now,
      });
    } catch {
      registry = { decision: 'indeterminate', code: 'REGISTRY_UNAVAILABLE' };
    }
    if (registry.decision !== 'verified')
      return {
        result: registry.decision,
        code: registry.code,
        checks,
        registry,
      };
    checks.push('trust', 'status');
    return {
      result: 'verified',
      code: 'VERIFIED',
      checks,
      registry,
      claims: verified.disclosedClaims,
    };
  }

  private requestedClaims(
    policy: VerificationPolicy,
    claims: Readonly<Record<string, unknown>>,
  ): Readonly<Record<string, unknown>> {
    return Object.fromEntries(
      policy.requestedClaims.map(({ name }) => [name, claims[name]]),
    );
  }

  private mapProtocolError(error: unknown): {
    result: VerificationOutcome;
    code: string;
    checks: string[];
  } {
    if (error instanceof OpenId4VpError) {
      const codes: Record<string, string> = {
        replay: 'REPLAY_DETECTED',
        disclosure_mismatch: 'DISCLOSURE_MISMATCH',
        state_mismatch: 'STATE_MISMATCH',
        response_too_large: 'PRESENTATION_TOO_LARGE',
      };
      return {
        result: 'rejected',
        code: codes[error.code] ?? 'PRESENTATION_INVALID',
        checks: [],
      };
    }
    return { result: 'rejected', code: 'PRESENTATION_INVALID', checks: [] };
  }

  private finish(
    session: VerificationSession,
    result: VerificationOutcome,
    reasonCode: string,
    checks: readonly string[],
    registry?: RegistryDecision,
  ): VerificationReceipt {
    const receipt: VerificationReceipt = {
      schemaVersion: 1,
      receiptId: safeId(this.id!('receipt'), 'receiptId'),
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      policyId: session.policyId,
      result,
      reasonCode,
      verifiedAt: new Date(this.now()).toISOString(),
      checks: [...checks],
      ...(registry?.snapshotId ? { snapshotId: registry.snapshotId } : {}),
      ...(registry?.snapshotExpiresAt !== undefined
        ? { snapshotExpiresAt: registry.snapshotExpiresAt }
        : {}),
    };
    this.store.complete(session.sessionId, receipt);
    return receipt;
  }
}

function evaluationClaims(
  _resolved: ResolvedPresentation,
  evaluation: { claims?: Readonly<Record<string, unknown>> },
): Readonly<Record<string, unknown>> {
  return evaluation.claims ?? {};
}
