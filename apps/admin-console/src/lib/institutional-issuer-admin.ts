/**
 * Tenant-scoped administration primitives for institutional issuers.
 *
 * This module is deliberately an application boundary: it stores template
 * metadata and opaque signer references only. It never accepts private key
 * material, provider credentials, evidence documents, or credential payloads.
 * Production deployments should replace the in-memory stores with a durable
 * service that preserves the same invariants.
 */

export type InstitutionalAdminRole =
  | 'institutional-owner'
  | 'institutional-admin'
  | 'template-editor'
  | 'template-reviewer'
  | 'security-admin'
  | 'institutional-viewer';

export type InstitutionalAdminScope =
  | 'issuer:templates:read'
  | 'issuer:templates:write'
  | 'issuer:templates:review'
  | 'issuer:templates:publish'
  | 'issuer:signers:read'
  | 'issuer:signers:write';

const roleScopes: Record<
  InstitutionalAdminRole,
  readonly InstitutionalAdminScope[]
> = {
  'institutional-owner': [
    'issuer:templates:read',
    'issuer:templates:write',
    'issuer:templates:review',
    'issuer:templates:publish',
    'issuer:signers:read',
    'issuer:signers:write',
  ],
  'institutional-admin': [
    'issuer:templates:read',
    'issuer:templates:write',
    'issuer:templates:review',
    'issuer:templates:publish',
    'issuer:signers:read',
    'issuer:signers:write',
  ],
  'template-editor': [
    'issuer:templates:read',
    'issuer:templates:write',
  ],
  'template-reviewer': [
    'issuer:templates:read',
    'issuer:templates:review',
    'issuer:templates:publish',
  ],
  'security-admin': [
    'issuer:templates:read',
    'issuer:signers:read',
    'issuer:signers:write',
  ],
  'institutional-viewer': [
    'issuer:templates:read',
    'issuer:signers:read',
  ],
};

export interface InstitutionalAdminPrincipal {
  readonly tenantId: string;
  readonly principalId: string;
  readonly role: InstitutionalAdminRole;
  /** Optional intersection used for delegated, short-lived sessions. */
  readonly scopes?: readonly InstitutionalAdminScope[];
}

export type TemplateStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'published'
  | 'deprecated';

export type InstitutionalCredentialFormat =
  | 'sd-jwt-vc'
  | 'iso-mdoc'
  | 'w3c-vc-di';

export type InstitutionalAssurance =
  | 'institutional'
  | 'government'
  | 'pid'
  | 'eaa'
  | 'qeaa';

export type TemplateClaimType = 'string' | 'boolean' | 'number' | 'date';

export interface TemplateClaimDefinition {
  readonly name: string;
  readonly type: TemplateClaimType;
  readonly required: boolean;
  readonly selectivelyDisclosable: boolean;
}

export interface InstitutionalTemplate {
  readonly schemaVersion: 1;
  readonly tenantId: string;
  readonly templateId: string;
  readonly version: number;
  readonly type: string;
  readonly assurance: InstitutionalAssurance;
  readonly formats: readonly InstitutionalCredentialFormat[];
  readonly claims: readonly TemplateClaimDefinition[];
  readonly status: TemplateStatus;
  readonly createdBy: string;
  readonly updatedBy: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly submittedAt?: number;
  readonly reviewedAt?: number;
  readonly reviewedBy?: string;
  readonly publishedAt?: number;
  readonly deprecatedAt?: number;
  readonly rejectionReason?: string;
}

export type TemplateDraftInput = Readonly<{
  readonly templateId: string;
  readonly version: number;
  readonly type: string;
  readonly assurance: InstitutionalAssurance;
  readonly formats: readonly InstitutionalCredentialFormat[];
  readonly claims: readonly TemplateClaimDefinition[];
}>;

export type TemplatePatch = Readonly<
  Partial<Pick<TemplateDraftInput, 'type' | 'assurance' | 'formats' | 'claims'>>
>;

export type TemplateReviewDecision = Readonly<{
  readonly decision: 'approved' | 'rejected';
  readonly reason?: string;
}>;

export type SignerProvider =
  | 'aws-kms'
  | 'gcp-kms'
  | 'azure-key-vault'
  | 'network-hsm'
  | 'local-development';

export type SignerAlgorithm = 'ES256' | 'EdDSA';
export type SignerStatus = 'active' | 'standby' | 'disabled';

/** Public metadata only. `keyRef` is an opaque provider-side identifier. */
export interface OpaqueSignerConfiguration {
  readonly schemaVersion: 1;
  readonly tenantId: string;
  readonly signerId: string;
  readonly provider: SignerProvider;
  readonly keyRef: string;
  readonly algorithm: SignerAlgorithm;
  readonly status: SignerStatus;
  readonly keyVersion: string;
  readonly createdBy: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export type SignerConfigurationInput = Readonly<{
  readonly signerId: string;
  readonly provider: SignerProvider;
  readonly keyRef: string;
  readonly algorithm: SignerAlgorithm;
  readonly keyVersion: string;
  readonly status?: SignerStatus;
}>;

export class InstitutionalAdminError extends Error {
  constructor(
    readonly code:
      | 'INVALID_REQUEST'
      | 'TENANT_MISMATCH'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'CONFLICT'
      | 'IMMUTABLE_TEMPLATE'
      | 'INVALID_STATE'
      | 'SECRET_UNAVAILABLE',
    message: string,
  ) {
    super(message);
    this.name = 'InstitutionalAdminError';
  }
}

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const keyRefPattern = /^[A-Za-z0-9._:/=@+-]{3,256}$/u;
const secretLikePattern =
  /(-----BEGIN|private[_-]?key|secret|password|token|api[_-]?key|mnemonic)/iu;
const validFormats: readonly InstitutionalCredentialFormat[] = [
  'sd-jwt-vc',
  'iso-mdoc',
  'w3c-vc-di',
];
const validAssurance: readonly InstitutionalAssurance[] = [
  'institutional',
  'government',
  'pid',
  'eaa',
  'qeaa',
];

const fail = (
  code: ConstructorParameters<typeof InstitutionalAdminError>[0],
  message: string,
): never => {
  throw new InstitutionalAdminError(code, message);
};

const requireId = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !idPattern.test(value))
    fail('INVALID_REQUEST', `${field} is invalid`);
  return value as string;
};

const requireTime = (value: unknown): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    fail('INVALID_REQUEST', 'timestamp is invalid');
  return value as number;
};

const cloneFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>))
      cloneFreeze(child);
    Object.freeze(value);
  }
  return value;
};

const hasScope = (
  principal: InstitutionalAdminPrincipal,
  scope: InstitutionalAdminScope,
): boolean =>
  roleScopes[principal.role].includes(scope) &&
  (principal.scopes === undefined || principal.scopes.includes(scope));

export function authorizeInstitutional(
  principal: InstitutionalAdminPrincipal,
  scope: InstitutionalAdminScope,
  tenantId: string,
): void {
  requireId(tenantId, 'tenantId');
  if (principal.tenantId !== tenantId)
    fail('TENANT_MISMATCH', 'Tenant boundary violation');
  if (!hasScope(principal, scope))
    fail('FORBIDDEN', 'Insufficient institutional administrative scope');
}

const ensureDraftShape = (input: TemplateDraftInput): void => {
  requireId(input.templateId, 'templateId');
  requireId(input.type, 'type');
  if (!Number.isSafeInteger(input.version) || input.version < 1)
    fail('INVALID_REQUEST', 'template version is invalid');
  if (!validAssurance.includes(input.assurance))
    fail('INVALID_REQUEST', 'assurance is invalid');
  if (
    !Array.isArray(input.formats) ||
    input.formats.length === 0 ||
    input.formats.some((format) => !validFormats.includes(format)) ||
    new Set(input.formats).size !== input.formats.length
  )
    fail('INVALID_REQUEST', 'formats are invalid');
  if (
    !Array.isArray(input.claims) ||
    input.claims.length === 0 ||
    new Set(input.claims.map((claim) => claim.name)).size !== input.claims.length
  )
    fail('INVALID_REQUEST', 'claims are invalid');
  for (const claim of input.claims) {
    requireId(claim.name, 'claim name');
    if (!['string', 'boolean', 'number', 'date'].includes(claim.type))
      fail('INVALID_REQUEST', 'claim type is invalid');
    if (typeof claim.required !== 'boolean' || typeof claim.selectivelyDisclosable !== 'boolean')
      fail('INVALID_REQUEST', 'claim flags are invalid');
  }
};

const templateKey = (tenantId: string, templateId: string, version: number) =>
  `${tenantId}\0${templateId}\0${version}`;

export interface InstitutionalTemplateStore {
  createDraft(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    input: TemplateDraftInput,
    now?: number,
  ): InstitutionalTemplate;
  updateDraft(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    templateId: string,
    version: number,
    patch: TemplatePatch,
    now?: number,
  ): InstitutionalTemplate;
  submitForReview(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    templateId: string,
    version: number,
    now?: number,
  ): InstitutionalTemplate;
  review(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    templateId: string,
    version: number,
    decision: TemplateReviewDecision,
    now?: number,
  ): InstitutionalTemplate;
  publish(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    templateId: string,
    version: number,
    now?: number,
  ): InstitutionalTemplate;
  deprecate(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    templateId: string,
    version: number,
    now?: number,
  ): InstitutionalTemplate;
  get(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    templateId: string,
    version: number,
  ): InstitutionalTemplate;
  list(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
  ): readonly InstitutionalTemplate[];
}

/** Deterministic fixture for UI and unit tests; production uses a service port. */
export class InMemoryInstitutionalTemplateStore implements InstitutionalTemplateStore {
  private readonly templates = new Map<string, InstitutionalTemplate>();

  createDraft(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    input: TemplateDraftInput,
    now = Date.now(),
  ): InstitutionalTemplate {
    authorizeInstitutional(principal, 'issuer:templates:write', tenantId);
    ensureDraftShape(input);
    const key = templateKey(tenantId, input.templateId, input.version);
    if (this.templates.has(key)) fail('CONFLICT', 'Template version already exists');
    const time = requireTime(now);
    const template = cloneFreeze({
      schemaVersion: 1 as const,
      ...structuredClone(input),
      tenantId,
      status: 'draft' as const,
      createdBy: principal.principalId,
      updatedBy: principal.principalId,
      createdAt: time,
      updatedAt: time,
    });
    this.templates.set(key, template);
    return template;
  }

  updateDraft(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    templateId: string,
    version: number,
    patch: TemplatePatch,
    now = Date.now(),
  ): InstitutionalTemplate {
    authorizeInstitutional(principal, 'issuer:templates:write', tenantId);
    const current = this.find(principal, tenantId, templateId, version);
    if (current.status !== 'draft')
      fail('IMMUTABLE_TEMPLATE', 'Only draft templates can be edited');
    const candidate = {
      templateId: current.templateId,
      version: current.version,
      type: patch.type ?? current.type,
      assurance: patch.assurance ?? current.assurance,
      formats: patch.formats ?? current.formats,
      claims: patch.claims ?? current.claims,
    } satisfies TemplateDraftInput;
    ensureDraftShape(candidate);
    const updated = cloneFreeze({
      ...current,
      ...structuredClone(patch),
      updatedBy: principal.principalId,
      updatedAt: requireTime(now),
    });
    this.templates.set(templateKey(tenantId, templateId, version), updated);
    return updated;
  }

  submitForReview(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    templateId: string,
    version: number,
    now = Date.now(),
  ): InstitutionalTemplate {
    authorizeInstitutional(principal, 'issuer:templates:write', tenantId);
    const current = this.find(principal, tenantId, templateId, version);
    if (current.status !== 'draft') fail('INVALID_STATE', 'Template is not a draft');
    return this.replace(current, {
      status: 'in_review',
      submittedAt: requireTime(now),
      updatedBy: principal.principalId,
      updatedAt: requireTime(now),
    });
  }

  review(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    templateId: string,
    version: number,
    decision: TemplateReviewDecision,
    now = Date.now(),
  ): InstitutionalTemplate {
    authorizeInstitutional(principal, 'issuer:templates:review', tenantId);
    const current = this.find(principal, tenantId, templateId, version);
    if (current.status !== 'in_review') fail('INVALID_STATE', 'Template is not awaiting review');
    if (decision.decision !== 'approved' && decision.decision !== 'rejected')
      fail('INVALID_REQUEST', 'Review decision is invalid');
    if (decision.decision === 'rejected' && !decision.reason)
      fail('INVALID_REQUEST', 'Rejected templates require a reason');
    return this.replace(current, {
      status: decision.decision === 'approved' ? 'approved' : 'draft',
      reviewedAt: requireTime(now),
      reviewedBy: principal.principalId,
      rejectionReason: decision.decision === 'rejected' ? decision.reason : undefined,
      updatedBy: principal.principalId,
      updatedAt: requireTime(now),
    });
  }

  publish(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    templateId: string,
    version: number,
    now = Date.now(),
  ): InstitutionalTemplate {
    authorizeInstitutional(principal, 'issuer:templates:publish', tenantId);
    const current = this.find(principal, tenantId, templateId, version);
    if (current.status !== 'approved')
      fail('INVALID_STATE', 'Only approved templates can be published');
    return this.replace(current, {
      status: 'published',
      publishedAt: requireTime(now),
      updatedBy: principal.principalId,
      updatedAt: requireTime(now),
    });
  }

  deprecate(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    templateId: string,
    version: number,
    now = Date.now(),
  ): InstitutionalTemplate {
    authorizeInstitutional(principal, 'issuer:templates:publish', tenantId);
    const current = this.find(principal, tenantId, templateId, version);
    if (current.status !== 'published')
      fail('INVALID_STATE', 'Only published templates can be deprecated');
    return this.replace(current, {
      status: 'deprecated',
      deprecatedAt: requireTime(now),
      updatedBy: principal.principalId,
      updatedAt: requireTime(now),
    });
  }

  get(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    templateId: string,
    version: number,
  ): InstitutionalTemplate {
    authorizeInstitutional(principal, 'issuer:templates:read', tenantId);
    return this.find(principal, tenantId, templateId, version);
  }

  list(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
  ): readonly InstitutionalTemplate[] {
    authorizeInstitutional(principal, 'issuer:templates:read', tenantId);
    return Object.freeze(
      [...this.templates.values()].filter((template) => template.tenantId === tenantId),
    );
  }

  private find(
    _principal: InstitutionalAdminPrincipal,
    tenantId: string,
    templateId: string,
    version: number,
  ): InstitutionalTemplate {
    requireId(templateId, 'templateId');
    if (!Number.isSafeInteger(version) || version < 1)
      fail('INVALID_REQUEST', 'template version is invalid');
    const found = this.templates.get(templateKey(tenantId, templateId, version));
    if (!found) fail('NOT_FOUND', 'Template not found');
    return found as InstitutionalTemplate;
  }

  private replace(
    current: InstitutionalTemplate,
    patch: Partial<InstitutionalTemplate>,
  ): InstitutionalTemplate {
    const updated = cloneFreeze({ ...current, ...patch });
    this.templates.set(
      templateKey(current.tenantId, current.templateId, current.version),
      updated,
    );
    return updated;
  }
}

export interface InstitutionalSignerStore {
  register(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    input: SignerConfigurationInput,
    now?: number,
  ): OpaqueSignerConfiguration;
  setStatus(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    signerId: string,
    status: SignerStatus,
    now?: number,
  ): OpaqueSignerConfiguration;
  get(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    signerId: string,
  ): OpaqueSignerConfiguration;
  list(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
  ): readonly OpaqueSignerConfiguration[];
}

/** Stores only key references and public metadata; all secret-like input is rejected. */
export class InMemoryInstitutionalSignerStore implements InstitutionalSignerStore {
  private readonly signers = new Map<string, OpaqueSignerConfiguration>();

  register(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    input: SignerConfigurationInput,
    now = Date.now(),
  ): OpaqueSignerConfiguration {
    authorizeInstitutional(principal, 'issuer:signers:write', tenantId);
    requireId(input.signerId, 'signerId');
    if (!['aws-kms', 'gcp-kms', 'azure-key-vault', 'network-hsm', 'local-development'].includes(input.provider))
      fail('INVALID_REQUEST', 'signer provider is invalid');
    if (!['ES256', 'EdDSA'].includes(input.algorithm))
      fail('INVALID_REQUEST', 'signer algorithm is invalid');
    if (!keyRefPattern.test(input.keyRef) || secretLikePattern.test(input.keyRef))
      fail('SECRET_UNAVAILABLE', 'Only opaque non-secret key references are accepted');
    requireId(input.keyVersion, 'keyVersion');
    if (input.status !== undefined && !['active', 'standby', 'disabled'].includes(input.status))
      fail('INVALID_REQUEST', 'signer status is invalid');
    const key = `${tenantId}\0${input.signerId}`;
    if (this.signers.has(key)) fail('CONFLICT', 'Signer configuration already exists');
    const time = requireTime(now);
    const config = cloneFreeze({
      schemaVersion: 1 as const,
      tenantId,
      signerId: input.signerId,
      provider: input.provider,
      keyRef: input.keyRef,
      algorithm: input.algorithm,
      status: input.status ?? ('standby' as const),
      keyVersion: input.keyVersion,
      createdBy: principal.principalId,
      createdAt: time,
      updatedAt: time,
    });
    this.signers.set(key, config);
    return config as OpaqueSignerConfiguration;
  }

  setStatus(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    signerId: string,
    status: SignerStatus,
    now = Date.now(),
  ): OpaqueSignerConfiguration {
    authorizeInstitutional(principal, 'issuer:signers:write', tenantId);
    if (!['active', 'standby', 'disabled'].includes(status))
      fail('INVALID_REQUEST', 'signer status is invalid');
    const current = this.get(principal, tenantId, signerId);
    const config = cloneFreeze({
      ...current,
      status,
      updatedAt: requireTime(now),
    });
    this.signers.set(`${tenantId}\0${signerId}`, config);
    return config;
  }

  get(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    signerId: string,
  ): OpaqueSignerConfiguration {
    authorizeInstitutional(principal, 'issuer:signers:read', tenantId);
    requireId(signerId, 'signerId');
    const config = this.signers.get(`${tenantId}\0${signerId}`);
    if (!config) fail('NOT_FOUND', 'Signer configuration not found');
    return config as OpaqueSignerConfiguration;
  }

  list(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
  ): readonly OpaqueSignerConfiguration[] {
    authorizeInstitutional(principal, 'issuer:signers:read', tenantId);
    return Object.freeze(
      [...this.signers.values()].filter((config) => config.tenantId === tenantId),
    );
  }
}
