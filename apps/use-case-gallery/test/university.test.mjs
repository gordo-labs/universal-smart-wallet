import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UNIVERSITY_GALLERY_CASES,
  runUniversityGalleryJourney,
} from '../dist/src/sectors/index.js';

test('gallery exposes executable university journeys with separate policies', () => {
  assert.deepEqual(
    UNIVERSITY_GALLERY_CASES.map((item) => item.id),
    ['enrollment', 'diploma', 'qualification'],
  );
  for (const item of UNIVERSITY_GALLERY_CASES) {
    const result = runUniversityGalleryJourney(item.id);
    assert.equal(result.ok, true);
    assert.equal(result.status, 'verified');
    assert.notEqual(item.issuerPolicy, item.verifierPolicy);
    assert.match(item.path, /^\/university\//u);
  }
});
