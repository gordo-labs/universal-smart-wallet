import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENTERPRISE_GALLERY_CASES,
  runEnterpriseGalleryJourney,
} from '../dist/src/sectors/enterprise/index.js';

test('gallery exposes separate tenant-scoped enterprise journeys', () => {
  assert.deepEqual(
    ENTERPRISE_GALLERY_CASES.map((item) => item.id),
    ['employment', 'training', 'access', 'representation'],
  );
  for (const item of ENTERPRISE_GALLERY_CASES) {
    const result = runEnterpriseGalleryJourney(item.id);
    assert.equal(result.ok, true);
    assert.equal(result.status, 'verified');
    assert.notEqual(item.issuerPolicy, item.verifierPolicy);
    assert.equal(item.tenantId, 'enterprise-synthetic-acme');
    assert.match(item.path, /^\/enterprise\//u);
  }
});

test('gallery keeps enterprise revocation and scope failures executable', () => {
  const revoked = runEnterpriseGalleryJourney('access', {
    statusByJourney: { employment: 'revoked' },
  });
  assert.equal(revoked.reasonCode, 'DEPENDENCY_REVOKED');
  const wrongScope = runEnterpriseGalleryJourney('representation', {
    requiredRepresentationScope: 'billing:approve',
  });
  assert.equal(wrongScope.reasonCode, 'REPRESENTATION_SCOPE_MISSING');
});
