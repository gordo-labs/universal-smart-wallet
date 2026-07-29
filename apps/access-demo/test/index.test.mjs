import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccessAttestation, ACCESS_POLICY } from '../dist/index.js';

const hex = (byte) => `0x${byte.repeat(64)}`;
const address = `0x${'1'.repeat(40)}`;

test('creates a bounded synthetic attestation without credential data', async () => {
  const result = await createAccessAttestation({
    verified: true,
    chainId: 31337,
    consumer: address,
    subject: hex('b'),
    nonce: hex('c'),
    attestor: `0x${'2'.repeat(40)}`,
    attestorVersion: hex('d'),
    nowSeconds: 1_000,
  });
  assert.equal(result.ok, true);
  assert.equal(result.attestation.policy, ACCESS_POLICY);
  assert.equal(result.attestation.expiresAt, 1_060);
  assert.equal(JSON.stringify(result).includes('credential'), false);
});

test('does not attest an unsuccessful verifier result', async () => {
  const result = await createAccessAttestation({
    verified: false,
    chainId: 1,
    consumer: address,
    subject: hex('b'),
    nonce: hex('c'),
    attestor: `0x${'2'.repeat(40)}`,
    attestorVersion: hex('d'),
  });
  assert.deepEqual(result, { ok: false, code: 'verification_failed' });
});
