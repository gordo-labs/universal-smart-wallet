import {
  parseCredentialTemplate,
  parseIssuerProfile,
  type AssuranceLevel,
  type CredentialTemplate,
  type IssuerProfile,
  type SubjectBinding,
} from '@ssw/credential-domain';
import { CREDENTIAL_FORMAT_PINS } from '@ssw/credential-formats';
import {
  parseVerificationPolicy,
  type VerificationPolicy,
} from '@ssw/verifier-service';

/**
 * Synthetic enterprise journeys are deliberately policy fixtures, not an
 * employment system. They demonstrate tenant-scoped issuance and verification
 * without carrying employee names, contact details, payroll, or legal claims.
 */
export const ENTERPRISE_USE_CASE_VERSION = 1 as const;
export const ENTERPRISE_TENANT_ID = 'enterprise-synthetic-acme';
export const ENTERPRISE_ISSUER_ID = 'enterprise-issuer-synthetic';
export const ENTERPRISE_ISSUER_URI =
  'https://issuer.synthetic.example/enterprise';
export const ENTERPRISE_FORMAT = 'sd-jwt-vc' as const;
export const ENTERPRISE_JURISDICTION = 'synthetic-enterprise-eu-test';
export const ENTERPRISE_DEFAULT_NOW = Date.parse('2026-08-06T12:00:00.000Z');

export type EnterpriseJourneyId =
  | 'employment'
  | 'training'
  | 'access'
  | 'representation';
export type EnterpriseCredentialStatus = 'valid' | 'revoked';

export type EnterpriseIssuerPolicy = {
  readonly schemaVersion: 1;
  readonly policyId: string;
  readonly tenantId: typeof ENTERPRISE_TENANT_ID;
  readonly templateId: string;
  readonly requiredApprovals: 2;
  readonly authorizedReviewerIds: readonly [
    'enterprise-reviewer-a',
    'enterprise-reviewer-b',
  ];
};

export type EnterpriseAuthorityBoundary = {
  readonly issuerId: typeof ENTERPRISE_ISSUER_ID;
  readonly tenantId: typeof ENTERPRISE_TENANT_ID;
  readonly mayIssue: readonly string[];
  readonly mayVerify: readonly string[];
  readonly mayNotIssue: readonly string[];
  readonly notes: readonly string[];
};

export type EnterpriseFixture = {
  readonly fixtureId: string;
  readonly tenantId: typeof ENTERPRISE_TENANT_ID;
  readonly subjectBinding: SubjectBinding;
  readonly claims: Readonly<Record<string, string>>;
  readonly status: EnterpriseCredentialStatus;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly evidenceReference: {
    readonly evidenceId: string;
    readonly kind: 'synthetic-record-check';
    readonly source: 'synthetic-fixture';
  };
};

export type EnterpriseCredentialPack = {
  readonly id: EnterpriseJourneyId;
  readonly title: string;
  readonly template: CredentialTemplate;
  readonly issuer: IssuerProfile;
  readonly issuerPolicy: EnterpriseIssuerPolicy;
  readonly verifierPolicy: VerificationPolicy;
  readonly fixture: EnterpriseFixture;
  readonly authority: EnterpriseAuthorityBoundary;
};

export type EnterpriseRunOptions = {
  /** Clock injection keeps tests deterministic and avoids wall-clock trust. */
  readonly now?: number;
  /** The verifier tenant must match the credential tenant exactly. */
  readonly tenantId?: string;
  /** Synthetic status overrides model registry transitions without a service. */
  readonly statusByJourney?: Partial<
    Readonly<Record<EnterpriseJourneyId, EnterpriseCredentialStatus>>
  >;
  /** Required representation scope, when an application needs a narrower one. */
  readonly requiredRepresentationScope?: string;
};

export type EnterpriseJourneyResult = {
  readonly ok: boolean;
  readonly version: 1;
  readonly journeyId: EnterpriseJourneyId;
  readonly credentialId: string;
  readonly status: 'verified' | 'rejected';
  readonly reasonCode:
    | 'VERIFIED'
    | 'CREDENTIAL_REVOKED'
    | 'CREDENTIAL_EXPIRED'
    | 'DEPENDENCY_REVOKED'
    | 'DEPENDENCY_EXPIRED'
    | 'CROSS_TENANT'
    | 'REPRESENTATION_SCOPE_MISSING'
    | 'FIXTURE_INVALID';
  readonly tenantId: typeof ENTERPRISE_TENANT_ID;
  readonly templateId: string;
  readonly issuerPolicyId: string;
  readonly verifierPolicyId: string;
  readonly disclosedClaims: Readonly<Record<string, string>>;
  readonly representationScope?: string;
  readonly authority: EnterpriseAuthorityBoundary;
};

export class EnterpriseUseCaseError extends Error {
  constructor(
    readonly code:
      | 'UNKNOWN_JOURNEY'
      | 'UNAUTHORIZED_CREDENTIAL_TYPE'
      | 'CROSS_TENANT'
      | 'MISSING_REQUIRED_CLAIM'
      | 'FIXTURE_INVALID',
    message: string = code,
  ) {
    super(message);
    this.name = 'EnterpriseUseCaseError';
  }
}
const pin = CREDENTIAL_FORMAT_PINS[ENTERPRISE_FORMAT];
const claim = (
  name: string,
  type: 'string' | 'date',
  required = true,
): CredentialTemplate['claims'][number] => ({
  name,
  type,
  required,
  selectivelyDisclosable: true,
});

const template = (
  templateId: string,
  type: string,
  claims: readonly CredentialTemplate['claims'][number][],
): CredentialTemplate =>
  parseCredentialTemplate({
    schemaVersion: 1,
    tenantId: ENTERPRISE_TENANT_ID,
    templateId,
    version: 1,
    type,
    assurance: 'institutional' satisfies AssuranceLevel,
    formats: [ENTERPRISE_FORMAT],
    claims,
    status: 'published',
  });

const issuer = (templateIds: readonly string[]): IssuerProfile =>
  parseIssuerProfile({
    schemaVersion: 1,
    tenantId: ENTERPRISE_TENANT_ID,
    issuerId: ENTERPRISE_ISSUER_ID,
    issuerUri: ENTERPRISE_ISSUER_URI,
    assurance: 'institutional',
    keyRef: 'synthetic-enterprise-kms-key-v1',
    authorizedTemplateIds: templateIds,
  });

const issuerPolicy = (
  id: EnterpriseJourneyId,
  templateId: string,
): EnterpriseIssuerPolicy =>
  Object.freeze({
    schemaVersion: 1,
    policyId: `enterprise-${id}-dual-review-v1`,
    tenantId: ENTERPRISE_TENANT_ID,
    templateId,
    requiredApprovals: 2,
    authorizedReviewerIds: [
      'enterprise-reviewer-a',
      'enterprise-reviewer-b',
    ] as const,
  });

const verifierPolicy = (
  id: EnterpriseJourneyId,
  templateValue: CredentialTemplate,
  requiredClaims: readonly string[],
): VerificationPolicy =>
  parseVerificationPolicy({
    schemaVersion: 1,
    policyId: `enterprise-${id}-verification-v1`,
    tenantId: ENTERPRISE_TENANT_ID,
    jurisdiction: ENTERPRISE_JURISDICTION,
    format: ENTERPRISE_FORMAT,
    profile: pin.profile,
    version: pin.version,
    schemaId: `urn:ssw:synthetic:enterprise:${templateValue.templateId}:v${templateValue.version}`,
    credentialTypes: [templateValue.type],
    requestedClaims: requiredClaims.map((name) => ({ name })),
    requireHolderBinding: true,
    acceptedIssuers: [ENTERPRISE_ISSUER_URI],
  });

const fixture = (
  id: EnterpriseJourneyId,
  claims: Readonly<Record<string, string>>,
  expiresAt: number,
): EnterpriseFixture => ({
  fixtureId: `synthetic-enterprise-${id}-fixture-v1`,
  tenantId: ENTERPRISE_TENANT_ID,
  subjectBinding: {
    schemaVersion: 1,
    bindingId: `synthetic-enterprise-${id}-binding-v1`,
    method: 'jwk-thumbprint',
    value: `synthetic-enterprise-${id}-holder-thumbprint`,
  },
  claims,
  status: 'valid',
  issuedAt: Date.parse('2026-01-01T00:00:00.000Z'),
  expiresAt,
  evidenceReference: {
    evidenceId: `synthetic-enterprise-${id}-record-v1`,
    kind: 'synthetic-record-check',
    source: 'synthetic-fixture',
  },
});

const boundary = (templateId: string): EnterpriseAuthorityBoundary => ({
  issuerId: ENTERPRISE_ISSUER_ID,
  tenantId: ENTERPRISE_TENANT_ID,
  mayIssue: [templateId],
  mayVerify: [templateId],
  mayNotIssue: ['payroll-record', 'government-identity', 'legal-power-of-attorney'],
  notes: [
    'Synthetic enterprise tenant authority only.',
    'Representation scope is an explicit application claim, not legal power of attorney.',
    'Employment and access decisions fail closed on revocation or expiry.',
  ],
});

const makePack = (
  id: EnterpriseJourneyId,
  title: string,
  templateValue: CredentialTemplate,
  claims: Readonly<Record<string, string>>,
  requiredClaims: readonly string[],
  expiresAt: number,
): EnterpriseCredentialPack =>
  Object.freeze({
    id,
    title,
    template: templateValue,
    issuer: issuer([templateValue.templateId]),
    issuerPolicy: issuerPolicy(id, templateValue.templateId),
    verifierPolicy: verifierPolicy(id, templateValue, requiredClaims),
    fixture: fixture(id, claims, expiresAt),
    authority: boundary(templateValue.templateId),
  });

const employment = template(
  'enterprise-employment',
  'SyntheticEnterpriseEmploymentCredential',
  [
    claim('employeeRef', 'string'),
    claim('employmentStatus', 'string'),
    claim('roleCode', 'string'),
    claim('departmentCode', 'string'),
    claim('validFrom', 'date'),
    claim('validUntil', 'date'),
  ],
);
const training = template(
  'enterprise-training',
  'SyntheticEnterpriseTrainingCredential',
  [
    claim('employeeRef', 'string'),
    claim('trainingCode', 'string'),
    claim('completionStatus', 'string'),
    claim('completedOn', 'date'),
    claim('validUntil', 'date'),
  ],
);
const access = template(
  'enterprise-access',
  'SyntheticEnterpriseAccessCredential',
  [
    claim('employeeRef', 'string'),
    claim('resourceScope', 'string'),
    claim('accessLevel', 'string'),
    claim('validFrom', 'date'),
    claim('validUntil', 'date'),
  ],
);
const representation = template(
  'enterprise-representation',
  'SyntheticEnterpriseRepresentationCredential',
  [
    claim('representativeRef', 'string'),
    claim('representedTenant', 'string'),
    claim('representationScope', 'string'),
    claim('authorizedAction', 'string'),
    claim('validFrom', 'date'),
    claim('validUntil', 'date'),
  ],
);

const validUntil = Date.parse('2027-01-01T00:00:00.000Z');
export const ENTERPRISE_PACKS: Readonly<
  Record<EnterpriseJourneyId, EnterpriseCredentialPack>
> = Object.freeze({
  employment: makePack(
    'employment',
    'Synthetic employment credential',
    employment,
    {
      employeeRef: 'synthetic-employee-001',
      employmentStatus: 'active',
      roleCode: 'synthetic-engineer',
      departmentCode: 'synthetic-platform',
      validFrom: '2026-01-01',
      validUntil: '2027-01-01',
    },
    ['employeeRef', 'employmentStatus', 'roleCode', 'departmentCode', 'validFrom', 'validUntil'],
    validUntil,
  ),
  training: makePack(
    'training',
    'Synthetic training completion credential',
    training,
    {
      employeeRef: 'synthetic-employee-001',
      trainingCode: 'synthetic-secure-coding-101',
      completionStatus: 'completed',
      completedOn: '2026-03-15',
      validUntil: '2027-03-15',
    },
    ['employeeRef', 'trainingCode', 'completionStatus', 'completedOn', 'validUntil'],
    Date.parse('2027-03-16T00:00:00.000Z'),
  ),
  access: makePack(
    'access',
    'Synthetic resource access credential',
    access,
    {
      employeeRef: 'synthetic-employee-001',
      resourceScope: 'synthetic-project-alpha:read',
      accessLevel: 'read',
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
    },
    ['employeeRef', 'resourceScope', 'accessLevel', 'validFrom', 'validUntil'],
    Date.parse('2027-01-01T00:00:00.000Z'),
  ),
  representation: makePack(
    'representation',
    'Synthetic scoped representation credential',
    representation,
    {
      representativeRef: 'synthetic-representative-001',
      representedTenant: ENTERPRISE_TENANT_ID,
      representationScope: 'procurement:approve',
      authorizedAction: 'approve-synthetic-purchase-order',
      validFrom: '2026-01-01',
      validUntil: '2026-11-30',
    },
    [
      'representativeRef',
      'representedTenant',
      'representationScope',
      'authorizedAction',
      'validFrom',
      'validUntil',
    ],
    Date.parse('2026-12-01T00:00:00.000Z'),
  ),
});

export const ENTERPRISE_TEMPLATES = Object.freeze(
  Object.values(ENTERPRISE_PACKS).map((pack) => pack.template),
);
export const ENTERPRISE_ISSUER_POLICIES = Object.freeze(
  Object.values(ENTERPRISE_PACKS).map((pack) => pack.issuerPolicy),
);
export const ENTERPRISE_VERIFIER_POLICIES = Object.freeze(
  Object.values(ENTERPRISE_PACKS).map((pack) => pack.verifierPolicy),
);
export const ENTERPRISE_FIXTURES = Object.freeze(
  Object.values(ENTERPRISE_PACKS).map((pack) => pack.fixture),
);

export function getEnterprisePack(
  id: EnterpriseJourneyId,
): EnterpriseCredentialPack {
  const pack = ENTERPRISE_PACKS[id];
  if (!pack) throw new EnterpriseUseCaseError('UNKNOWN_JOURNEY');
  return pack;
}

export function assertAuthorizedEnterpriseType(type: string): void {
  if (!ENTERPRISE_TEMPLATES.some((item) => item.type === type))
    throw new EnterpriseUseCaseError(
      'UNAUTHORIZED_CREDENTIAL_TYPE',
      'credential type is outside enterprise tenant authority',
    );
}

const rejected = (
  pack: EnterpriseCredentialPack,
  reasonCode: EnterpriseJourneyResult['reasonCode'],
): EnterpriseJourneyResult => ({
  ok: false,
  version: ENTERPRISE_USE_CASE_VERSION,
  journeyId: pack.id,
  credentialId: `synthetic-enterprise-${pack.id}-credential-v1`,
  status: 'rejected',
  reasonCode,
  tenantId: ENTERPRISE_TENANT_ID,
  templateId: pack.template.templateId,
  issuerPolicyId: pack.issuerPolicy.policyId,
  verifierPolicyId: pack.verifierPolicy.policyId,
  disclosedClaims: {},
  authority: pack.authority,
});

export function runEnterpriseJourney(
  id: EnterpriseJourneyId,
  options: EnterpriseRunOptions = {},
): EnterpriseJourneyResult {
  const pack = getEnterprisePack(id);
  assertAuthorizedEnterpriseType(pack.template.type);
  if (options.tenantId !== undefined && options.tenantId !== ENTERPRISE_TENANT_ID)
    return rejected(pack, 'CROSS_TENANT');

  const now = options.now ?? ENTERPRISE_DEFAULT_NOW;
  if (!Number.isSafeInteger(now)) return rejected(pack, 'FIXTURE_INVALID');
  const status = options.statusByJourney?.[id] ?? pack.fixture.status;
  if (status === 'revoked') return rejected(pack, 'CREDENTIAL_REVOKED');
  if (now >= pack.fixture.expiresAt) return rejected(pack, 'CREDENTIAL_EXPIRED');

  if (id === 'access') {
    const employmentStatus = options.statusByJourney?.employment ?? 'valid';
    if (employmentStatus === 'revoked') return rejected(pack, 'DEPENDENCY_REVOKED');
    if (now >= ENTERPRISE_PACKS.employment.fixture.expiresAt)
      return rejected(pack, 'DEPENDENCY_EXPIRED');
  }

  const representationScope = pack.fixture.claims.representationScope;
  if (
    id === 'representation' &&
    options.requiredRepresentationScope !== undefined &&
    options.requiredRepresentationScope !== representationScope
  )
    return rejected(pack, 'REPRESENTATION_SCOPE_MISSING');

  const required = new Set(
    pack.verifierPolicy.requestedClaims.map((item) => item.name),
  );
  for (const name of required)
    if (!(name in pack.fixture.claims)) return rejected(pack, 'FIXTURE_INVALID');
  if (
    pack.authority.mayIssue.length !== 1 ||
    pack.authority.mayVerify.length !== 1 ||
    pack.fixture.tenantId !== pack.verifierPolicy.tenantId
  )
    return rejected(pack, 'FIXTURE_INVALID');

  return {
    ok: true,
    version: ENTERPRISE_USE_CASE_VERSION,
    journeyId: id,
    credentialId: `synthetic-enterprise-${id}-credential-v1`,
    status: 'verified',
    reasonCode: 'VERIFIED',
    tenantId: ENTERPRISE_TENANT_ID,
    templateId: pack.template.templateId,
    issuerPolicyId: pack.issuerPolicy.policyId,
    verifierPolicyId: pack.verifierPolicy.policyId,
    disclosedClaims: Object.fromEntries(
      [...required].map((name) => [name, pack.fixture.claims[name]]),
    ),
    ...(id === 'representation' ? { representationScope } : {}),
    authority: pack.authority,
  };
}
