import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDeployment,
  ENTRY_POINT_V08,
  PasskeyBoundaryError,
  createPasskeySigner,
  deriveDeterministicAccountAddress,
} from '../dist/index.js';

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

const assertion = {
  clientDataJSON: new Uint8Array([1]),
  authenticatorData: new Uint8Array([2]),
  signature: new Uint8Array([3]),
  origin: 'https://wallet.example',
  rpId: 'wallet.example',
  challenge: 'challenge-1',
  account: valid.account,
};
const verifierCodeHash = '0x' + '22'.repeat(32);

test('passkey boundary accepts a verified assertion without private material', async () => {
  const signer = createPasskeySigner({
    account: valid.account,
    origin: assertion.origin,
    rpId: assertion.rpId,
    challenge: assertion.challenge,
    verifyP256: async ({ assertion: received }) => received.signature[0] === 3,
    verifierCodeHash,
    expectedVerifierCodeHash: verifierCodeHash,
  });
  const signature = await signer.signDigest(`0x${'ab'.repeat(32)}`, assertion);
  assert.deepEqual([...signature], [3]);
  assert.equal('privateKey' in signer, false);
});

for (const [field, code] of [
  ['origin', 'ORIGIN_MISMATCH'],
  ['rpId', 'RP_ID_MISMATCH'],
  ['challenge', 'CHALLENGE_MISMATCH'],
  ['account', 'ACCOUNT_MISMATCH'],
]) {
  test(`rejects a passkey assertion with the wrong ${field}`, async () => {
    const signer = createPasskeySigner({
      account: valid.account,
      origin: assertion.origin,
      rpId: assertion.rpId,
      challenge: assertion.challenge,
      verifyP256: async () => true,
      verifierCodeHash,
      expectedVerifierCodeHash: verifierCodeHash,
    });
    await assert.rejects(
      signer.signDigest(`0x${'ab'.repeat(32)}`, {
        ...assertion,
        [field]:
          field === 'account'
            ? '0x2222222222222222222222222222222222222222'
            : 'wrong',
      }),
      (error) => error instanceof PasskeyBoundaryError && error.code === code,
    );
  });
}

test('rejects an invalid P-256 signature', async () => {
  const signer = createPasskeySigner({
    account: valid.account,
    origin: assertion.origin,
    rpId: assertion.rpId,
    challenge: assertion.challenge,
    verifyP256: async () => false,
    verifierCodeHash,
    expectedVerifierCodeHash: verifierCodeHash,
  });
  await assert.rejects(
    signer.signDigest(`0x${'ab'.repeat(32)}`, assertion),
    /rejected/,
  );
});

test('derives a stable account address from documented public inputs', async () => {
  const input = {
    chainId: 31337,
    factory: valid.account,
    rpId: 'wallet.example',
    credentialId: 'credential-1',
  };
  const first = await deriveDeterministicAccountAddress(input);
  const second = await deriveDeterministicAccountAddress({ ...input });
  const changed = await deriveDeterministicAccountAddress({
    ...input,
    credentialId: 'credential-2',
  });
  assert.match(first, /^0x[0-9a-f]{40}$/);
  assert.equal(first, second);
  assert.notEqual(first, changed);
});
