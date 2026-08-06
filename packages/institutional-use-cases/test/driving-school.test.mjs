import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRIVING_SCHOOL_FIXTURES,
  DRIVING_SCHOOL_PACKS,
  DRIVING_SCHOOL_TEMPLATES,
  DrivingSchoolUseCaseError,
  assertAuthorizedDrivingSchoolType,
  assertDrivingLicenceAssurance,
  assertSupportedDrivingSchoolNamespace,
  runDrivingSchoolJourney,
} from '../dist/driving-school/index.js';

test('publishes four synthetic driving-school training packs', () => {
  assert.deepEqual(Object.keys(DRIVING_SCHOOL_PACKS), [
    'enrollment',
    'lesson-completion',
    'exam-readiness',
    'training-completion',
  ]);
  assert.equal(DRIVING_SCHOOL_TEMPLATES.length, 4);
  for (const pack of Object.values(DRIVING_SCHOOL_PACKS)) {
    assert.equal(pack.template.status, 'published');
    assert.equal(pack.template.assurance, 'institutional');
    assert.deepEqual(pack.template.formats, ['sd-jwt-vc']);
    assert.equal(pack.issuer.assurance, 'institutional');
    assert.equal(pack.issuerPolicy.requiredApprovals, 2);
    assert.equal(pack.verifierPolicy.requireHolderBinding, true);
    assert.equal(pack.authority.mayNotIssue.includes('government-driving-licence'), true);
  }
});

test('runs every training journey with exact synthetic disclosures', () => {
  for (const id of Object.keys(DRIVING_SCHOOL_PACKS)) {
    const result = runDrivingSchoolJourney(id);
    assert.equal(result.ok, true);
    assert.equal(result.status, 'verified');
    assert.equal(result.events.length, 4);
    assert.match(result.credentialId, /^synthetic-driving-school-/u);
    assert.ok(Object.keys(result.disclosedClaims).length >= 4);
  }
});

test('rejects authority escalation and licence use of school assurance', () => {
  assert.throws(
    () => assertAuthorizedDrivingSchoolType('GovernmentDrivingLicenceCredential'),
    (error) =>
      error instanceof DrivingSchoolUseCaseError &&
      error.code === 'UNAUTHORIZED_CREDENTIAL_TYPE',
  );
  assert.throws(
    () => runDrivingSchoolJourney('training-completion', {
      credentialType: 'GovernmentDrivingLicenceCredential',
    }),
    /outside driving-school training authority/u,
  );
  assert.throws(
    () => assertDrivingLicenceAssurance('institutional'),
    (error) =>
      error instanceof DrivingSchoolUseCaseError &&
      error.code === 'UNAUTHORIZED_ASSURANCE',
  );
  assert.doesNotThrow(() => assertDrivingLicenceAssurance('government'));
  assert.doesNotThrow(() => assertDrivingLicenceAssurance('qualified'));
});

test('rejects unsupported mdoc namespaces and keeps fixtures synthetic', () => {
  assert.throws(
    () => assertSupportedDrivingSchoolNamespace('org.iso.18013.5.1.mDL'),
    (error) =>
      error instanceof DrivingSchoolUseCaseError &&
      error.code === 'UNSUPPORTED_MDOC_NAMESPACE',
  );
  for (const fixture of DRIVING_SCHOOL_FIXTURES) {
    const serialized = JSON.stringify(fixture);
    assert.match(serialized, /synthetic/u);
    assert.doesNotMatch(serialized, /@/u);
    assert.doesNotMatch(serialized, /(?:email|phone|passport|government[_-]?id)/iu);
    assert.equal(fixture.evidenceReference.source, 'synthetic-fixture');
  }
});
