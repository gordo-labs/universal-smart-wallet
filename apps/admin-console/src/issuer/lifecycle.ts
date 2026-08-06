/**
 * Issuer review and credential lifecycle administration.
 *
 * This module is an application boundary over the institutional issuer SDK.
 * It deliberately accepts a narrow structural port instead of importing a
 * concrete transport, so the admin console can use the browser or server SDK
 * without making protocol tokens or credentials part of the UI state.
 */

export type IssuerAdminRole =
  | 'issuer-owner'
  | 'issuer-admin'
  | 'issuer-reviewer'
  | 'issuer-operator'
  | 'issuer-viewer';

export type IssuerAdminScope =
  | 'issuer:review:read'
  | 'issuer:review:write'
  | 'issuer:issuance:write'
  | 'issuer:lifecycle:read'
  | 'issuer:lifecycle:write';

export type IssuerAdminPrincipal = Readonly<{
  tenantId: string;
  principalId: string;
  role: IssuerAdminRole;
  scopes?: readonly IssuerAdminScope[];
  /** Step-up must be established by the host authentication module. */
  reauthenticated?: boolean;
}>;

export type LifecycleCredentialFormat = 'sd-jwt-vc' | 'iso-mdoc' | 'w3c-vc-di';

export type LifecycleEvidenceReference = Readonly<{
  evidenceId: string;
  kind: string;
  digest: `sha256:${string}`;
  source: string;
}>;

export type LifecycleSubjectBinding = Readonly<{
  schemaVersion: 1;
  bindingId: string;
  method: 'jwk-thumbprint' | 'did-pkh' | 'mdoc-device-key';
  /** Write-only at the API boundary. Never render or retain this value. */
  value: string;
}>;

export type LifecycleIssuanceInput = Readonly<{
  sessionId: string;
  issuerId: string;
  templateId: string;
  templateVersion: number;
  format: LifecycleCredentialFormat;
  reviewerPolicyId: string;
  claims: Readonly<Record<string, unknown>>;
  subjectBinding: LifecycleSubjectBinding;
  evidence: readonly LifecycleEvidenceReference[];
  expiresAt: number;
}>;

export type LifecycleReview = Readonly<{
  reviewerId?: string;
  decision: 'approved' | 'rejected';
  reviewedAt?: number;
}>;

export type LifecycleSession = Readonly<{
  schemaVersion: 1;
  tenantId: string;
  sessionId: string;
  kind: 'issue' | 'reissue';
  issuerId: string;
  templateId: string;
  templateVersion: number;
  format: LifecycleCredentialFormat;
  reviewerPolicyId: string;
  state:
    | 'pending_review'
    | 'approved'
    | 'offered'
    | 'issued'
    | 'rejected'
    | 'expired'
    | 'signing_ambiguous';
  evidence: readonly LifecycleEvidenceReference[];
  reviews: readonly LifecycleReview[];
  expiresAt: number;
  replacesCredentialId?: string;
}>;

export type LifecycleCredential = Readonly<{
  schemaVersion: 1;
  tenantId: string;
  credentialId: string;
  statusId: string;
  issuerId: string;
  templateId: string;
  templateVersion: number;
  format: LifecycleCredentialFormat;
  issuedAt: number;
  status: 'valid' | 'suspended' | 'revoked';
  replacesCredentialId?: string;
}>;

export type LifecycleRequestOptions = Readonly<{
  idempotencyKey: string;
  signal?: AbortSignal;
}>;

export type LifecycleApi = Readonly<{
  createIssuanceRequest(
    tenantId: string,
    input: LifecycleIssuanceInput,
    options: LifecycleRequestOptions,
  ): Promise<LifecycleSession>;
  getIssuanceSession(
    tenantId: string,
    sessionId: string,
    options?: Readonly<{ signal?: AbortSignal }>,
  ): Promise<LifecycleSession>;
  reviewIssuance(
    tenantId: string,
    sessionId: string,
    input: Readonly<{ decision: 'approved' | 'rejected' }>,
    options: LifecycleRequestOptions,
  ): Promise<LifecycleSession>;
  createOffer(
    tenantId: string,
    sessionId: string,
    input: Readonly<{
      flow: 'pre-authorized_code' | 'authorization_code';
      ttlMs?: number;
      clientId?: string;
      redirectUri?: string;
    }>,
    options: LifecycleRequestOptions,
  ): Promise<Readonly<Record<string, unknown>>>;
  getCredential(
    tenantId: string,
    credentialId: string,
    options?: Readonly<{ signal?: AbortSignal }>,
  ): Promise<LifecycleCredential>;
  reissueCredential(
    tenantId: string,
    credentialId: string,
    input: LifecycleIssuanceInput,
    options: LifecycleRequestOptions,
  ): Promise<LifecycleSession>;
  suspendCredential(
    tenantId: string,
    credentialId: string,
    options: LifecycleRequestOptions,
  ): Promise<LifecycleCredential>;
  revokeCredential(
    tenantId: string,
    credentialId: string,
    options: LifecycleRequestOptions,
  ): Promise<LifecycleCredential>;
}>;

export class IssuerLifecycleError extends Error {
  constructor(
    readonly code:
      | 'INVALID_REQUEST'
      | 'TENANT_MISMATCH'
      | 'FORBIDDEN'
      | 'STEP_UP_REQUIRED'
      | 'CONFIRMATION_REQUIRED'
      | 'ROLE_SEPARATION'
      | 'BATCH_LIMIT'
      | 'SESSION_NOT_APPROVED'
      | 'NOT_FOUND'
      | 'INVALID_STATE'
      | 'UPSTREAM_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'IssuerLifecycleError';
  }
}

const roleScopes: Record<IssuerAdminRole, readonly IssuerAdminScope[]> = {
  'issuer-owner': [
    'issuer:review:read',
    'issuer:review:write',
    'issuer:issuance:write',
    'issuer:lifecycle:read',
    'issuer:lifecycle:write',
  ],
  'issuer-admin': [
    'issuer:review:read',
    'issuer:review:write',
    'issuer:issuance:write',
    'issuer:lifecycle:read',
    'issuer:lifecycle:write',
  ],
  'issuer-reviewer': ['issuer:review:read', 'issuer:review:write'],
  'issuer-operator': [
    'issuer:review:read',
    'issuer:issuance:write',
    'issuer:lifecycle:read',
    'issuer:lifecycle:write',
  ],
  'issuer-viewer': ['issuer:review:read', 'issuer:lifecycle:read'],
};

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const idempotencyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;
const MAX_BULK_ROWS = 100;

const fail = (
  code: ConstructorParameters<typeof IssuerLifecycleError>[0],
  message: string,
): never => {
  throw new IssuerLifecycleError(code, message);
};

const requireId = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !idPattern.test(value))
    fail('INVALID_REQUEST', `${field} is invalid`);
  return value as string;
};

const requireIdempotency = (value: unknown): string => {
  if (typeof value !== 'string' || !idempotencyPattern.test(value))
    fail('INVALID_REQUEST', 'idempotency key is invalid');
  return value as string;
};

const hasScope = (
  principal: IssuerAdminPrincipal,
  scope: IssuerAdminScope,
): boolean =>
  roleScopes[principal.role].includes(scope) &&
  (principal.scopes === undefined || principal.scopes.includes(scope));

export const authorizeIssuerAdmin = (
  principal: IssuerAdminPrincipal,
  scope: IssuerAdminScope,
  tenantId: string,
): void => {
  requireId(tenantId, 'tenantId');
  requireId(principal.principalId, 'principalId');
  if (principal.tenantId !== tenantId)
    fail('TENANT_MISMATCH', 'Tenant boundary violation');
  if (!hasScope(principal, scope))
    fail('FORBIDDEN', 'Insufficient issuer administration scope');
};

const options = (idempotencyKey: string, signal?: AbortSignal): LifecycleRequestOptions => ({
  idempotencyKey: requireIdempotency(idempotencyKey),
  signal,
});

const isApproved = (session: LifecycleSession): boolean => session.state === 'approved';

const safeError = (error: unknown): IssuerLifecycleError => {
  if (error instanceof IssuerLifecycleError) return error;
  // Never pass through provider responses, credential material, or evidence.
  return new IssuerLifecycleError('UPSTREAM_ERROR', 'Issuer service request failed');
};

export type ReviewQueueItem = Readonly<{
  session: LifecycleSession;
  canReview: boolean;
  approvals: number;
  requiredApprovals: number;
}>;

export type BulkOutcome<T> = Readonly<
  | { index: number; status: 'fulfilled'; value: T }
  | { index: number; status: 'rejected'; error: Readonly<{ code: IssuerLifecycleError['code']; message: string }> }
>;

export type DangerousConfirmation = Readonly<{
  reauthenticated: boolean;
  confirmed: boolean;
}>;

/**
 * Thin controller for issuer administration. It carries no credential
 * artifacts and never persists evidence or protocol tokens.
 */
export class IssuerLifecycleController {
  constructor(private readonly api: LifecycleApi, private readonly now = () => Date.now()) {}

  async reviewQueue(
    principal: IssuerAdminPrincipal,
    sessionIds: readonly string[],
    signal?: AbortSignal,
  ): Promise<readonly ReviewQueueItem[]> {
    authorizeIssuerAdmin(principal, 'issuer:review:read', principal.tenantId);
    if (sessionIds.length > MAX_BULK_ROWS) fail('BATCH_LIMIT', 'Review queue is too large');
    const sessions = await Promise.all(
      sessionIds.map(async (sessionId) => {
        requireId(sessionId, 'sessionId');
        try {
          return await this.api.getIssuanceSession(principal.tenantId, sessionId, { signal });
        } catch (error) {
          throw safeError(error);
        }
      }),
    );
    return Object.freeze(
      sessions
        .filter((session) => session.state === 'pending_review')
        .map((session) => {
          const approvals = session.reviews.filter((review) => review.decision === 'approved').length;
          // Reviewer policy cardinality is intentionally not fetched here. The
          // service remains authoritative; the queue exposes observed reviews.
          return Object.freeze({
            session,
            canReview: !session.reviews.some((review) => review.reviewerId === principal.principalId),
            approvals,
            requiredApprovals: approvals + 1,
          });
        }),
    );
  }

  async review(
    principal: IssuerAdminPrincipal,
    sessionId: string,
    decision: 'approved' | 'rejected',
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<LifecycleSession> {
    authorizeIssuerAdmin(principal, 'issuer:review:write', principal.tenantId);
    requireId(sessionId, 'sessionId');
    if (decision !== 'approved' && decision !== 'rejected') fail('INVALID_REQUEST', 'review decision is invalid');
    const current = await this.api.getIssuanceSession(principal.tenantId, sessionId, { signal });
    if (current.state !== 'pending_review') fail('INVALID_STATE', 'Issuance session is not reviewable');
    if (current.reviews.some((review) => review.reviewerId === principal.principalId))
      fail('INVALID_STATE', 'Reviewer has already recorded a decision');
    try {
      return await this.api.reviewIssuance(
        principal.tenantId,
        sessionId,
        { decision },
        options(idempotencyKey, signal),
      );
    } catch (error) {
      throw safeError(error);
    }
  }

  async issueApproved(
    principal: IssuerAdminPrincipal,
    sessionId: string,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<Readonly<Record<string, unknown>>> {
    authorizeIssuerAdmin(principal, 'issuer:issuance:write', principal.tenantId);
    requireId(sessionId, 'sessionId');
    const current = await this.api.getIssuanceSession(principal.tenantId, sessionId, { signal });
    if (!isApproved(current)) fail('SESSION_NOT_APPROVED', 'Issuance requires the configured approvals');
    if (current.reviews.some((review) => review.reviewerId === principal.principalId))
      fail('ROLE_SEPARATION', 'A reviewer cannot issue the same session');
    if (current.expiresAt <= this.now()) fail('INVALID_STATE', 'Issuance session has expired');
    try {
      return await this.api.createOffer(
        principal.tenantId,
        sessionId,
        { flow: 'pre-authorized_code' },
        options(idempotencyKey, signal),
      );
    } catch (error) {
      throw safeError(error);
    }
  }

  async bulkCreate(
    principal: IssuerAdminPrincipal,
    requests: readonly LifecycleIssuanceInput[],
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<readonly BulkOutcome<LifecycleSession>[]> {
    authorizeIssuerAdmin(principal, 'issuer:issuance:write', principal.tenantId);
    if (requests.length === 0 || requests.length > MAX_BULK_ROWS)
      fail('BATCH_LIMIT', `Bulk issuance must contain 1-${MAX_BULK_ROWS} rows`);
    const rootKey = requireIdempotency(idempotencyKey);
    const results: BulkOutcome<LifecycleSession>[] = [];
    for (const [index, request] of requests.entries()) {
      try {
        const rowKey = `${rootKey}:${index}`;
        requireIdempotency(rowKey);
        const value = await this.api.createIssuanceRequest(
          principal.tenantId,
          request,
          options(rowKey, signal),
        );
        results.push(Object.freeze({ index, status: 'fulfilled', value }));
      } catch (error) {
        const safe = safeError(error);
        results.push(
          Object.freeze({
            index,
            status: 'rejected',
            error: Object.freeze({ code: safe.code, message: safe.message }),
          }),
        );
      }
    }
    return Object.freeze(results);
  }

  async reissue(
    principal: IssuerAdminPrincipal,
    credentialId: string,
    request: LifecycleIssuanceInput,
    confirmation: DangerousConfirmation,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<LifecycleSession> {
    return this.dangerous(
      principal,
      credentialId,
      confirmation,
      'reissue',
      () => this.api.reissueCredential(principal.tenantId, credentialId, request, options(idempotencyKey, signal)),
    );
  }

  async suspend(
    principal: IssuerAdminPrincipal,
    credentialId: string,
    confirmation: DangerousConfirmation,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<LifecycleCredential> {
    return this.dangerous(
      principal,
      credentialId,
      confirmation,
      'suspend',
      () => this.api.suspendCredential(principal.tenantId, credentialId, options(idempotencyKey, signal)),
    );
  }

  async revoke(
    principal: IssuerAdminPrincipal,
    credentialId: string,
    confirmation: DangerousConfirmation,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<LifecycleCredential> {
    return this.dangerous(
      principal,
      credentialId,
      confirmation,
      'revoke',
      () => this.api.revokeCredential(principal.tenantId, credentialId, options(idempotencyKey, signal)),
    );
  }

  private async dangerous<T>(
    principal: IssuerAdminPrincipal,
    credentialId: string,
    confirmation: DangerousConfirmation,
    action: 'reissue' | 'suspend' | 'revoke',
    operation: () => Promise<T>,
  ): Promise<T> {
    authorizeIssuerAdmin(principal, 'issuer:lifecycle:write', principal.tenantId);
    requireId(credentialId, 'credentialId');
    if (!principal.reauthenticated || !confirmation.reauthenticated)
      fail('STEP_UP_REQUIRED', `Step-up authentication required for ${action}`);
    if (!confirmation.confirmed)
      fail('CONFIRMATION_REQUIRED', `Explicit confirmation required for ${action}`);
    try {
      return await operation();
    } catch (error) {
      throw safeError(error);
    }
  }
}

export type { LifecycleApi as IssuerLifecycleApi };
