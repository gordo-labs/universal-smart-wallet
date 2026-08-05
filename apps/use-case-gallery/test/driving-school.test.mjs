import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRIVING_SCHOOL_GALLERY_CASES,
  runDrivingSchoolGalleryJourney,
} from '../dist/src/sectors/index.js';

test('gallery exposes isolated driving-school journeys', () => {
  assert.deepEqual(
    DRIVING_SCHOOL_GALLERY_CASES.map((item) => item.id),
    ['enrollment', 'lesson-completion', 'exam-readiness', 'training-completion'],
  );
  for (const item of DRIVING_SCHOOL_GALLERY_CASES) {
    const result = runDrivingSchoolGalleryJourney(item.id);
    assert.equal(result.status, 'verified');
    assert.match(item.path, /^\/driving-school\//u);
    assert.match(item.authority, /competent authority/i);
    assert.notEqual(item.issuerPolicy, item.verifierPolicy);
  }
});
