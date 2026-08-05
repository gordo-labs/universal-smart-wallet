import test from 'node:test';
import assert from 'node:assert/strict';
import { REQUIRED_CASES, runAllCases } from './fixtures.mjs';

test('deterministic identity platform gate covers every required journey', async () => {
  const first = await runAllCases();
  const second = await runAllCases();
  assert.deepEqual(first, second);
  for (const required of REQUIRED_CASES) assert.ok(first[required], `required case missing: ${required}`);
  assert.equal(first['redaction-artifacts'].syntheticOnly, true);
});
