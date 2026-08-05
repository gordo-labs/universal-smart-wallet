import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENTERPRISE_FIXTURES,
  ENTERPRISE_PACKS,
  ENTERPRISE_TENANT_ID,
  EnterpriseUseCaseError,
  assertAuthorizedEnterpriseType,
  runEnterpriseJourney,
} from '../dist/index.js';

test('publishes four tenant-scoped synthetic enterprise packs', () => {
  assert.deepEqual(Object.keys(ENTERPRISE_PACKS), [
    'employment',
    'training',
    'access',
    'representation',
  ]);
  for (const pack of Object.values(ENTERPRISE_PACKS)) {
    assert.equal(pack.template.status, 'published');
    assert.equal(pack.template.assurance, 'institutional');
    assert.equal(pack.issuerPolicy.requiredApprovals, 2);
    assert.equal(pack.verifierPolicy.tenantId, ENTERPRISE_TENANT_ID);
    assert.equal(pack.fixture.tenantId, ENTERPRISE_TENANT_ID);
    assert.deepEqual(pack.issuer.authorizedTemplateIds, [pack.template.templateId]);
  }
});

test('runs employment, training, access, and representation journeys', () => {
  for (const id of ['employment', 'training', 'access', 'representation']) {
    const result = runEnterpriseJourney(id);
    assert.equal(result.ok, true);
    assert.equal(result.status, 'verified');
    assert.equal(result.reasonCode, 'VERIFIED');
    assert.match(result.credentialId, /^synthetic-enterprise-/u);
    assert.ok(Object.keys(result.disclosedClaims).length >= 5);
  }
  const representation = runEnterpriseJourney('representation');
  assert.equal(representation.representationScope, 'procurement:approve');
  assert.equal(representation.disclosedClaims.representationScope, 'procurement:approve');
});

test('revoked employment denies dependent resource access', () => {
  const result = runEnterpriseJourney('access', {
    statusByJourney: { employment: 'revoked' },
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'rejected');
  assert.equal(result.reasonCode, 'DEPENDENCY_REVOKED');
  assert.deepEqual(result.disclosedClaims, {});
});

test('expired roles and cross-tenant requests fail closed', () => {
  const expired = runEnterpriseJourney('employment', {
    now: ENTERPRISE_PACKS.employment.fixture.expiresAt,
  });
  assert.equal(expired.reasonCode, 'CREDENTIAL_EXPIRED');

  const crossTenant = runEnterpriseJourney('access', {
    tenantId: 'enterprise-synthetic-other-tenant',
  });
  assert.equal(crossTenant.reasonCode, 'CROSS_TENANT');
  assert.equal(crossTenant.ok, false);
});

test('representation requires an explicit matching scope', () => {
  const missing = runEnterpriseJourney('representation', {
    requiredRepresentationScope: 'billing:approve',
  });
  assert.equal(missing.reasonCode, 'REPRESENTATION_SCOPE_MISSING');
  assert.equal(missing.ok, false);
});

test('fixtures are synthetic and authority cannot issue prohibited claims', () => {
  assert.equal(ENTERPRISE_FIXTURES.length, 4);
  for (const fixture of ENTERPRISE_FIXTURES) {
    const serialized = JSON.stringify(fixture);
    assert.doesNotMatch(serialized, /@/u);
    assert.doesNotMatch(serialized, /(?:email|phone|payroll|passport|government[_-]?id)/iu);
    assert.equal(fixture.evidenceReference.source, 'synthetic-fixture');
  }
  assert.throws(
    () => assertAuthorizedEnterpriseType('GovernmentIdentityCredential'),
    (error) =>
      error instanceof EnterpriseUseCaseError &&
      error.code === 'UNAUTHORIZED_CREDENTIAL_TYPE',
  );
});
