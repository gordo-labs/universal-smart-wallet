import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createVaultEnvelope,
  detectWebAuthnPrfCapability,
  migrateVaultEnvelope,
  openVaultEnvelope,
  requirePrfCapability,
  InMemoryVaultStore,
  FakeIndexedDbVaultStore,
  VaultStoreError,
  createVaultBackup,
  openVaultBackup,
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

test('vault stores only encrypted payloads and authenticates bounded index metadata', async () => {
  for (const Store of [InMemoryVaultStore, FakeIndexedDbVaultStore]) {
    const store = new Store();
    const metadata = {
      id: 'cred-1',
      credentialType: 'SyntheticAgeCredential',
      issuer: 'https://issuer.invalid',
      expiresAt: '2030-01-01T00:00:00Z',
    };
    const credential = {
      vc: {
        type: ['VerifiableCredential'],
        credentialSubject: { is_over_18: true },
      },
    };
    await store.put(metadata, credential, {
      strategy: 'prf',
      prfOutput: bytes(32, 7),
      randomBytes,
    });
    assert.deepEqual(await store.list(), [metadata]);
    assert.deepEqual(
      (await store.get('cred-1', bytes(32, 7))).credential,
      credential,
    );
    const record = store.entries?.get?.('cred-1');
    if (record)
      assert.equal(JSON.stringify(record).includes('is_over_18'), false);
    await assert.rejects(
      () => store.get('cred-1', bytes(32, 8)),
      (error) =>
        error instanceof VaultStoreError && error.kind === 'recoverable',
    );
    await store.delete('cred-1');
    await assert.rejects(() => store.get('cred-1', bytes(32, 7)), /not found/);
  }
});

test('metadata tampering and failed migration retain no partial plaintext', async () => {
  const store = new InMemoryVaultStore();
  const metadata = {
    id: 'cred-2',
    credentialType: 'Synthetic',
    issuer: 'https://issuer.invalid',
  };
  await store.put(
    metadata,
    { secret: 'synthetic-only' },
    { strategy: 'prf', prfOutput: bytes(32, 3), randomBytes },
  );
  store.entries.get('cred-2').issuer = 'https://tampered.invalid';
  await assert.rejects(() => store.get('cred-2', bytes(32, 3)), /corrupt/);
  store.entries.get('cred-2').issuer = metadata.issuer;
  await assert.rejects(
    () =>
      store.migrate('cred-2', bytes(32, 4), {
        strategy: 'prf',
        prfOutput: bytes(32, 9),
        randomBytes,
      }),
    /migration failed/,
  );
  assert.deepEqual(await store.get('cred-2', bytes(32, 3)), {
    metadata,
    credential: { secret: 'synthetic-only' },
  });
});

test('encrypted backup round-trips, rejects wrong passphrases, rollback, and partial records', async () => {
  const store = new InMemoryVaultStore();
  const metadata = {
    id: 'backup-1',
    credentialType: 'Synthetic',
    issuer: 'https://issuer.invalid',
  };
  await store.put(
    metadata,
    { secret: 'synthetic-only' },
    {
      strategy: 'passphrase',
      passphrase: 'synthetic recovery factor',
      randomBytes,
    },
  );
  const backup = await store.exportBackup({
    strategy: 'passphrase',
    passphrase: 'backup recovery factor',
    sequence: 2,
    createdAt: '2026-07-29T00:00:00Z',
    randomBytes,
  });
  assert.equal(JSON.stringify(backup).includes('synthetic-only'), false);
  await assert.rejects(
    () => openVaultBackup(backup, 'wrong recovery factor'),
    /operation|decrypt|corrupt/i,
  );
  await assert.rejects(
    () =>
      openVaultBackup(backup, 'backup recovery factor', { minimumSequence: 3 }),
    /rollback/,
  );
  const restored = new InMemoryVaultStore();
  await restored.restoreBackup(backup, 'backup recovery factor', {
    minimumSequence: 2,
  });
  assert.deepEqual(
    (await restored.get(metadata.id, 'synthetic recovery factor')).credential,
    { secret: 'synthetic-only' },
  );
  const partial = structuredClone(backup);
  const payload = await openVaultBackup(backup, 'backup recovery factor');
  partial.payload.ciphertext =
    backup.payload.ciphertext.slice(0, -1) +
    (backup.payload.ciphertext.endsWith('A') ? 'B' : 'A');
  await assert.rejects(() =>
    openVaultBackup(partial, 'backup recovery factor'),
  );
  assert.equal(payload.entries.length, 1);
});
