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
 * Synthetic driving-school examples deliberately use a non-government
 * namespace. A school can attest training, but it cannot mint a driving
 * licence or claim government/qualified assurance.
 */
export const DRIVING_SCHOOL_USE_CASE_VERSION = 1 as const;
export const DRIVING_SCHOOL_TENANT_ID = 'driving-school-synthetic';
export const DRIVING_SCHOOL_ISSUER_ID = 'driving-school-instructor-synthetic';
export const DRIVING_SCHOOL_ISSUER_URI =
  'https://issuer.synthetic.example/driving-school';
export const DRIVING_SCHOOL_FORMAT = 'sd-jwt-vc' as const;
export const DRIVING_SCHOOL_JURISDICTION = 'synthetic-eu-test';
export const DRIVING_SCHOOL_NAMESPACE =
  'urn:ssw:synthetic:driving-school:v1';
export const DRIVING_LICENCE_MDOC_NAMESPACE = 'org.iso.18013.5.1.mDL';

export type DrivingSchoolJourneyId =
  | 'enrollment'
  | 'lesson-completion'
  | 'exam-readiness'
  | 'training-completion';

export type DrivingSchoolIssuerPolicy = {
  readonly schemaVersion: 1;
  readonly policyId: string;
  readonly tenantId: typeof DRIVING_SCHOOL_TENANT_ID;
  readonly templateId: string;
  readonly requiredApprovals: 2;
  readonly authorizedReviewerIds: readonly [
    'instructor-reviewer-a',
    'instructor-reviewer-b',
  ];
};

export type DrivingSchoolAuthorityBoundary = {
  readonly issuerId: typeof DRIVING_SCHOOL_ISSUER_ID;
  readonly mayIssue: readonly string[];
  readonly mayVerify: readonly string[];
  readonly mayNotIssue: readonly string[];
  readonly forbiddenAssurance: readonly AssuranceLevel[];
  readonly notes: readonly string[];
};

export type DrivingSchoolFixture = {
  readonly fixtureId: string;
  readonly subjectBinding: SubjectBinding;
  readonly claims: Readonly<Record<string, string | boolean>>;
  readonly evidenceReference: {
    readonly evidenceId: string;
    readonly kind: 'synthetic-training-record';
    readonly source: 'synthetic-fixture';
  };
};

export type DrivingSchoolCredentialPack = {
  readonly id: DrivingSchoolJourneyId;
  readonly title: string;
  readonly template: CredentialTemplate;
  readonly issuer: IssuerProfile;
  readonly issuerPolicy: DrivingSchoolIssuerPolicy;
  readonly verifierPolicy: VerificationPolicy;
  readonly fixture: DrivingSchoolFixture;
  readonly authority: DrivingSchoolAuthorityBoundary;
};

export type DrivingSchoolJourneyResult = {
  readonly ok: true;
  readonly version: 1;
  readonly journeyId: DrivingSchoolJourneyId;
  readonly credentialId: string;
  readonly status: 'issued' | 'verified';
  readonly templateId: string;
  readonly issuerPolicyId: string;
  readonly verifierPolicyId: string;
  readonly disclosedClaims: Readonly<Record<string, string | boolean>>;
  readonly authority: DrivingSchoolAuthorityBoundary;
  readonly events: readonly [
    'synthetic-training-record-reviewed',
    'dual-approval-recorded',
    'credential-issued',
    'presentation-verified',
  ];
};

export class DrivingSchoolUseCaseError extends Error {
  constructor(
    readonly code:
      | 'UNKNOWN_JOURNEY'
      | 'UNAUTHORIZED_CREDENTIAL_TYPE'
      | 'UNAUTHORIZED_ASSURANCE'
      | 'MISSING_REQUIRED_CLAIM'
      | 'FIXTURE_INVALID'
      | 'UNSUPPORTED_MDOC_NAMESPACE',
    message: string = code,
  ) {
    super(message);
    this.name = 'DrivingSchoolUseCaseError';
  }
}

const pin = CREDENTIAL_FORMAT_PINS[DRIVING_SCHOOL_FORMAT];
const claim = (
  name: string,
  type: 'string' | 'boolean' | 'date',
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
    tenantId: DRIVING_SCHOOL_TENANT_ID,
    templateId,
    version: 1,
    type,
    assurance: 'institutional' satisfies AssuranceLevel,
    formats: [DRIVING_SCHOOL_FORMAT],
    claims,
    status: 'published',
  });

const issuer = (templateIds: readonly string[]): IssuerProfile =>
  parseIssuerProfile({
    schemaVersion: 1,
    tenantId: DRIVING_SCHOOL_TENANT_ID,
    issuerId: DRIVING_SCHOOL_ISSUER_ID,
    issuerUri: DRIVING_SCHOOL_ISSUER_URI,
    assurance: 'institutional',
    keyRef: 'synthetic-driving-school-kms-key-v1',
    authorizedTemplateIds: templateIds,
  });

const issuerPolicy = (
  id: DrivingSchoolJourneyId,
  templateId: string,
): DrivingSchoolIssuerPolicy =>
  Object.freeze({
    schemaVersion: 1,
    policyId: `driving-school-${id}-dual-review-v1`,
    tenantId: DRIVING_SCHOOL_TENANT_ID,
    templateId,
    requiredApprovals: 2,
    authorizedReviewerIds: [
      'instructor-reviewer-a',
      'instructor-reviewer-b',
    ] as const,
  });

const verifierPolicy = (
  id: DrivingSchoolJourneyId,
  templateValue: CredentialTemplate,
  requiredClaims: readonly string[],
): VerificationPolicy =>
  parseVerificationPolicy({
    schemaVersion: 1,
    policyId: `driving-school-${id}-verification-v1`,
    tenantId: DRIVING_SCHOOL_TENANT_ID,
    jurisdiction: DRIVING_SCHOOL_JURISDICTION,
    format: DRIVING_SCHOOL_FORMAT,
    profile: pin.profile,
    version: pin.version,
    schemaId: `${DRIVING_SCHOOL_NAMESPACE}:${templateValue.templateId}`,
    credentialTypes: [templateValue.type],
    requestedClaims: requiredClaims.map((name) => ({ name })),
    requireHolderBinding: true,
    acceptedIssuers: [DRIVING_SCHOOL_ISSUER_URI],
  });

const fixture = (
  id: DrivingSchoolJourneyId,
  claims: Readonly<Record<string, string | boolean>>,
): DrivingSchoolFixture => ({
  fixtureId: `synthetic-driving-school-${id}-fixture-v1`,
  subjectBinding: {
    schemaVersion: 1,
    bindingId: `synthetic-driving-school-${id}-binding-v1`,
    method: 'jwk-thumbprint',
    value: `synthetic-driving-school-${id}-holder-thumbprint`,
  },
  claims,
  evidenceReference: {
    evidenceId: `synthetic-driving-school-${id}-record-v1`,
    kind: 'synthetic-training-record',
    source: 'synthetic-fixture',
  },
});

const boundary = (templateId: string): DrivingSchoolAuthorityBoundary => ({
  issuerId: DRIVING_SCHOOL_ISSUER_ID,
  mayIssue: [templateId],
  mayVerify: [templateId],
  mayNotIssue: [
    'government-identity',
    'government-driving-licence',
    'qualified-driving-licence',
  ],
  forbiddenAssurance: ['government', 'qualified', 'pid', 'eaa', 'qeaa'],
  notes: [
    'Synthetic driving-school instructor authority only.',
    'Training completion is not a driving licence or a legal permit.',
    'Only a competent government authority can issue a driving licence.',
  ],
});

const makePack = (
  id: DrivingSchoolJourneyId,
  title: string,
  templateValue: CredentialTemplate,
  claims: Readonly<Record<string, string | boolean>>,
  requiredClaims: readonly string[],
): DrivingSchoolCredentialPack =>
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
  'driving-school-enrollment',
  'SyntheticDrivingSchoolEnrollmentCredential',
  [
    claim('studentRef', 'string'),
    claim('courseCode', 'string'),
    claim('enrollmentStatus', 'string'),
    claim('enrolledOn', 'date'),
    claim('validUntil', 'date', false),
  ],
);
const lessonCompletion = template(
  'driving-school-lesson-completion',
  'SyntheticDrivingLessonCompletionCredential',
  [
    claim('studentRef', 'string'),
    claim('lessonCode', 'string'),
    claim('lessonStatus', 'string'),
    claim('completedOn', 'date'),
    claim('instructorRef', 'string'),
  ],
);
const examReadiness = template(
  'driving-school-exam-readiness',
  'SyntheticDrivingExamReadinessCredential',
  [
    claim('studentRef', 'string'),
    claim('examClass', 'string'),
    claim('readyForExam', 'boolean'),
    claim('assessedOn', 'date'),
    claim('instructorRef', 'string'),
  ],
);
const trainingCompletion = template(
  'driving-school-training-completion',
  'SyntheticDrivingTrainingCompletionCredential',
  [
    claim('studentRef', 'string'),
    claim('courseCode', 'string'),
    claim('trainingStatus', 'string'),
    claim('completedOn', 'date'),
    claim('hoursCompleted', 'string'),
  ],
);

export const DRIVING_SCHOOL_PACKS: Readonly<
  Record<DrivingSchoolJourneyId, DrivingSchoolCredentialPack>
> = Object.freeze({
  enrollment: makePack(
    'enrollment',
    'Synthetic driving-school enrollment credential',
    enrollment,
    {
      studentRef: 'synthetic-driver-001',
      courseCode: 'SYN-CAR-B-01',
      enrollmentStatus: 'active',
      enrolledOn: '2026-08-01',
      validUntil: '2027-08-01',
    },
    ['studentRef', 'courseCode', 'enrollmentStatus', 'enrolledOn'],
  ),
  'lesson-completion': makePack(
    'lesson-completion',
    'Synthetic lesson-completion credential',
    lessonCompletion,
    {
      studentRef: 'synthetic-driver-001',
      lessonCode: 'SYN-ROAD-07',
      lessonStatus: 'completed',
      completedOn: '2026-08-03',
      instructorRef: 'synthetic-instructor-007',
    },
    ['studentRef', 'lessonCode', 'lessonStatus', 'completedOn'],
  ),
  'exam-readiness': makePack(
    'exam-readiness',
    'Synthetic exam-readiness credential',
    examReadiness,
    {
      studentRef: 'synthetic-driver-001',
      examClass: 'SYN-CAR-B',
      readyForExam: true,
      assessedOn: '2026-08-04',
      instructorRef: 'synthetic-instructor-007',
    },
    ['studentRef', 'examClass', 'readyForExam', 'assessedOn'],
  ),
  'training-completion': makePack(
    'training-completion',
    'Synthetic training-completion credential',
    trainingCompletion,
    {
      studentRef: 'synthetic-driver-001',
      courseCode: 'SYN-CAR-B-01',
      trainingStatus: 'completed',
      completedOn: '2026-08-05',
      hoursCompleted: 'synthetic-24',
    },
    ['studentRef', 'courseCode', 'trainingStatus', 'completedOn'],
  ),
});

export const DRIVING_SCHOOL_TEMPLATES = Object.freeze(
  Object.values(DRIVING_SCHOOL_PACKS).map((pack) => pack.template),
);
export const DRIVING_SCHOOL_ISSUER_POLICIES = Object.freeze(
  Object.values(DRIVING_SCHOOL_PACKS).map((pack) => pack.issuerPolicy),
);
export const DRIVING_SCHOOL_VERIFIER_POLICIES = Object.freeze(
  Object.values(DRIVING_SCHOOL_PACKS).map((pack) => pack.verifierPolicy),
);
export const DRIVING_SCHOOL_FIXTURES = Object.freeze(
  Object.values(DRIVING_SCHOOL_PACKS).map((pack) => pack.fixture),
);

export function getDrivingSchoolPack(
  id: DrivingSchoolJourneyId,
): DrivingSchoolCredentialPack {
  const pack = DRIVING_SCHOOL_PACKS[id];
  if (!pack) throw new DrivingSchoolUseCaseError('UNKNOWN_JOURNEY');
  return pack;
}

export function assertAuthorizedDrivingSchoolType(type: string): void {
  if (!DRIVING_SCHOOL_TEMPLATES.some((item) => item.type === type))
    throw new DrivingSchoolUseCaseError(
      'UNAUTHORIZED_CREDENTIAL_TYPE',
      'credential type is outside driving-school training authority',
    );
}

/** A school credential can never satisfy a licence assurance policy. */
export function assertDrivingLicenceAssurance(assurance: AssuranceLevel): void {
  if (DRIVING_SCHOOL_PACKS.enrollment.template.assurance === assurance)
    throw new DrivingSchoolUseCaseError(
      'UNAUTHORIZED_ASSURANCE',
      'institutional driving-school assurance cannot issue or satisfy a driving licence policy',
    );
  if (!['government', 'qualified'].includes(assurance))
    throw new DrivingSchoolUseCaseError(
      'UNAUTHORIZED_ASSURANCE',
      'driving licence policy accepts only competent authority assurance',
    );
}

/** mdoc is intentionally not part of this synthetic school pack. */
export function assertSupportedDrivingSchoolNamespace(namespace: string): void {
  if (namespace !== DRIVING_SCHOOL_NAMESPACE)
    throw new DrivingSchoolUseCaseError(
      'UNSUPPORTED_MDOC_NAMESPACE',
      'unsupported mdoc or credential namespace for driving-school training',
    );
}

export function runDrivingSchoolJourney(
  id: DrivingSchoolJourneyId,
  options: { readonly credentialType?: string } = {},
): DrivingSchoolJourneyResult {
  const pack = getDrivingSchoolPack(id);
  assertAuthorizedDrivingSchoolType(options.credentialType ?? pack.template.type);
  assertSupportedDrivingSchoolNamespace(DRIVING_SCHOOL_NAMESPACE);
  const required = new Set(
    pack.verifierPolicy.requestedClaims.map((item) => item.name),
  );
  for (const name of required)
    if (!(name in pack.fixture.claims))
      throw new DrivingSchoolUseCaseError('MISSING_REQUIRED_CLAIM');
  if (
    pack.authority.mayIssue.length !== 1 ||
    pack.authority.mayVerify.length !== 1 ||
    pack.template.assurance !== 'institutional' ||
    pack.issuer.assurance !== 'institutional'
  )
    throw new DrivingSchoolUseCaseError('FIXTURE_INVALID');
  return {
    ok: true,
    version: DRIVING_SCHOOL_USE_CASE_VERSION,
    journeyId: id,
    credentialId: `synthetic-driving-school-${id}-credential-v1`,
    status: 'verified',
    templateId: pack.template.templateId,
    issuerPolicyId: pack.issuerPolicy.policyId,
    verifierPolicyId: pack.verifierPolicy.policyId,
    disclosedClaims: Object.fromEntries(
      [...required].map((name) => [name, pack.fixture.claims[name]]),
    ),
    authority: pack.authority,
    events: [
      'synthetic-training-record-reviewed',
      'dual-approval-recorded',
      'credential-issued',
      'presentation-verified',
    ],
  };
}
