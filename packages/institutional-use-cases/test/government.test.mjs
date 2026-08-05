import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOVERNMENT_FIXTURES,
  GOVERNMENT_ISSUER_POLICIES,
  GOVERNMENT_PACKS,
  GOVERNMENT_TEMPLATES,
  GOVERNMENT_VERIFIER_POLICIES,
  GovernmentUseCaseError,
  assertAuthorizedGovernmentType,
  runGovernmentJourney,
} from '../dist/index.js';

test('publishes synthetic residence, permit, licence and PID/EAA policies', () => {
  assert.deepEqual(Object.keys(GOVERNMENT_PACKS), [
    'residence',
    'permit',
    'public-licence',
    'pid-eaa',
  ]);
  assert.equal(GOVERNMENT_TEMPLATES.length, 4);
  assert.equal(GOVERNMENT_ISSUER_POLICIES.length, 4);
  assert.equal(GOVERNMENT_VERIFIER_POLICIES.length, 4);
  for (const pack of Object.values(GOVERNMENT_PACKS)) {
    assert.equal(pack.template.status, 'published');
    assert.equal(pack.issuerPolicy.requiredApprovals, 2);
    assert.equal(pack.authority.jurisdiction, 'synthetic-eu-test');
    assert.equal(pack.authority.legalStatus, 'synthetic-policy-only');
    assert.deepEqual(pack.issuer.authorizedTemplateIds, [pack.template.templateId]);
  }
});

test('runs every government journey with explicit authority and synthetic disclosure', () => {
  for (const id of Object.keys(GOVERNMENT_PACKS)) {
    const result = runGovernmentJourney(id);
    assert.equal(result.ok, true);
    assert.equal(result.status, 'verified');
    assert.equal(result.authority.jurisdiction, 'synthetic-eu-test');
    assert.equal(result.authority.legalStatus, 'synthetic-policy-only');
    assert.equal(result.events.length, 4);
    assert.match(result.credentialId, /^synthetic-government-/u);
  }
});

test('requires supplied trust metadata for PID/EAA policy labels', () => {
  const pack = GOVERNMENT_PACKS['pid-eaa'];
  assert.equal(pack.verifierPolicy.requiredTrustMetadata, true);
  assert.ok(pack.fixture.trustMetadata);
  assert.deepEqual(pack.fixture.trustMetadata.source, 'synthetic-trust-fixture');
  assert.deepEqual(pack.verifierPolicy.assuranceLabels, ['pid', 'eaa']);
  assert.throws(
    () => runGovernmentJourney('pid-eaa', { trustMetadata: null }),
    (error) => error instanceof GovernmentUseCaseError && error.code === 'TRUST_METADATA_REQUIRED',
  );
  const result = runGovernmentJourney('pid-eaa', {
    trustMetadata: pack.fixture.trustMetadata,
  });
  assert.deepEqual(result.trustMetadata?.trustListId, 'synthetic-government-trust-list-v1');
});

test('rejects unauthorized types and keeps fixtures synthetic', () => {
  assert.throws(
    () => assertAuthorizedGovernmentType('UniversityDiplomaCredential'),
    (error) => error instanceof GovernmentUseCaseError && error.code === 'UNAUTHORIZED_CREDENTIAL_TYPE',
  );
  assert.throws(
    () => runGovernmentJourney('permit', { credentialType: 'DrivingLicenceCredential' }),
    /outside synthetic government authority/u,
  );
  assert.equal(GOVERNMENT_FIXTURES.length, 4);
  for (const fixture of GOVERNMENT_FIXTURES) {
    const serialized = JSON.stringify(fixture);
    assert.doesNotMatch(serialized, /@/u);
    assert.doesNotMatch(serialized, /(?:email|phone|passport|national[_-]?id)/iu);
    assert.equal(fixture.evidenceReference.source, 'synthetic-fixture');
  }
});
