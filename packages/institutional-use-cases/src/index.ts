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

export const UNIVERSITY_USE_CASE_VERSION = 1 as const;
export const UNIVERSITY_TENANT_ID = 'university-synthetic';
export const UNIVERSITY_ISSUER_ID = 'university-registrar-synthetic';
export const UNIVERSITY_ISSUER_URI =
  'https://issuer.synthetic.example/university';
export const UNIVERSITY_FORMAT = 'sd-jwt-vc' as const;
export const UNIVERSITY_JURISDICTION = 'synthetic-eu-test';

export type UniversityJourneyId = 'enrollment' | 'diploma' | 'qualification';

export type UniversityIssuerPolicy = {
  readonly schemaVersion: 1;
  readonly policyId: string;
  readonly tenantId: typeof UNIVERSITY_TENANT_ID;
  readonly templateId: string;
  readonly requiredApprovals: 2;
  readonly authorizedReviewerIds: readonly [
    'registrar-reviewer-a',
    'registrar-reviewer-b',
  ];
};

export type UniversityAuthorityBoundary = {
  readonly issuerId: typeof UNIVERSITY_ISSUER_ID;
  readonly mayIssue: readonly string[];
  readonly mayVerify: readonly string[];
  readonly mayNotIssue: readonly string[];
  readonly notes: readonly string[];
};

export type UniversityFixture = {
  readonly fixtureId: string;
  readonly subjectBinding: SubjectBinding;
  readonly claims: Readonly<Record<string, string>>;
  readonly evidenceReference: {
    readonly evidenceId: string;
    readonly kind: 'synthetic-record-check';
    readonly source: 'synthetic-fixture';
  };
};

export type UniversityCredentialPack = {
  readonly id: UniversityJourneyId;
  readonly title: string;
  readonly template: CredentialTemplate;
  readonly issuer: IssuerProfile;
  readonly issuerPolicy: UniversityIssuerPolicy;
  readonly verifierPolicy: VerificationPolicy;
  readonly fixture: UniversityFixture;
  readonly authority: UniversityAuthorityBoundary;
};

export type UniversityJourneyResult = {
  readonly ok: true;
  readonly version: 1;
  readonly journeyId: UniversityJourneyId;
  readonly credentialId: string;
  readonly status: 'issued' | 'verified';
  readonly templateId: string;
  readonly issuerPolicyId: string;
  readonly verifierPolicyId: string;
  readonly disclosedClaims: Readonly<Record<string, string>>;
  readonly authority: UniversityAuthorityBoundary;
  readonly events: readonly [
    'synthetic-evidence-reviewed',
    'dual-approval-recorded',
    'credential-issued',
    'presentation-verified',
  ];
};

export class UniversityUseCaseError extends Error {
  constructor(
    readonly code:
      | 'UNKNOWN_JOURNEY'
      | 'UNAUTHORIZED_CREDENTIAL_TYPE'
      | 'MISSING_REQUIRED_CLAIM'
      | 'FIXTURE_INVALID',
    message: string = code,
  ) {
    super(message);
    this.name = 'UniversityUseCaseError';
  }
}

const pin = CREDENTIAL_FORMAT_PINS[UNIVERSITY_FORMAT];
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
    tenantId: UNIVERSITY_TENANT_ID,
    templateId,
    version: 1,
    type,
    assurance: 'institutional' satisfies AssuranceLevel,
    formats: [UNIVERSITY_FORMAT],
    claims,
    status: 'published',
  });

const issuer = (templateIds: readonly string[]): IssuerProfile =>
  parseIssuerProfile({
    schemaVersion: 1,
    tenantId: UNIVERSITY_TENANT_ID,
    issuerId: UNIVERSITY_ISSUER_ID,
    issuerUri: UNIVERSITY_ISSUER_URI,
    assurance: 'institutional',
    keyRef: 'synthetic-university-kms-key-v1',
    authorizedTemplateIds: templateIds,
  });

const issuerPolicy = (id: UniversityJourneyId, templateId: string): UniversityIssuerPolicy =>
  Object.freeze({
    schemaVersion: 1,
    policyId: `university-${id}-dual-review-v1`,
    tenantId: UNIVERSITY_TENANT_ID,
    templateId,
    requiredApprovals: 2,
    authorizedReviewerIds: [
      'registrar-reviewer-a',
      'registrar-reviewer-b',
    ] as const,
  });

const verifierPolicy = (
  id: UniversityJourneyId,
  template: CredentialTemplate,
  requiredClaims: readonly string[],
): VerificationPolicy =>
  parseVerificationPolicy({
    schemaVersion: 1,
    policyId: `university-${id}-verification-v1`,
    tenantId: UNIVERSITY_TENANT_ID,
    jurisdiction: UNIVERSITY_JURISDICTION,
    format: UNIVERSITY_FORMAT,
    profile: pin.profile,
    version: pin.version,
    schemaId: `urn:ssw:synthetic:university:${template.templateId}:v${template.version}`,
    credentialTypes: [template.type],
    requestedClaims: requiredClaims.map((name) => ({ name })),
    requireHolderBinding: true,
    acceptedIssuers: [UNIVERSITY_ISSUER_URI],
  });

const fixture = (
  id: UniversityJourneyId,
  claims: Readonly<Record<string, string>>,
): UniversityFixture => ({
  fixtureId: `synthetic-university-${id}-fixture-v1`,
  subjectBinding: {
    schemaVersion: 1,
    bindingId: `synthetic-${id}-binding-v1`,
    method: 'jwk-thumbprint',
    value: `synthetic-${id}-holder-thumbprint`,
  },
  claims,
  evidenceReference: {
    evidenceId: `synthetic-${id}-record-v1`,
    kind: 'synthetic-record-check',
    source: 'synthetic-fixture',
  },
});

const boundary = (templateId: string): UniversityAuthorityBoundary => ({
  issuerId: UNIVERSITY_ISSUER_ID,
  mayIssue: [templateId],
  mayVerify: [templateId],
  mayNotIssue: ['government-identity', 'government-driving-licence'],
  notes: [
    'Synthetic university registrar authority only.',
    'Institutional assurance does not imply a government or qualified status.',
    'A university may attest qualification; a competent authority issues licences.',
  ],
});

const makePack = (
  id: UniversityJourneyId,
  title: string,
  templateValue: CredentialTemplate,
  claims: Readonly<Record<string, string>>,
  requiredClaims: readonly string[],
): UniversityCredentialPack =>
  Object.freeze({
    id,
    title,
    template: templateValue,
    issuer: issuer([templateValue.templateId]),
    issuerPolicy: issuerPolicy(id, templateValue.templateId),
    verifierPolicy: verifierPolicy(id, templateValue, requiredClaims),
    fixture: fixture(id, claims),
    authority: boundary(templateValue.templateId),
  });

const enrollment = template(
  'university-enrollment',
  'SyntheticUniversityEnrollmentCredential',
  [
    claim('studentRef', 'string'),
    claim('programmeCode', 'string'),
    claim('enrollmentStatus', 'string'),
    claim('validFrom', 'date'),
    claim('validUntil', 'date', false),
  ],
);
const diploma = template(
  'university-diploma',
  'SyntheticUniversityDiplomaCredential',
  [
    claim('studentRef', 'string'),
    claim('awardTitle', 'string'),
    claim('qualificationLevel', 'string'),
    claim('graduatedOn', 'date'),
    claim('gradeBand', 'string', false),
  ],
);
const qualification = template(
  'university-qualification',
  'SyntheticUniversityQualificationCredential',
  [
    claim('studentRef', 'string'),
    claim('qualificationCode', 'string'),
    claim('qualificationLevel', 'string'),
    claim('awardedOn', 'date'),
    claim('validUntil', 'date', false),
  ],
);

export const UNIVERSITY_PACKS: Readonly<Record<UniversityJourneyId, UniversityCredentialPack>> =
  Object.freeze({
    enrollment: makePack(
      'enrollment',
      'Synthetic enrollment credential',
      enrollment,
      {
        studentRef: 'synthetic-student-001',
        programmeCode: 'SYN-COMP-01',
        enrollmentStatus: 'active',
        validFrom: '2026-09-01',
        validUntil: '2027-08-31',
      },
      ['studentRef', 'programmeCode', 'enrollmentStatus', 'validFrom'],
    ),
    diploma: makePack(
      'diploma',
      'Synthetic diploma credential',
      diploma,
      {
        studentRef: 'synthetic-student-001',
        awardTitle: 'Synthetic Computing',
        qualificationLevel: 'synthetic-level-7',
        graduatedOn: '2026-06-30',
        gradeBand: 'synthetic-distinction',
      },
      ['studentRef', 'awardTitle', 'qualificationLevel', 'graduatedOn'],
    ),
    qualification: makePack(
      'qualification',
      'Synthetic professional qualification credential',
      qualification,
      {
        studentRef: 'synthetic-student-001',
        qualificationCode: 'SYN-QA-01',
        qualificationLevel: 'synthetic-professional',
        awardedOn: '2026-07-01',
        validUntil: '2029-07-01',
      },
      ['studentRef', 'qualificationCode', 'qualificationLevel', 'awardedOn'],
    ),
  });

export const UNIVERSITY_TEMPLATES = Object.freeze(
  Object.values(UNIVERSITY_PACKS).map((pack) => pack.template),
);
export const UNIVERSITY_ISSUER_POLICIES = Object.freeze(
  Object.values(UNIVERSITY_PACKS).map((pack) => pack.issuerPolicy),
);
export const UNIVERSITY_VERIFIER_POLICIES = Object.freeze(
  Object.values(UNIVERSITY_PACKS).map((pack) => pack.verifierPolicy),
);
export const UNIVERSITY_FIXTURES = Object.freeze(
  Object.values(UNIVERSITY_PACKS).map((pack) => pack.fixture),
);

export function getUniversityPack(id: UniversityJourneyId): UniversityCredentialPack {
  const pack = UNIVERSITY_PACKS[id];
  if (!pack) throw new UniversityUseCaseError('UNKNOWN_JOURNEY');
  return pack;
}

export function assertAuthorizedUniversityType(type: string): void {
  if (!UNIVERSITY_TEMPLATES.some((item) => item.type === type))
    throw new UniversityUseCaseError(
      'UNAUTHORIZED_CREDENTIAL_TYPE',
      'credential type is outside university registrar authority',
    );
}

export function runUniversityJourney(
  id: UniversityJourneyId,
  options: { readonly credentialType?: string } = {},
): UniversityJourneyResult {
  const pack = getUniversityPack(id);
  assertAuthorizedUniversityType(options.credentialType ?? pack.template.type);
  const required = new Set(
    pack.verifierPolicy.requestedClaims.map((item) => item.name),
  );
  for (const name of required)
    if (!(name in pack.fixture.claims))
      throw new UniversityUseCaseError('MISSING_REQUIRED_CLAIM');
  if (pack.authority.mayIssue.length !== 1 || pack.authority.mayVerify.length !== 1)
    throw new UniversityUseCaseError('FIXTURE_INVALID');
  return {
    ok: true,
    version: UNIVERSITY_USE_CASE_VERSION,
    journeyId: id,
    credentialId: `synthetic-${id}-credential-v1`,
    status: 'verified',
    templateId: pack.template.templateId,
    issuerPolicyId: pack.issuerPolicy.policyId,
    verifierPolicyId: pack.verifierPolicy.policyId,
    disclosedClaims: Object.fromEntries(
      [...required].map((name) => [name, pack.fixture.claims[name]]),
    ),
    authority: pack.authority,
    events: [
      'synthetic-evidence-reviewed',
      'dual-approval-recorded',
      'credential-issued',
      'presentation-verified',
    ],
  };
}
