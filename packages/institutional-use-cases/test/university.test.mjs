import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UNIVERSITY_FIXTURES,
  UNIVERSITY_ISSUER_POLICIES,
  UNIVERSITY_PACKS,
  UNIVERSITY_TEMPLATES,
  UNIVERSITY_VERIFIER_POLICIES,
  UniversityUseCaseError,
  assertAuthorizedUniversityType,
  runUniversityJourney,
} from '../dist/index.js';

test('publishes three synthetic university packs with issuer and verifier policy', () => {
  assert.deepEqual(Object.keys(UNIVERSITY_PACKS), ['enrollment', 'diploma', 'qualification']);
  assert.equal(UNIVERSITY_TEMPLATES.length, 3);
  assert.equal(UNIVERSITY_ISSUER_POLICIES.length, 3);
  assert.equal(UNIVERSITY_VERIFIER_POLICIES.length, 3);
  for (const pack of Object.values(UNIVERSITY_PACKS)) {
    assert.equal(pack.template.status, 'published');
    assert.equal(pack.template.assurance, 'institutional');
    assert.equal(pack.issuerPolicy.requiredApprovals, 2);
    assert.equal(pack.verifierPolicy.requireHolderBinding, true);
    assert.deepEqual(pack.issuer.authorizedTemplateIds, [pack.template.templateId]);
  }
});

test('runs enrollment, diploma, and qualification journeys with exact synthetic disclosures', () => {
  for (const id of ['enrollment', 'diploma', 'qualification']) {
    const result = runUniversityJourney(id);
    assert.equal(result.ok, true);
    assert.equal(result.status, 'verified');
    assert.equal(result.events.length, 4);
    assert.equal(result.authority.mayNotIssue.includes('government-driving-licence'), true);
    assert.match(result.credentialId, /^synthetic-/u);
    assert.ok(Object.keys(result.disclosedClaims).length >= 4);
  }
});

test('rejects credential types outside registrar authority', () => {
  assert.throws(
    () => assertAuthorizedUniversityType('GovernmentDrivingLicenceCredential'),
    (error) => error instanceof UniversityUseCaseError && error.code === 'UNAUTHORIZED_CREDENTIAL_TYPE',
  );
  assert.throws(
    () => runUniversityJourney('diploma', { credentialType: 'GovernmentIdentityCredential' }),
    /outside university registrar authority/u,
  );
});

test('fixtures contain no contact or government identity data', () => {
  assert.equal(UNIVERSITY_FIXTURES.length, 3);
  for (const fixture of UNIVERSITY_FIXTURES) {
    const serialized = JSON.stringify(fixture);
    assert.doesNotMatch(serialized, /@/u);
    assert.doesNotMatch(serialized, /(?:email|phone|government[_-]?id|passport)/iu);
    assert.equal(fixture.evidenceReference.source, 'synthetic-fixture');
  }
});
