import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOVERNMENT_GALLERY_CASES,
  runGovernmentGalleryJourney,
} from '../dist/src/sectors/index.js';

test('gallery exposes government journeys as an isolated sector', () => {
  assert.deepEqual(
    GOVERNMENT_GALLERY_CASES.map((item) => item.id),
    ['residence', 'permit', 'public-licence', 'pid-eaa'],
  );
  for (const item of GOVERNMENT_GALLERY_CASES) {
    const result = runGovernmentGalleryJourney(item.id);
    assert.equal(result.ok, true);
    assert.equal(result.status, 'verified');
    assert.match(item.path, /^\/government\//u);
    assert.match(item.jurisdiction, /^synthetic-/u);
    assert.equal(item.legalStatus, 'synthetic-policy-only');
  }
});

test('gallery keeps PID/EAA labels tied to synthetic trust metadata', () => {
  const pid = GOVERNMENT_GALLERY_CASES.find((item) => item.id === 'pid-eaa');
  assert.ok(pid);
  assert.deepEqual(pid.assuranceLabels, ['pid', 'eaa']);
  assert.equal(pid.authorityType, 'pid-provider-policy');
});
