import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createVaultEnvelope,
  detectWebAuthnPrfCapability,
  migrateVaultEnvelope,
  openVaultEnvelope,
  requirePrfCapability,
} from '../dist/index.js';

const bytes = (length, seed = 1) =>
  Uint8Array.from({ length }, (_, index) => (seed + index) & 0xff);
const randomBytes = (() => {
  let seed = 0;
  return (length) => bytes(length, (seed += 17));
})();

test('deterministic AES-GCM vector round-trips and rejects tampering', async () => {
  const plaintext = new TextEncoder().encode('{"credential":"synthetic"}');
  const envelope = await createVaultEnvelope(plaintext, {
    strategy: 'prf',
    prfOutput: bytes(32, 9),
    randomBytes,
  });
  assert.equal(envelope.version, 1);
  assert.equal(envelope.strategy, 'prf');
  assert.deepEqual(await openVaultEnvelope(envelope, bytes(32, 9)), plaintext);
  const tampered = structuredClone(envelope);
  tampered.payload.ciphertext = `${tampered.payload.ciphertext.slice(0, -1)}A`;
  await assert.rejects(() => openVaultEnvelope(tampered, bytes(32, 9)));
  const wrongVersion = { ...envelope, version: 99 };
  await assert.rejects(
    () => openVaultEnvelope(wrongVersion, bytes(32, 9)),
    /Unsupported/,
  );
});

test('explicit PBKDF2 fallback has bounded work and migrates envelopes', async () => {
  const plaintext = new TextEncoder().encode('fallback fixture');
  const envelope = await createVaultEnvelope(plaintext, {
    strategy: 'passphrase',
    passphrase: 'synthetic recovery factor',
    iterations: 100_000,
    randomBytes,
  });
  assert.equal(envelope.kdf.iterations, 100_000);
  assert.deepEqual(
    await openVaultEnvelope(envelope, 'synthetic recovery factor'),
    plaintext,
  );
  await assert.rejects(
    () =>
      createVaultEnvelope(plaintext, {
        strategy: 'passphrase',
        passphrase: 'short',
      }),
    /12 characters/,
  );
  await assert.rejects(
    () =>
      createVaultEnvelope(plaintext, {
        strategy: 'passphrase',
        passphrase: 'synthetic recovery factor',
        iterations: 2_000_001,
      }),
    /between/,
  );
  const migrated = await migrateVaultEnvelope(
    envelope,
    'synthetic recovery factor',
    { strategy: 'prf', prfOutput: bytes(32, 33), randomBytes },
  );
  assert.deepEqual(await openVaultEnvelope(migrated, bytes(32, 33)), plaintext);
});

test('PRF capability is optional but never silently downgraded', async () => {
  assert.deepEqual(await detectWebAuthnPrfCapability({}), {
    supported: false,
    reason: 'missing-api',
  });
  assert.deepEqual(
    await detectWebAuthnPrfCapability({
      PublicKeyCredential: {
        getClientCapabilities: async () => ({ prf: true }),
      },
    }),
    { supported: true, reason: 'available' },
  );
  assert.throws(
    () => requirePrfCapability({ supported: false, reason: 'unsupported' }),
    /explicit recovery passphrase/,
  );
  await assert.rejects(
    () => createVaultEnvelope(new Uint8Array([1]), { strategy: 'prf' }),
    /no silent downgrade/,
  );
});
