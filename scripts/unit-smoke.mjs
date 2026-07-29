import assert from 'node:assert/strict';
assert.equal(
  typeof (await import('../packages/shared-types/dist/index.js'))
    .foundationHealth,
  'function',
);
console.log('Unit smoke OK: shared-types foundation boundary.');
