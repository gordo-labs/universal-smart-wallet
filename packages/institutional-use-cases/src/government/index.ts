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
 * Government examples are deliberately synthetic policy fixtures. They model
 * authority boundaries and verifier inputs; they do not confer legal status.
 */
export const GOVERNMENT_USE_CASE_VERSION = 1 as const;
export const GOVERNMENT_TENANT_ID = 'government-synthetic';
export const GOVERNMENT_ISSUER_ID = 'government-authority-synthetic';
export const GOVERNMENT_ISSUER_URI =
  'https://issuer.synthetic.example/government';
export const GOVERNMENT_FORMAT = 'sd-jwt-vc' as const;
export const GOVERNMENT_JURISDICTION = 'synthetic-eu-test';

export type GovernmentJourneyId =
  | 'residence'
  | 'permit'
  | 'public-licence'
  | 'pid-eaa';

export type GovernmentAuthorityType =
  | 'residence-registry'
  | 'permit-office'
  | 'public-licensing-authority'
  | 'pid-provider-policy';

export type GovernmentTrustMetadata = {
  readonly trustListId: string;
  readonly statusSnapshotId: string;
  readonly issuerUri: typeof GOVERNMENT_ISSUER_URI;
  /** Policy input only; this is not a qualified-provider assertion. */
  readonly suppliedAssuranceLabels: readonly ('pid' | 'eaa' | 'qualified')[];
  readonly source: 'synthetic-trust-fixture';
};

export type GovernmentIssuerPolicy = {
  readonly schemaVersion: 1;
  readonly policyId: string;
  readonly tenantId: typeof GOVERNMENT_TENANT_ID;
  readonly templateId: string;
  readonly requiredApprovals: 2;
  readonly authorizedReviewerIds: readonly [
    'government-reviewer-a',
    'government-reviewer-b',
  ];
  readonly authorityType: GovernmentAuthorityType;
};

export type GovernmentAuthorityBoundary = {
  readonly issuerId: typeof GOVERNMENT_ISSUER_ID;
  readonly authorityType: GovernmentAuthorityType;
  readonly jurisdiction: typeof GOVERNMENT_JURISDICTION;
  readonly mayIssue: readonly string[];
  readonly mayVerify: readonly string[];
  readonly mayNotIssue: readonly string[];
  readonly legalStatus: 'synthetic-policy-only';
  readonly notes: readonly string[];
};

export type GovernmentFixture = {
  readonly fixtureId: string;
  readonly subjectBinding: SubjectBinding;
  readonly claims: Readonly<Record<string, string>>;
  readonly evidenceReference: {
    readonly evidenceId: string;
    readonly kind: 'synthetic-record-check';
    readonly source: 'synthetic-fixture';
  };
  readonly trustMetadata?: GovernmentTrustMetadata;
};

export type GovernmentVerifierPolicy = VerificationPolicy & {
  readonly assuranceLabels: readonly AssuranceLevel[];
  readonly requiredTrustMetadata: boolean;
};

export type GovernmentCredentialPack = {
  readonly id: GovernmentJourneyId;
  readonly title: string;
  readonly template: CredentialTemplate;
  readonly issuer: IssuerProfile;
  readonly issuerPolicy: GovernmentIssuerPolicy;
  readonly verifierPolicy: GovernmentVerifierPolicy;
  readonly fixture: GovernmentFixture;
  readonly authority: GovernmentAuthorityBoundary;
};

export type GovernmentJourneyResult = {
  readonly ok: true;
  readonly version: 1;
  readonly journeyId: GovernmentJourneyId;
  readonly credentialId: string;
  readonly status: 'issued' | 'verified';
  readonly templateId: string;
  readonly issuerPolicyId: string;
  readonly verifierPolicyId: string;
  readonly disclosedClaims: Readonly<Record<string, string>>;
  readonly authority: GovernmentAuthorityBoundary;
  readonly trustMetadata?: GovernmentTrustMetadata;
  readonly events: readonly [
    'synthetic-evidence-reviewed',
    'dual-approval-recorded',
    'credential-issued',
    'presentation-verified',
  ];
};

export class GovernmentUseCaseError extends Error {
  constructor(
    readonly code:
      | 'UNKNOWN_JOURNEY'
      | 'UNAUTHORIZED_CREDENTIAL_TYPE'
      | 'MISSING_REQUIRED_CLAIM'
      | 'TRUST_METADATA_REQUIRED'
      | 'AUTHORITY_MISMATCH'
      | 'FIXTURE_INVALID',
    message: string = code,
  ) {
    super(message);
    this.name = 'GovernmentUseCaseError';
  }
}

const pin = CREDENTIAL_FORMAT_PINS[GOVERNMENT_FORMAT];

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
  assurance: AssuranceLevel,
  claims: readonly CredentialTemplate['claims'][number][],
): CredentialTemplate =>
  parseCredentialTemplate({
    schemaVersion: 1,
    tenantId: GOVERNMENT_TENANT_ID,
    templateId,
    version: 1,
    type,
    assurance,
    formats: [GOVERNMENT_FORMAT],
    claims,
    status: 'published',
  });

const issuer = (templateIds: readonly string[]): IssuerProfile =>
  parseIssuerProfile({
    schemaVersion: 1,
    tenantId: GOVERNMENT_TENANT_ID,
    issuerId: GOVERNMENT_ISSUER_ID,
    issuerUri: GOVERNMENT_ISSUER_URI,
    assurance: 'government',
    keyRef: 'synthetic-government-kms-key-v1',
    authorizedTemplateIds: templateIds,
  });

const issuerPolicy = (
  id: GovernmentJourneyId,
  templateId: string,
  authorityType: GovernmentAuthorityType,
): GovernmentIssuerPolicy =>
  Object.freeze({
    schemaVersion: 1,
    policyId: `government-${id}-dual-review-v1`,
    tenantId: GOVERNMENT_TENANT_ID,
    templateId,
    requiredApprovals: 2,
    authorizedReviewerIds: [
      'government-reviewer-a',
      'government-reviewer-b',
    ] as const,
    authorityType,
  });

const verifierPolicy = (
  id: GovernmentJourneyId,
  templateValue: CredentialTemplate,
  requiredClaims: readonly string[],
  assuranceLabels: readonly AssuranceLevel[],
  requiredTrustMetadata: boolean,
): GovernmentVerifierPolicy =>
  Object.freeze({
    ...parseVerificationPolicy({
      schemaVersion: 1,
      policyId: `government-${id}-verification-v1`,
      tenantId: GOVERNMENT_TENANT_ID,
      jurisdiction: GOVERNMENT_JURISDICTION,
      format: GOVERNMENT_FORMAT,
      profile: pin.profile,
      version: pin.version,
      schemaId: `urn:ssw:synthetic:government:${templateValue.templateId}:v${templateValue.version}`,
      credentialTypes: [templateValue.type],
      requestedClaims: requiredClaims.map((name) => ({ name })),
      requireHolderBinding: true,
      acceptedIssuers: [GOVERNMENT_ISSUER_URI],
    }),
    assuranceLabels: Object.freeze([...assuranceLabels]),
    requiredTrustMetadata,
  });

const fixture = (
  id: GovernmentJourneyId,
  claims: Readonly<Record<string, string>>,
  trustMetadata?: GovernmentTrustMetadata,
): GovernmentFixture => ({
  fixtureId: `synthetic-government-${id}-fixture-v1`,
  subjectBinding: {
    schemaVersion: 1,
    bindingId: `synthetic-government-${id}-binding-v1`,
    method: 'jwk-thumbprint',
    value: `synthetic-government-${id}-holder-thumbprint`,
  },
  claims,
  evidenceReference: {
    evidenceId: `synthetic-government-${id}-record-v1`,
    kind: 'synthetic-record-check',
    source: 'synthetic-fixture',
  },
  ...(trustMetadata ? { trustMetadata } : {}),
});

const authority = (
  templateId: string,
  authorityType: GovernmentAuthorityType,
): GovernmentAuthorityBoundary => ({
  issuerId: GOVERNMENT_ISSUER_ID,
  authorityType,
  jurisdiction: GOVERNMENT_JURISDICTION,
  mayIssue: [templateId],
  mayVerify: [templateId],
  mayNotIssue: [
    'university-diploma',
    'driving-school-completion',
    'unrestricted-government-licence',
  ],
  legalStatus: 'synthetic-policy-only',
  notes: [
    'Synthetic government authority boundary for local tests only.',
    'Authority and jurisdiction are explicit policy inputs, not legal conclusions.',
    'PID, EAA, and qualified labels require supplied trust metadata and external review.',
  ],
});

const syntheticTrustMetadata: GovernmentTrustMetadata = Object.freeze({
  trustListId: 'synthetic-government-trust-list-v1',
  statusSnapshotId: 'synthetic-government-status-v1',
  issuerUri: GOVERNMENT_ISSUER_URI,
  suppliedAssuranceLabels: ['pid', 'eaa'],
  source: 'synthetic-trust-fixture',
} as const);

const makePack = (
  id: GovernmentJourneyId,
  title: string,
  templateValue: CredentialTemplate,
  authorityType: GovernmentAuthorityType,
  claims: Readonly<Record<string, string>>,
  requiredClaims: readonly string[],
  assuranceLabels: readonly AssuranceLevel[],
  requiredTrustMetadata = false,
): GovernmentCredentialPack =>
  Object.freeze({
    id,
    title,
    template: templateValue,
    issuer: issuer([templateValue.templateId]),
    issuerPolicy: issuerPolicy(id, templateValue.templateId, authorityType),
    verifierPolicy: verifierPolicy(
      id,
      templateValue,
      requiredClaims,
      assuranceLabels,
      requiredTrustMetadata,
    ),
    fixture: fixture(
      id,
      claims,
      requiredTrustMetadata ? syntheticTrustMetadata : undefined,
    ),
    authority: authority(templateValue.templateId, authorityType),
  });

const residence = template(
  'government-residence',
  'SyntheticGovernmentResidenceCredential',
  'government',
  [
    claim('residentRef', 'string'),
    claim('jurisdictionCode', 'string'),
    claim('residenceStatus', 'string'),
    claim('validFrom', 'date'),
    claim('validUntil', 'date', false),
  ],
);
const permit = template(
  'government-permit',
  'SyntheticGovernmentPermitCredential',
  'government',
  [
    claim('holderRef', 'string'),
    claim('permitClass', 'string'),
    claim('permitStatus', 'string'),
    claim('issuedOn', 'date'),
    claim('expiresOn', 'date'),
  ],
);
const publicLicence = template(
  'government-public-licence',
  'SyntheticGovernmentPublicLicenceCredential',
  'government',
  [
    claim('licenceRef', 'string'),
    claim('licenceClass', 'string'),
    claim('licenceStatus', 'string'),
    claim('issuedOn', 'date'),
    claim('expiresOn', 'date'),
  ],
);
const pidEaa = template(
  'government-pid-eaa',
  'SyntheticGovernmentPidEaaPolicyCredential',
  'pid',
  [
    claim('subjectRef', 'string'),
    claim('documentPolicy', 'string'),
    claim('assuranceProfile', 'string'),
    claim('policyVersion', 'string'),
    claim('validUntil', 'date', false),
  ],
);

export const GOVERNMENT_PACKS: Readonly<
  Record<GovernmentJourneyId, GovernmentCredentialPack>
> = Object.freeze({
  residence: makePack(
    'residence',
    'Synthetic residence credential',
    residence,
    'residence-registry',
    {
      residentRef: 'synthetic-resident-001',
      jurisdictionCode: 'SYN-MUNI-01',
      residenceStatus: 'registered',
      validFrom: '2026-01-01',
      validUntil: '2027-01-01',
    },
    ['residentRef', 'jurisdictionCode', 'residenceStatus', 'validFrom'],
    ['government'],
  ),
  permit: makePack(
    'permit',
    'Synthetic public permit credential',
    permit,
    'permit-office',
    {
      holderRef: 'synthetic-holder-001',
      permitClass: 'SYN-TEMPORARY-01',
      permitStatus: 'active',
      issuedOn: '2026-02-01',
      expiresOn: '2026-12-31',
    },
    ['holderRef', 'permitClass', 'permitStatus', 'issuedOn', 'expiresOn'],
    ['government'],
  ),
  'public-licence': makePack(
    'public-licence',
    'Synthetic public licence credential',
    publicLicence,
    'public-licensing-authority',
    {
      licenceRef: 'synthetic-licence-001',
      licenceClass: 'SYN-PUBLIC-01',
      licenceStatus: 'active',
      issuedOn: '2026-03-01',
      expiresOn: '2027-03-01',
    },
    ['licenceRef', 'licenceClass', 'licenceStatus', 'issuedOn', 'expiresOn'],
    ['government'],
  ),
  'pid-eaa': makePack(
    'pid-eaa',
    'Synthetic PID/EAA policy credential',
    pidEaa,
    'pid-provider-policy',
    {
      subjectRef: 'synthetic-subject-001',
      documentPolicy: 'synthetic-pid-policy',
      assuranceProfile: 'synthetic-eaa',
      policyVersion: '1',
      validUntil: '2027-01-01',
    },
    ['subjectRef', 'documentPolicy', 'assuranceProfile', 'policyVersion'],
    ['pid', 'eaa'],
    true,
  ),
});

export const GOVERNMENT_TEMPLATES = Object.freeze(
  Object.values(GOVERNMENT_PACKS).map((pack) => pack.template),
);
export const GOVERNMENT_ISSUER_POLICIES = Object.freeze(
  Object.values(GOVERNMENT_PACKS).map((pack) => pack.issuerPolicy),
);
export const GOVERNMENT_VERIFIER_POLICIES = Object.freeze(
  Object.values(GOVERNMENT_PACKS).map((pack) => pack.verifierPolicy),
);
export const GOVERNMENT_FIXTURES = Object.freeze(
  Object.values(GOVERNMENT_PACKS).map((pack) => pack.fixture),
);

export function getGovernmentPack(
  id: GovernmentJourneyId,
): GovernmentCredentialPack {
  const pack = GOVERNMENT_PACKS[id];
  if (!pack) throw new GovernmentUseCaseError('UNKNOWN_JOURNEY');
  return pack;
}

export function assertAuthorizedGovernmentType(type: string): void {
  if (!GOVERNMENT_TEMPLATES.some((item) => item.type === type))
    throw new GovernmentUseCaseError(
      'UNAUTHORIZED_CREDENTIAL_TYPE',
      'credential type is outside synthetic government authority',
    );
}

export function runGovernmentJourney(
  id: GovernmentJourneyId,
  options: {
    readonly credentialType?: string;
    /** `null` explicitly models a verifier request with no trust snapshot. */
    readonly trustMetadata?: GovernmentTrustMetadata | null;
  } = {},
): GovernmentJourneyResult {
  const pack = getGovernmentPack(id);
  assertAuthorizedGovernmentType(options.credentialType ?? pack.template.type);
  if (pack.authority.jurisdiction !== GOVERNMENT_JURISDICTION)
    throw new GovernmentUseCaseError('AUTHORITY_MISMATCH');
  const required = new Set(
    pack.verifierPolicy.requestedClaims.map((item) => item.name),
  );
  for (const name of required)
    if (!(name in pack.fixture.claims))
      throw new GovernmentUseCaseError('MISSING_REQUIRED_CLAIM');
  const trustMetadata =
    options.trustMetadata === null
      ? undefined
      : options.trustMetadata ?? pack.fixture.trustMetadata;
  if (pack.verifierPolicy.requiredTrustMetadata && !trustMetadata)
    throw new GovernmentUseCaseError(
      'TRUST_METADATA_REQUIRED',
      'PID/EAA policy requires supplied trust metadata',
    );
  if (
    pack.authority.mayIssue.length !== 1 ||
    pack.authority.mayVerify.length !== 1 ||
    pack.authority.legalStatus !== 'synthetic-policy-only'
  )
    throw new GovernmentUseCaseError('FIXTURE_INVALID');
  return {
    ok: true,
    version: GOVERNMENT_USE_CASE_VERSION,
    journeyId: id,
    credentialId: `synthetic-government-${id}-credential-v1`,
    status: 'verified',
    templateId: pack.template.templateId,
    issuerPolicyId: pack.issuerPolicy.policyId,
    verifierPolicyId: pack.verifierPolicy.policyId,
    disclosedClaims: Object.fromEntries(
      [...required].map((name) => [name, pack.fixture.claims[name]]),
    ),
    authority: pack.authority,
    ...(trustMetadata ? { trustMetadata } : {}),
    events: [
      'synthetic-evidence-reviewed',
      'dual-approval-recorded',
      'credential-issued',
      'presentation-verified',
    ],
  };
}
