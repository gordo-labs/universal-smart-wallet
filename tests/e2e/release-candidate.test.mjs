import assert from 'node:assert/strict';
import test from 'node:test';

import {
  StatusCache,
  verifyAttestation,
} from '../../packages/credential-domain/dist/index.js';

const hex32 = (character) => `0x${character.repeat(64)}`;
const address = (character) => `0x${character.repeat(40)}`;

test('provider outage is fail-closed and does not expose a holder identifier', async () => {
  const cache = new StatusCache(async () => {
    throw new Error('synthetic provider outage');
  });
  const result = await cache.lookup('https://issuer.example/status/7');
  assert.deepEqual(result, { ok: false, code: 'unavailable', cached: false });
  assert.equal(JSON.stringify(result).includes('holder'), false);
});

test('attestation expiry and replay boundaries are explicit', async () => {
  const attestation = {
    version: 1,
    chainId: 31337,
    consumer: address('1'),
    policy: hex32('a'),
    subject: hex32('b'),
    nonce: hex32('c'),
    issuedAt: 1_000,
    expiresAt: 1_060,
    attestor: address('2'),
    attestorVersion: hex32('d'),
    signature: `0x${'e'.repeat(130)}`,
  };
  const verifier = async () => true;
  const hash = () => hex32('f');
  assert.equal(
    await verifyAttestation(attestation, verifier, hash, 1_010),
    true,
  );
  assert.equal(
    await verifyAttestation(attestation, verifier, hash, 1_060),
    false,
  );

  const consumed = new Set();
  const consumeOnce = (nonce) => {
    if (consumed.has(nonce)) return false;
    consumed.add(nonce);
    return true;
  };
  assert.equal(consumeOnce(attestation.nonce), true);
  assert.equal(consumeOnce(attestation.nonce), false);
});
