import test from 'node:test';
import assert from 'node:assert/strict';
import { assertDeployment, ENTRY_POINT_V08 } from '../dist/index.js';

const valid = {
  chainId: 31337,
  account: '0x1111111111111111111111111111111111111111',
  accountCodeHash: '0x' + '11'.repeat(32),
  entryPoint: ENTRY_POINT_V08,
  entryPointVersion: '0.8.0',
};

test('accepts pinned local deployment metadata', () => assertDeployment(valid));
test('rejects an address without a code hash', () => {
  assert.throws(
    () =>
      assertDeployment({ ...valid, accountCodeHash: '0x' + '00'.repeat(32) }),
    /code hash/,
  );
});
test('rejects an incompatible EntryPoint', () => {
  assert.throws(
    () =>
      assertDeployment({
        ...valid,
        entryPoint: '0x2222222222222222222222222222222222222222',
      }),
    /EntryPoint/,
  );
});
