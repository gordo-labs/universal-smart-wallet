import test from 'node:test';
import assert from 'node:assert/strict';
import { USE_CASES, cleanFixture, prepareExampleAction, runExample, reset } from '../dist/src/index.js';

test('every recipe starts clean and has an actionable failure path', () => {
  assert.equal(USE_CASES.length, 11);
  for (const item of USE_CASES) {
    const result = runExample(item.id);
    assert.equal(result.fixture.wallet.chainId, 84532);
    assert.equal(result.fixture.minted.length, 0);
    assert.match(item.failure.trigger, /.+/);
    assert.match(item.failure.recovery, /.+/);
  }
});

test('asset recipes use public actions and reject mainnet fixtures', () => {
  assert.equal(prepareExampleAction('loyalty-token')?.asset, 'erc20');
  assert.equal(prepareExampleAction('nft-mint')?.asset, 'erc721');
  assert.throws(() => prepareExampleAction('nft-mint', { ...cleanFixture(), wallet: { ...cleanFixture().wallet, chainId: 1 } }), /mainnet/);
});

test('reset creates an independent clean fixture', () => {
  const fixture = cleanFixture();
  assert.notEqual(reset(), fixture);
  assert.equal(reset().events.length, 0);
});
