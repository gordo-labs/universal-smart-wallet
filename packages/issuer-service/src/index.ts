import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  assertSameTenant,
  parseCredentialTemplate,
  parseIssuerProfile,
  type CredentialTemplate,
  type IssuerProfile,
  type SubjectBinding,
} from '@ssw/credential-domain';
import {
  CREDENTIAL_FORMAT_PINS,
  type CredentialArtifact,
  type CredentialFormat,
} from '@ssw/credential-formats';
import {
  IssuerSignerError,
  opaqueIssuerKeyRef,
  type IssuerKeyDescriptor,
  type IssuerKeyRef,
  type IssuerSignerPort,
  type IssuerSigningAlgorithm,
} from '@ssw/issuer-signer';
import { PRE_AUTHORIZED_CODE_GRANT } from '@ssw/openid4vc';
import type { CredentialStatus, TrustRegistryPort } from '@ssw/trust-registry';

export const AUTHORIZATION_CODE_GRANT = 'authorization_code' as const;
export const DEFAULT_OFFER_TTL_MS = 5 * 60_000;
export const MAX_OFFER_TTL_MS = 10 * 60_000;
export const DEFAULT_CREDENTIAL_TTL_MS = 24 * 60 * 60_000;

const opaqueIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const digestPattern = /^sha256:[a-f0-9]{64}$/u;
const scopePattern = /^[a-z][a-z0-9:_-]{0,127}$/u;

export type IssuerActor = {
  readonly tenantId: string;
  readonly principalId: string;
  readonly scopes: readonly string[];
};

export type ReviewerPolicy = {
  readonly schemaVersion: 1;
  readonly tenantId: string;
  readonly policyId: string;
  readonly templateId: string;
  readonly requiredApprovals: number;
  readonly authorizedReviewerIds: readonly string[];
};

/** A reference and digest only. Raw documents are deliberately not accepted. */
export type EvidenceReference = {
  readonly evidenceId: string;
  readonly kind: string;
  readonly digest: `sha256:${string}`;
  readonly source: string;
};

export type ReviewDecision = {
  readonly reviewerId: string;
  readonly decision: 'approved' | 'rejected';
  readonly reviewedAt: number;
};

export type IssuanceState =
  | 'pending_review'
  | 'approved'
  | 'offered'
  | 'issued'
  | 'rejected'
  | 'expired'
  | 'signing_ambiguous';

export type IssuanceSessionView = {
  readonly schemaVersion: 1;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly kind: 'issue' | 'reissue';
  readonly issuerId: string;
  readonly templateId: string;
  readonly templateVersion: number;
  readonly format: CredentialFormat;
  readonly reviewerPolicyId: string;
  readonly state: IssuanceState;
  readonly evidence: readonly EvidenceReference[];
  readonly reviews: readonly ReviewDecision[];
  readonly expiresAt: number;
  readonly replacesCredentialId?: string;
};

type StoredIssuanceSession = Omit<IssuanceSessionView, 'state' | 'reviews'> & {
  state: IssuanceState;
  reviews: readonly ReviewDecision[];
  claims: Readonly<Record<string, unknown>>;
  readonly subjectBinding: SubjectBinding;
};

export type CredentialRecord = {
  readonly schemaVersion: 1;
  readonly tenantId: string;
  readonly credentialId: string;
  readonly statusId: string;
  readonly issuerId: string;
  readonly templateId: string;
  readonly templateVersion: number;
  readonly format: CredentialFormat;
  readonly issuedAt: number;
  readonly status: CredentialStatus;
  readonly replacesCredentialId?: string;
};

type GrantKind = 'pre-authorized_code' | 'authorization_code';
type StoredGrant = {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly kind: GrantKind;
  readonly secretHash: string;
  readonly expiresAt: number;
  readonly clientId?: string;
  readonly redirectUri?: string;
  consumedAt?: number;
};
type StoredAccessToken = {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly tokenHash: string;
  readonly expiresAt: number;
  consumedAt?: number;
};

export interface CredentialStatusPublisherPort {
  publish(input: {
    readonly tenantId: string;
    readonly issuerId: string;
    readonly statusId: string;
    readonly status: CredentialStatus;
    readonly updatedAt: number;
  }): Promise<void>;
}

export interface HolderProofPort {
  verify(input: {
    readonly tenantId: string;
    readonly issuerUri: string;
    readonly proof: string;
    readonly subjectBinding: SubjectBinding;
  }): Promise<boolean>;
}

/**
 * Format implementations adapt reviewed libraries from @ssw/credential-formats.
 * The supplied signer is the only path to institutional key material.
 */
export interface IssuerCredentialFormatPort {
  issue(input: {
    readonly requestId: string;
    readonly tenantId: string;
    readonly template: CredentialTemplate;
    readonly issuer: IssuerProfile;
    readonly claims: Readonly<Record<string, unknown>>;
    readonly subjectBinding: SubjectBinding;
    readonly statusId: string;
    readonly issuedAt: number;
    readonly expiresAt: number;
    readonly keyRef: IssuerKeyRef;
    readonly algorithm: IssuerSigningAlgorithm;
    readonly signer: IssuerSignerPort;
  }): Promise<{
    readonly artifact: CredentialArtifact;
    readonly signing: {
      readonly requestId: string;
      readonly keyRef: IssuerKeyRef;
      readonly algorithm: IssuerSigningAlgorithm;
      readonly keyVersion: string;
    };
  }>;
}

export interface IssuerAuthenticatorPort {
  authenticate(request: Request): Promise<IssuerActor | undefined>;
}

export type IssuerServiceOptions = {
  readonly signer: IssuerSignerPort;
  readonly trustRegistry: TrustRegistryPort;
  readonly formatPorts: Readonly<
    Partial<Record<CredentialFormat, IssuerCredentialFormatPort>>
  >;
  readonly proofVerifier: HolderProofPort;
  readonly statusPublisher: CredentialStatusPublisherPort;
  readonly jurisdiction: string;
  readonly clock?: () => number;
  readonly randomToken?: () => string;
};

export class IssuerServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message = code,
  ) {
    super(message);
    this.name = 'IssuerServiceError';
  }
}

const fail = (status: number, code: string, message = code): never => {
  throw new IssuerServiceError(status, code, message);
};
const id = (value: unknown, name: string): string => {
  if (typeof value !== 'string' || !opaqueIdPattern.test(value))
    return fail(400, `INVALID_${name.toUpperCase()}`);
  return value as string;
};
const boundedText = (value: unknown, name: string, max = 256): string => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > max ||
    /[\u0000-\u001f\u007f]/u.test(value)
  )
    return fail(400, `INVALID_${name.toUpperCase()}`);
  return value as string;
};
const strictRecord = (
  value: unknown,
  allowed: readonly string[],
  required: readonly string[] = allowed,
): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(400, 'INVALID_BODY');
  const record = value as Record<string, unknown>;
  if (required.some((key) => !Object.hasOwn(record, key)))
    fail(400, 'MISSING_FIELD');
  if (Object.keys(record).some((key) => !allowed.includes(key)))
    fail(400, 'UNKNOWN_FIELD');
  return record;
};
const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');
const safeEqual = (left: string, right: string): boolean => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};
const defaultToken = (): string => randomBytes(32).toString('base64url');

const key = (tenantId: string, entityId: string): string =>
  `${tenantId}\u0000${entityId}`;

export class InstitutionalIssuerService {
  private readonly templates = new Map<string, CredentialTemplate>();
  private readonly issuers = new Map<string, IssuerProfile>();
  private readonly policies = new Map<string, ReviewerPolicy>();
  private readonly sessions = new Map<string, StoredIssuanceSession>();
  private readonly credentials = new Map<string, CredentialRecord>();
  private readonly grants = new Map<string, StoredGrant>();
  private readonly accessTokens = new Map<string, StoredAccessToken>();
  private readonly now: () => number;
  private readonly token: () => string;

  constructor(private readonly options: IssuerServiceOptions) {
    this.now = options.clock ?? (() => Date.now());
    this.token = options.randomToken ?? defaultToken;
    id(options.jurisdiction, 'jurisdiction');
  }

  registerTemplate(actor: IssuerActor, value: unknown): CredentialTemplate {
    this.requireScope(actor, 'templates:write');
    let template: CredentialTemplate;
    try {
      template = parseCredentialTemplate(value);
      assertSameTenant(actor, template);
    } catch {
      return fail(400, 'INVALID_TEMPLATE');
    }
    if (template.status !== 'published') fail(409, 'TEMPLATE_NOT_PUBLISHED');
    const storageKey = this.templateKey(template);
    if (this.templates.has(storageKey)) fail(409, 'TEMPLATE_EXISTS');
    this.templates.set(storageKey, template);
    return template;
  }

  registerIssuer(actor: IssuerActor, value: unknown): IssuerProfile {
    this.requireScope(actor, 'issuers:write');
    let profile: IssuerProfile;
    try {
      profile = parseIssuerProfile(value);
      assertSameTenant(actor, profile);
      opaqueIssuerKeyRef(profile.keyRef);
    } catch {
      return fail(400, 'INVALID_ISSUER');
    }
    this.issuers.set(key(profile.tenantId, profile.issuerId), profile);
    return profile;
  }

  registerReviewerPolicy(actor: IssuerActor, value: unknown): ReviewerPolicy {
    this.requireScope(actor, 'reviewer-policies:write');
    const input = strictRecord(value, [
      'schemaVersion',
      'tenantId',
      'policyId',
      'templateId',
      'requiredApprovals',
      'authorizedReviewerIds',
    ]);
    if (input.schemaVersion !== 1) fail(400, 'INVALID_REVIEWER_POLICY');
    const tenantId = id(input.tenantId, 'tenant');
    this.sameTenant(actor.tenantId, tenantId);
    const policyId = id(input.policyId, 'policy');
    const templateId = id(input.templateId, 'template');
    if (
      !Number.isSafeInteger(input.requiredApprovals) ||
      Number(input.requiredApprovals) < 1 ||
      Number(input.requiredApprovals) > 10 ||
      !Array.isArray(input.authorizedReviewerIds)
    )
      fail(400, 'INVALID_REVIEWER_POLICY');
    const reviewerInputs = input.authorizedReviewerIds as readonly unknown[];
    const reviewers = reviewerInputs.map((reviewer) =>
      id(reviewer, 'reviewer'),
    );
    if (
      new Set(reviewers).size !== reviewers.length ||
      Number(input.requiredApprovals) > reviewers.length
    )
      fail(400, 'INVALID_REVIEWER_POLICY');
    const policy: ReviewerPolicy = Object.freeze({
      schemaVersion: 1,
      tenantId,
      policyId,
      templateId,
      requiredApprovals: Number(input.requiredApprovals),
      authorizedReviewerIds: Object.freeze(reviewers),
    });
    this.policies.set(key(tenantId, policyId), policy);
    return policy;
  }

  createIssuanceRequest(
    actor: IssuerActor,
    value: unknown,
  ): IssuanceSessionView {
    this.requireScope(actor, 'issuance:write');
    const input = strictRecord(
      value,
      [
        'sessionId',
        'issuerId',
        'templateId',
        'templateVersion',
        'format',
        'reviewerPolicyId',
        'claims',
        'subjectBinding',
        'evidence',
        'expiresAt',
        'replacesCredentialId',
      ],
      [
        'sessionId',
        'issuerId',
        'templateId',
        'templateVersion',
        'format',
        'reviewerPolicyId',
        'claims',
        'subjectBinding',
        'evidence',
        'expiresAt',
      ],
    );
    const sessionId = id(input.sessionId, 'session');
    const issuerId = id(input.issuerId, 'issuer');
    const templateId = id(input.templateId, 'template');
    const reviewerPolicyId = id(input.reviewerPolicyId, 'policy');
    if (!Number.isSafeInteger(input.templateVersion))
      fail(400, 'INVALID_TEMPLATE_VERSION');
    const templateVersion = Number(input.templateVersion);
    const format = input.format as CredentialFormat;
    if (!Object.hasOwn(CREDENTIAL_FORMAT_PINS, String(format)))
      fail(400, 'UNSUPPORTED_FORMAT');
    const expiresAt = Number(input.expiresAt);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= this.now())
      fail(400, 'INVALID_EXPIRY');
    const template = this.getTemplate(
      actor.tenantId,
      templateId,
      templateVersion,
    );
    const issuer = this.getIssuer(actor.tenantId, issuerId);
    const policy = this.getPolicy(actor.tenantId, reviewerPolicyId);
    if (
      !issuer.authorizedTemplateIds.includes(templateId) ||
      policy.templateId !== templateId ||
      !template.formats.includes(format) ||
      !this.options.formatPorts[format]
    )
      fail(403, 'ISSUANCE_NOT_AUTHORIZED');
    const claims = this.parseClaims(input.claims, template);
    const subjectBinding = this.parseSubjectBinding(input.subjectBinding);
    const evidence = this.parseEvidence(input.evidence);
    const replacesCredentialId =
      input.replacesCredentialId === undefined
        ? undefined
        : id(input.replacesCredentialId, 'credential');
    if (replacesCredentialId) {
      const previous = this.credentials.get(
        key(actor.tenantId, replacesCredentialId),
      );
      if (!previous) return fail(404, 'CREDENTIAL_NOT_FOUND');
      if (previous.templateId !== templateId || previous.issuerId !== issuerId)
        fail(409, 'REISSUE_TEMPLATE_MISMATCH');
    }
    const storageKey = key(actor.tenantId, sessionId);
    if (this.sessions.has(storageKey)) fail(409, 'SESSION_EXISTS');
    const session: StoredIssuanceSession = {
      schemaVersion: 1,
      tenantId: actor.tenantId,
      sessionId,
      kind: replacesCredentialId ? 'reissue' : 'issue',
      issuerId,
      templateId,
      templateVersion,
      format,
      reviewerPolicyId,
      state: 'pending_review',
      claims,
      subjectBinding,
      evidence,
      reviews: [],
      expiresAt,
      ...(replacesCredentialId ? { replacesCredentialId } : {}),
    };
    this.sessions.set(storageKey, session);
    return this.view(session);
  }

  reviewIssuance(
    actor: IssuerActor,
    sessionId: string,
    value: unknown,
  ): IssuanceSessionView {
    this.requireScope(actor, 'issuance:review');
    const input = strictRecord(value, ['decision']);
    if (input.decision !== 'approved' && input.decision !== 'rejected')
      fail(400, 'INVALID_REVIEW_DECISION');
    const session = this.mutableSession(actor.tenantId, sessionId);
    this.ensureSessionLive(session);
    if (session.state !== 'pending_review') fail(409, 'SESSION_NOT_REVIEWABLE');
    const policy = this.getPolicy(actor.tenantId, session.reviewerPolicyId);
    if (!policy.authorizedReviewerIds.includes(actor.principalId))
      fail(403, 'REVIEWER_NOT_AUTHORIZED');
    if (
      session.reviews.some((review) => review.reviewerId === actor.principalId)
    )
      fail(409, 'REVIEW_ALREADY_RECORDED');
    const decision = input.decision as ReviewDecision['decision'];
    const review: ReviewDecision = {
      reviewerId: actor.principalId,
      decision,
      reviewedAt: this.now(),
    };
    const reviews = [...session.reviews, review];
    session.reviews = Object.freeze(reviews);
    if (review.decision === 'rejected') session.state = 'rejected';
    else if (
      reviews.filter((item) => item.decision === 'approved').length >=
      policy.requiredApprovals
    )
      session.state = 'approved';
    return this.view(session);
  }

  async createOffer(
    actor: IssuerActor,
    sessionId: string,
    value: unknown,
  ): Promise<Readonly<Record<string, unknown>>> {
    this.requireScope(actor, 'offers:write');
    const input = strictRecord(
      value,
      ['flow', 'ttlMs', 'clientId', 'redirectUri'],
      ['flow'],
    );
    if (
      input.flow !== 'pre-authorized_code' &&
      input.flow !== AUTHORIZATION_CODE_GRANT
    )
      fail(400, 'UNSUPPORTED_GRANT_TYPE');
    const ttlMs =
      input.ttlMs === undefined ? DEFAULT_OFFER_TTL_MS : input.ttlMs;
    if (
      !Number.isSafeInteger(ttlMs) ||
      Number(ttlMs) < 1_000 ||
      Number(ttlMs) > MAX_OFFER_TTL_MS
    )
      fail(400, 'INVALID_OFFER_TTL');
    const session = this.mutableSession(actor.tenantId, sessionId);
    this.ensureSessionLive(session);
    if (session.state !== 'approved') fail(409, 'SESSION_NOT_APPROVED');
    await this.assertIssuanceAuthorization(session);
    const issuer = this.getIssuer(actor.tenantId, session.issuerId);
    const secret = this.uniqueToken();
    const kind = input.flow as GrantKind;
    const clientId =
      input.clientId === undefined ? undefined : id(input.clientId, 'client');
    const redirectUri =
      input.redirectUri === undefined
        ? undefined
        : this.httpsUrl(input.redirectUri, 'redirect_uri');
    if (kind === AUTHORIZATION_CODE_GRANT && (!clientId || !redirectUri))
      fail(400, 'AUTHORIZATION_CLIENT_REQUIRED');
    if (
      kind === 'pre-authorized_code' &&
      (clientId !== undefined || redirectUri !== undefined)
    )
      fail(400, 'UNEXPECTED_AUTHORIZATION_CLIENT');
    const grant: StoredGrant = {
      tenantId: actor.tenantId,
      sessionId: session.sessionId,
      kind,
      secretHash: sha256(secret),
      expiresAt: this.now() + Number(ttlMs),
      ...(clientId ? { clientId } : {}),
      ...(redirectUri ? { redirectUri } : {}),
    };
    this.grants.set(grant.secretHash, grant);
    session.state = 'offered';
    const configurationId = this.configurationId(session);
    return Object.freeze({
      credential_issuer: issuer.issuerUri,
      credential_configuration_ids: Object.freeze([configurationId]),
      grants:
        kind === 'pre-authorized_code'
          ? Object.freeze({
              [PRE_AUTHORIZED_CODE_GRANT]: Object.freeze({
                'pre-authorized_code': secret,
              }),
            })
          : Object.freeze({
              [AUTHORIZATION_CODE_GRANT]: Object.freeze({
                issuer_state: secret,
              }),
            }),
      expires_in: Math.floor(Number(ttlMs) / 1_000),
    });
  }

  authorize(
    actor: IssuerActor,
    tenantId: string,
    value: unknown,
  ): {
    readonly redirect_uri: string;
    readonly code: string;
    readonly state: string;
  } {
    this.sameTenant(actor.tenantId, tenantId);
    this.requireScope(actor, 'oid4vci:authorize');
    const input = strictRecord(value, [
      'issuer_state',
      'client_id',
      'redirect_uri',
      'state',
    ]);
    const issuerState = boundedText(input.issuer_state, 'issuer_state', 512);
    const clientId = id(input.client_id, 'client');
    const redirectUri = this.httpsUrl(input.redirect_uri, 'redirect_uri');
    const state = boundedText(input.state, 'state', 512);
    const grant = this.consumeGrant(
      issuerState,
      tenantId,
      AUTHORIZATION_CODE_GRANT,
    );
    if (grant.clientId !== clientId || grant.redirectUri !== redirectUri)
      fail(400, 'AUTHORIZATION_CLIENT_MISMATCH');
    const code = this.uniqueToken();
    const codeGrant: StoredGrant = {
      tenantId,
      sessionId: grant.sessionId,
      kind: AUTHORIZATION_CODE_GRANT,
      secretHash: sha256(code),
      expiresAt: Math.min(grant.expiresAt, this.now() + 60_000),
      clientId,
      redirectUri,
    };
    this.grants.set(codeGrant.secretHash, codeGrant);
    return { redirect_uri: redirectUri, code, state };
  }

  exchangeToken(
    tenantId: string,
    value: unknown,
  ): {
    readonly access_token: string;
    readonly token_type: 'Bearer';
    readonly expires_in: number;
  } {
    const input = strictRecord(
      value,
      [
        'grant_type',
        'pre-authorized_code',
        'code',
        'client_id',
        'redirect_uri',
      ],
      ['grant_type'],
    );
    const grantType = input.grant_type;
    let code: string;
    let grant: StoredGrant | undefined;
    if (grantType === PRE_AUTHORIZED_CODE_GRANT) {
      code = boundedText(input['pre-authorized_code'], 'grant', 512);
      if (
        input.code !== undefined ||
        input.client_id !== undefined ||
        input.redirect_uri !== undefined
      )
        fail(400, 'INVALID_TOKEN_REQUEST');
      grant = this.consumeGrant(code, tenantId, 'pre-authorized_code');
    } else if (grantType === AUTHORIZATION_CODE_GRANT) {
      code = boundedText(input.code, 'grant', 512);
      const clientId = id(input.client_id, 'client');
      const redirectUri = this.httpsUrl(input.redirect_uri, 'redirect_uri');
      grant = this.consumeGrant(code, tenantId, AUTHORIZATION_CODE_GRANT);
      if (grant.clientId !== clientId || grant.redirectUri !== redirectUri)
        fail(400, 'AUTHORIZATION_CLIENT_MISMATCH');
    } else fail(400, 'UNSUPPORTED_GRANT_TYPE');
    if (!grant) return fail(400, 'UNSUPPORTED_GRANT_TYPE');
    const token = this.uniqueToken();
    const expiresAt = Math.min(grant.expiresAt, this.now() + 60_000);
    this.accessTokens.set(sha256(token), {
      tenantId,
      sessionId: grant.sessionId,
      tokenHash: sha256(token),
      expiresAt,
    });
    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: Math.max(0, Math.floor((expiresAt - this.now()) / 1_000)),
    };
  }

  async issueCredential(
    tenantId: string,
    accessToken: string,
    value: unknown,
  ): Promise<{
    readonly format: string;
    readonly credential: string;
    readonly credential_id: string;
    readonly status_id: string;
  }> {
    const input = strictRecord(value, ['credential_configuration_id', 'proof']);
    const configurationId = id(
      input.credential_configuration_id,
      'credential_configuration',
    );
    const proofInput = strictRecord(input.proof, ['proof_type', 'jwt']);
    if (proofInput.proof_type !== 'jwt') fail(400, 'UNSUPPORTED_PROOF_TYPE');
    const proof = boundedText(proofInput.jwt, 'proof', 8_192);
    const token = this.consumeAccessToken(accessToken, tenantId);
    const session = this.mutableSession(tenantId, token.sessionId);
    this.ensureSessionLive(session);
    if (
      session.state !== 'offered' ||
      configurationId !== this.configurationId(session)
    )
      fail(400, 'INVALID_CREDENTIAL_REQUEST');
    const { template, issuer, descriptor } =
      await this.assertIssuanceAuthorization(session);
    const proofValid = await this.options.proofVerifier.verify({
      tenantId,
      issuerUri: issuer.issuerUri,
      proof,
      subjectBinding: session.subjectBinding,
    });
    if (!proofValid) fail(400, 'INVALID_OR_MISSING_PROOF');
    const issuedAt = this.now();
    const credentialId = `cred-${this.uniqueToken().slice(0, 24)}`;
    const statusId = `status-${this.uniqueToken().slice(0, 24)}`;
    const requestId = `issue-${session.sessionId}-${this.uniqueToken().slice(0, 12)}`;
    const port = this.options.formatPorts[session.format];
    if (!port) return fail(409, 'FORMAT_UNAVAILABLE');
    let issued: Awaited<ReturnType<IssuerCredentialFormatPort['issue']>>;
    try {
      issued = await port.issue({
        requestId,
        tenantId,
        template,
        issuer,
        claims: session.claims,
        subjectBinding: session.subjectBinding,
        statusId,
        issuedAt,
        expiresAt: issuedAt + DEFAULT_CREDENTIAL_TTL_MS,
        keyRef: opaqueIssuerKeyRef(issuer.keyRef),
        algorithm: descriptor.algorithm,
        signer: this.options.signer,
      });
    } catch (error) {
      if (
        error instanceof IssuerSignerError &&
        (error.code === 'SIGNING_RESULT_AMBIGUOUS' ||
          error.code === 'OPERATION_RESULT_AMBIGUOUS')
      ) {
        session.state = 'signing_ambiguous';
        return fail(503, 'SIGNING_RESULT_AMBIGUOUS');
      }
      throw error;
    }
    if (
      issued.signing.requestId !== requestId ||
      issued.signing.keyRef !== opaqueIssuerKeyRef(issuer.keyRef) ||
      issued.signing.algorithm !== descriptor.algorithm ||
      issued.artifact.format !== session.format ||
      issued.artifact.profile !==
        CREDENTIAL_FORMAT_PINS[session.format].profile ||
      issued.artifact.version !==
        CREDENTIAL_FORMAT_PINS[session.format].version ||
      issued.artifact.kind !== 'credential'
    ) {
      session.state = 'signing_ambiguous';
      fail(503, 'SIGNING_RESULT_AMBIGUOUS');
    }
    const serialized = this.serializeArtifact(issued.artifact);
    const record: CredentialRecord = Object.freeze({
      schemaVersion: 1,
      tenantId,
      credentialId,
      statusId,
      issuerId: session.issuerId,
      templateId: session.templateId,
      templateVersion: session.templateVersion,
      format: session.format,
      issuedAt,
      status: 'valid',
      ...(session.replacesCredentialId
        ? { replacesCredentialId: session.replacesCredentialId }
        : {}),
    });
    this.credentials.set(key(tenantId, credentialId), record);
    await this.options.statusPublisher.publish({
      tenantId,
      issuerId: session.issuerId,
      statusId,
      status: 'valid',
      updatedAt: issuedAt,
    });
    session.state = 'issued';
    // Claims are required only while issuing. Remove them after success.
    session.claims = Object.freeze({});
    return {
      format: issued.artifact.mediaType,
      credential: serialized,
      credential_id: credentialId,
      status_id: statusId,
    };
  }

  async suspendCredential(
    actor: IssuerActor,
    credentialId: string,
  ): Promise<CredentialRecord> {
    return this.changeStatus(actor, credentialId, 'suspended');
  }

  async revokeCredential(
    actor: IssuerActor,
    credentialId: string,
  ): Promise<CredentialRecord> {
    return this.changeStatus(actor, credentialId, 'revoked');
  }

  getSession(actor: IssuerActor, sessionId: string): IssuanceSessionView {
    this.requireScope(actor, 'issuance:read');
    return this.view(this.mutableSession(actor.tenantId, sessionId));
  }

  getCredential(actor: IssuerActor, credentialId: string): CredentialRecord {
    this.requireScope(actor, 'credentials:read');
    const record = this.credentials.get(
      key(actor.tenantId, id(credentialId, 'credential')),
    );
    if (!record) return fail(404, 'CREDENTIAL_NOT_FOUND');
    return record;
  }

  issuerMetadata(
    tenantId: string,
    issuerId: string,
  ): Readonly<Record<string, unknown>> {
    const issuer = this.getIssuer(tenantId, issuerId);
    const configurations: Record<string, unknown> = {};
    for (const template of this.templates.values()) {
      if (
        template.tenantId !== tenantId ||
        !issuer.authorizedTemplateIds.includes(template.templateId)
      )
        continue;
      for (const format of template.formats) {
        const pin = CREDENTIAL_FORMAT_PINS[format];
        configurations[
          `${template.templateId}.v${template.version}.${format}`
        ] = {
          format: pin.mediaType,
          credential_definition: { type: [template.type] },
        };
      }
    }
    return Object.freeze({
      credential_issuer: issuer.issuerUri,
      authorization_endpoint: `${issuer.issuerUri}/v1/oid4vci/${tenantId}/authorize`,
      token_endpoint: `${issuer.issuerUri}/v1/oid4vci/${tenantId}/token`,
      credential_endpoint: `${issuer.issuerUri}/v1/oid4vci/${tenantId}/credential`,
      credential_configurations_supported: Object.freeze(configurations),
    });
  }

  private async changeStatus(
    actor: IssuerActor,
    credentialId: string,
    status: Extract<CredentialStatus, 'suspended' | 'revoked'>,
  ): Promise<CredentialRecord> {
    this.requireScope(actor, 'credentials:status');
    const storageKey = key(actor.tenantId, id(credentialId, 'credential'));
    const current = this.credentials.get(storageKey);
    if (!current) return fail(404, 'CREDENTIAL_NOT_FOUND');
    if (current.status === 'revoked' && status !== 'revoked')
      fail(409, 'CREDENTIAL_REVOKED');
    if (current.status === status) return current;
    const updatedAt = this.now();
    await this.options.statusPublisher.publish({
      tenantId: actor.tenantId,
      issuerId: current.issuerId,
      statusId: current.statusId,
      status,
      updatedAt,
    });
    const updated: CredentialRecord = Object.freeze({ ...current, status });
    this.credentials.set(storageKey, updated);
    return updated;
  }

  private async assertIssuanceAuthorization(
    session: StoredIssuanceSession,
  ): Promise<{
    template: CredentialTemplate;
    issuer: IssuerProfile;
    descriptor: IssuerKeyDescriptor;
  }> {
    const template = this.getTemplate(
      session.tenantId,
      session.templateId,
      session.templateVersion,
    );
    const issuer = this.getIssuer(session.tenantId, session.issuerId);
    const policy = this.getPolicy(session.tenantId, session.reviewerPolicyId);
    const approvals = session.reviews.filter(
      (review) =>
        review.decision === 'approved' &&
        policy.authorizedReviewerIds.includes(review.reviewerId),
    );
    if (
      template.status !== 'published' ||
      !template.formats.includes(session.format) ||
      !issuer.authorizedTemplateIds.includes(session.templateId) ||
      policy.templateId !== session.templateId ||
      new Set(approvals.map((review) => review.reviewerId)).size <
        policy.requiredApprovals
    )
      fail(403, 'ISSUANCE_NOT_AUTHORIZED');
    const keyRef = opaqueIssuerKeyRef(issuer.keyRef);
    const descriptor = await this.options.signer.describeKey(keyRef);
    if (!descriptor || descriptor.status !== 'active')
      return fail(403, 'KEY_NOT_AUTHORIZED');
    const algorithms = CREDENTIAL_FORMAT_PINS[session.format]
      .algorithms as readonly string[];
    if (!algorithms.includes(descriptor.algorithm))
      fail(403, 'KEY_NOT_AUTHORIZED');
    const trust = await this.options.trustRegistry.evaluateTrust({
      tenantId: session.tenantId,
      jurisdiction: this.options.jurisdiction,
      issuerId: session.issuerId,
      schemaId: `${session.templateId}:v${session.templateVersion}`,
      keyId: issuer.keyRef,
      issuedAt: this.now(),
    });
    if (trust.decision !== 'verified') fail(403, 'TRUST_NOT_AUTHORIZED');
    return { template, issuer, descriptor };
  }

  private parseClaims(
    value: unknown,
    template: CredentialTemplate,
  ): Readonly<Record<string, unknown>> {
    const record = strictRecord(
      value,
      template.claims.map((claim) => claim.name),
      template.claims
        .filter((claim) => claim.required)
        .map((claim) => claim.name),
    );
    for (const claim of template.claims) {
      const claimValue = record[claim.name];
      if (claimValue === undefined) continue;
      const valid =
        (claim.type === 'string' &&
          typeof claimValue === 'string' &&
          claimValue.length <= 2_048) ||
        (claim.type === 'boolean' && typeof claimValue === 'boolean') ||
        (claim.type === 'number' &&
          typeof claimValue === 'number' &&
          Number.isFinite(claimValue)) ||
        (claim.type === 'date' &&
          typeof claimValue === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/u.test(claimValue));
      if (!valid) fail(400, 'INVALID_CLAIMS');
    }
    return Object.freeze({ ...record });
  }

  private parseSubjectBinding(value: unknown): SubjectBinding {
    const input = strictRecord(value, [
      'schemaVersion',
      'bindingId',
      'method',
      'value',
    ]);
    if (
      input.schemaVersion !== 1 ||
      !['jwk-thumbprint', 'did-pkh', 'mdoc-device-key'].includes(
        String(input.method),
      )
    )
      fail(400, 'INVALID_SUBJECT_BINDING');
    return Object.freeze({
      schemaVersion: 1,
      bindingId: id(input.bindingId, 'binding'),
      method: input.method as SubjectBinding['method'],
      value: boundedText(input.value, 'binding_value', 2_048),
    });
  }

  private parseEvidence(value: unknown): readonly EvidenceReference[] {
    if (!Array.isArray(value) || value.length === 0 || value.length > 16)
      return fail(400, 'INVALID_EVIDENCE');
    const evidenceInputs = value as readonly unknown[];
    const seen = new Set<string>();
    const evidence = evidenceInputs.map((item) => {
      const input = strictRecord(item, [
        'evidenceId',
        'kind',
        'digest',
        'source',
      ]);
      const evidenceId = id(input.evidenceId, 'evidence');
      if (seen.has(evidenceId)) fail(400, 'INVALID_EVIDENCE');
      seen.add(evidenceId);
      if (typeof input.digest !== 'string' || !digestPattern.test(input.digest))
        fail(400, 'INVALID_EVIDENCE_DIGEST');
      return Object.freeze({
        evidenceId,
        kind: id(input.kind, 'evidence_kind'),
        digest: input.digest as `sha256:${string}`,
        source: boundedText(input.source, 'evidence_source', 256),
      });
    });
    return Object.freeze(evidence);
  }

  private consumeGrant(
    secret: string,
    tenantId: string,
    kind: GrantKind,
  ): StoredGrant {
    const grant = this.grants.get(sha256(secret));
    if (!grant || !safeEqual(grant.secretHash, sha256(secret)))
      return fail(400, 'INVALID_GRANT');
    if (grant.tenantId !== tenantId) fail(403, 'TENANT_MISMATCH');
    if (grant.kind !== kind || grant.consumedAt !== undefined)
      fail(400, 'INVALID_GRANT');
    grant.consumedAt = this.now();
    if (grant.expiresAt <= grant.consumedAt) fail(400, 'EXPIRED_GRANT');
    return grant;
  }

  private consumeAccessToken(
    secret: string,
    tenantId: string,
  ): StoredAccessToken {
    const value = boundedText(secret, 'access_token', 512);
    const token = this.accessTokens.get(sha256(value));
    if (!token || !safeEqual(token.tokenHash, sha256(value)))
      return fail(401, 'INVALID_ACCESS_TOKEN');
    if (token.tenantId !== tenantId) fail(403, 'TENANT_MISMATCH');
    if (token.consumedAt !== undefined) fail(401, 'ACCESS_TOKEN_REPLAY');
    token.consumedAt = this.now();
    if (token.expiresAt <= token.consumedAt) fail(401, 'ACCESS_TOKEN_EXPIRED');
    return token;
  }

  private uniqueToken(): string {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const token = this.token();
      if (!/^[A-Za-z0-9_-]{16,512}$/u.test(token))
        fail(500, 'RANDOM_TOKEN_FAILURE');
      const digest = sha256(token);
      if (!this.grants.has(digest) && !this.accessTokens.has(digest))
        return token;
    }
    return fail(500, 'RANDOM_TOKEN_FAILURE');
  }

  private templateKey(
    template: Pick<CredentialTemplate, 'tenantId' | 'templateId' | 'version'>,
  ): string {
    return key(
      template.tenantId,
      `${template.templateId}:v${template.version}`,
    );
  }
  private getTemplate(
    tenantId: string,
    templateId: string,
    version: number,
  ): CredentialTemplate {
    const template = this.templates.get(
      key(tenantId, `${templateId}:v${version}`),
    );
    if (!template) return fail(404, 'TEMPLATE_NOT_FOUND');
    return template;
  }
  private getIssuer(tenantId: string, issuerId: string): IssuerProfile {
    const issuer = this.issuers.get(key(tenantId, issuerId));
    if (!issuer) return fail(404, 'ISSUER_NOT_FOUND');
    return issuer;
  }
  private getPolicy(tenantId: string, policyId: string): ReviewerPolicy {
    const policy = this.policies.get(key(tenantId, policyId));
    if (!policy) return fail(404, 'REVIEWER_POLICY_NOT_FOUND');
    return policy;
  }
  private mutableSession(
    tenantId: string,
    sessionId: string,
  ): StoredIssuanceSession {
    const session = this.sessions.get(key(tenantId, id(sessionId, 'session')));
    if (!session) return fail(404, 'SESSION_NOT_FOUND');
    return session;
  }
  private ensureSessionLive(session: StoredIssuanceSession): void {
    if (session.expiresAt <= this.now()) {
      session.state = 'expired';
      fail(410, 'SESSION_EXPIRED');
    }
  }
  private view(session: StoredIssuanceSession): IssuanceSessionView {
    const { claims: _claims, subjectBinding: _binding, ...view } = session;
    return Object.freeze({
      ...view,
      evidence: Object.freeze([...view.evidence]),
      reviews: Object.freeze([...view.reviews]),
    });
  }
  private requireScope(actor: IssuerActor, scope: string): void {
    id(actor.tenantId, 'tenant');
    id(actor.principalId, 'principal');
    if (!actor.scopes.includes(scope)) fail(403, 'SCOPE_REQUIRED');
  }
  private sameTenant(left: string, right: string): void {
    if (id(left, 'tenant') !== id(right, 'tenant'))
      fail(403, 'TENANT_MISMATCH');
  }
  private configurationId(session: StoredIssuanceSession): string {
    return `${session.templateId}.v${session.templateVersion}.${session.format}`;
  }
  private httpsUrl(value: unknown, name: string): string {
    const text = boundedText(value, name, 2_048);
    let parsed: URL;
    try {
      parsed = new URL(text);
    } catch {
      return fail(400, `INVALID_${name.toUpperCase()}`);
    }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
      fail(400, `INVALID_${name.toUpperCase()}`);
    return parsed.toString();
  }
  private serializeArtifact(artifact: CredentialArtifact): string {
    if (typeof artifact.value === 'string') return artifact.value;
    return Buffer.from(artifact.value).toString('base64url');
  }
}

const jsonResponse = (value: unknown, status = 200): Response =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });

export class IssuerHttpApi {
  constructor(
    private readonly service: InstitutionalIssuerService,
    private readonly authenticator: IssuerAuthenticatorPort,
    private readonly maxBodyBytes = 64 * 1024,
  ) {}

  async handle(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const parts = url.pathname.split('/').filter(Boolean);
      if (request.method === 'GET' && url.pathname === '/v1/health')
        return jsonResponse({ ok: true, version: 'v1' });
      if (
        request.method === 'GET' &&
        parts[0] === '.well-known' &&
        parts[1] === 'openid-credential-issuer'
      ) {
        const tenantId = id(url.searchParams.get('tenant_id'), 'tenant');
        const issuerId = id(url.searchParams.get('issuer_id'), 'issuer');
        return jsonResponse(this.service.issuerMetadata(tenantId, issuerId));
      }
      if (parts[0] !== 'v1')
        return jsonResponse({ error: { code: 'NOT_FOUND' } }, 404);
      if (
        request.method === 'POST' &&
        parts[1] === 'oid4vci' &&
        parts.length === 4
      ) {
        const tenantId = id(parts[2], 'tenant');
        if (parts[3] === 'token')
          return jsonResponse(
            this.service.exchangeToken(tenantId, await this.body(request)),
          );
        if (parts[3] === 'credential') {
          const header = request.headers.get('authorization');
          if (!header?.startsWith('Bearer '))
            return fail(401, 'ACCESS_TOKEN_REQUIRED');
          return jsonResponse(
            await this.service.issueCredential(
              tenantId,
              header.slice(7),
              await this.body(request),
            ),
          );
        }
        if (parts[3] === 'authorize') {
          const actor = await this.actor(request);
          return jsonResponse(
            this.service.authorize(actor, tenantId, await this.body(request)),
          );
        }
      }
      const actor = await this.actor(request);
      this.headerTenant(request, actor);
      if (
        request.method === 'POST' &&
        parts[1] === 'templates' &&
        parts.length === 2
      )
        return jsonResponse(
          this.service.registerTemplate(actor, await this.body(request)),
          201,
        );
      if (
        request.method === 'POST' &&
        parts[1] === 'issuers' &&
        parts.length === 2
      )
        return jsonResponse(
          this.service.registerIssuer(actor, await this.body(request)),
          201,
        );
      if (
        request.method === 'POST' &&
        parts[1] === 'reviewer-policies' &&
        parts.length === 2
      )
        return jsonResponse(
          this.service.registerReviewerPolicy(actor, await this.body(request)),
          201,
        );
      if (
        request.method === 'POST' &&
        parts[1] === 'issuance-requests' &&
        parts.length === 2
      )
        return jsonResponse(
          this.service.createIssuanceRequest(actor, await this.body(request)),
          201,
        );
      if (
        parts[1] === 'issuance-requests' &&
        parts[2] &&
        parts.length === 3 &&
        request.method === 'GET'
      )
        return jsonResponse(this.service.getSession(actor, parts[2]));
      if (
        parts[1] === 'issuance-requests' &&
        parts[2] &&
        parts.length === 4 &&
        request.method === 'POST'
      ) {
        if (parts[3] === 'reviews')
          return jsonResponse(
            this.service.reviewIssuance(
              actor,
              parts[2],
              await this.body(request),
            ),
          );
        if (parts[3] === 'offers')
          return jsonResponse(
            await this.service.createOffer(
              actor,
              parts[2],
              await this.body(request),
            ),
            201,
          );
      }
      if (
        parts[1] === 'credentials' &&
        parts[2] &&
        parts.length === 4 &&
        request.method === 'POST'
      ) {
        if (parts[3] === 'suspend')
          return jsonResponse(
            await this.service.suspendCredential(actor, parts[2]),
          );
        if (parts[3] === 'revoke')
          return jsonResponse(
            await this.service.revokeCredential(actor, parts[2]),
          );
        if (parts[3] === 'reissue') {
          const raw = await this.body(request);
          const input = strictRecord(raw, [
            'sessionId',
            'issuerId',
            'templateId',
            'templateVersion',
            'format',
            'reviewerPolicyId',
            'claims',
            'subjectBinding',
            'evidence',
            'expiresAt',
          ]);
          return jsonResponse(
            this.service.createIssuanceRequest(actor, {
              ...input,
              replacesCredentialId: parts[2],
            }),
            201,
          );
        }
      }
      if (
        parts[1] === 'credentials' &&
        parts[2] &&
        parts.length === 3 &&
        request.method === 'GET'
      )
        return jsonResponse(this.service.getCredential(actor, parts[2]));
      return jsonResponse({ error: { code: 'NOT_FOUND' } }, 404);
    } catch (error) {
      if (error instanceof IssuerServiceError)
        return jsonResponse({ error: { code: error.code } }, error.status);
      return jsonResponse({ error: { code: 'INTERNAL_ERROR' } }, 500);
    }
  }

  private async actor(request: Request): Promise<IssuerActor> {
    const actor = await this.authenticator.authenticate(request);
    if (!actor) return fail(401, 'AUTH_REQUIRED');
    return actor;
  }
  private headerTenant(request: Request, actor: IssuerActor): void {
    const requested = request.headers.get('x-tenant-id');
    if (requested && requested !== actor.tenantId) fail(403, 'TENANT_MISMATCH');
  }
  private async body(request: Request): Promise<unknown> {
    const contentType = request.headers.get('content-type')?.toLowerCase();
    if (!contentType?.startsWith('application/json'))
      fail(415, 'CONTENT_TYPE_UNSUPPORTED');
    const length = Number(request.headers.get('content-length') ?? 0);
    if (!Number.isFinite(length) || length > this.maxBodyBytes)
      fail(413, 'BODY_TOO_LARGE');
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > this.maxBodyBytes)
      fail(413, 'BODY_TOO_LARGE');
    try {
      return JSON.parse(text);
    } catch {
      return fail(400, 'INVALID_JSON');
    }
  }
}

export const createIssuerHttpApi = (
  service: InstitutionalIssuerService,
  authenticator: IssuerAuthenticatorPort,
): IssuerHttpApi => new IssuerHttpApi(service, authenticator);
