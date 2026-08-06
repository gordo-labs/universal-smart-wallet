import test from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryOfflineReplayBoundary,
  OfflineTrustStatusCache,
  createOfflineEnvelope,
  parseOfflineEnvelope,
  verifyOfflineEnvelope,
} from '../dist/offline/index.js';

const encode = (value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};

const fixtureSign = ({ payload }) => encode(payload);
const fixtureVerifier = {
  verify: ({ payload, signature }) => signature === fixtureSign({ payload }),
};

const scope = { tenantId: 'tenant-a', jurisdiction: 'ES' };
const snapshot = {
  schemaVersion: 1,
  snapshotId: 'snapshot-1',
  ...scope,
  sequence: 1,
  issuedAt: 900,
  expiresAt: 2_000,
  signingKeyId: 'registry-key-1',
  issuers: [
    {
      issuerId: 'issuer.example/registrar',
      status: 'active',
      schemas: [{ schemaId: 'schema:diploma:v1', status: 'active' }],
      keys: [{ keyId: 'issuer-key-1', status: 'active', authorizedFrom: 1 }],
    },
  ],
  statuses: [
    { issuerId: 'issuer.example/registrar', statusId: 'status-1', status: 'valid' },
  ],
  signature: 'fixture-snapshot-signature',
};

const envelopeInput = (overrides = {}) => ({
  format: 'ssw-offline-envelope',
  schemaVersion: 1,
  envelopeId: 'envelope-1',
  ...scope,
  issuerId: 'issuer.example/registrar',
  schemaId: 'schema:diploma:v1',
  keyId: 'issuer-key-1',
  statusId: 'status-1',
  issuedAt: 950,
  expiresAt: 1_200,
  nonce: 'nonce-0123456789',
  credential: 'synthetic-credential-fixture',
  ...overrides,
});

const makeCache = async () => {
  const cache = new OfflineTrustStatusCache(
    { verify: async () => true },
    () => 1_000,
  );
  await cache.prime(snapshot);
  return cache;
};

test('fresh signed offline envelope verifies with a local trust/status cache', async () => {
  const cache = await makeCache();
  const encoded = await createOfflineEnvelope(envelopeInput(), { sign: fixtureSign });
  const replay = new InMemoryOfflineReplayBoundary();
  const result = await verifyOfflineEnvelope(encoded, {
    verifier: fixtureVerifier,
    registry: cache,
    now: 1_000,
    replay,
  });
  assert.deepEqual(
    { result: result.result, code: result.code, snapshotId: result.snapshotId },
    { result: 'verified', code: 'VERIFIED', snapshotId: 'snapshot-1' },
  );
  assert.equal(result.issuerId, 'issuer.example/registrar');
  assert.equal(result.credential, undefined);
});

test('stale or unknown trust/status is indeterminate and never verified', async () => {
  const cache = await makeCache();
  const stale = await createOfflineEnvelope(envelopeInput({ expiresAt: 1_000 }), { sign: fixtureSign });
  const staleResult = await verifyOfflineEnvelope(stale, {
    verifier: fixtureVerifier,
    registry: cache,
    now: 1_000,
  });
  assert.equal(staleResult.result, 'indeterminate');
  assert.equal(staleResult.code, 'FRESHNESS_EXPIRED');

  const unknown = await createOfflineEnvelope(envelopeInput({ statusId: 'status-unknown' }), { sign: fixtureSign });
  const unknownResult = await verifyOfflineEnvelope(unknown, {
    verifier: fixtureVerifier,
    registry: cache,
    now: 1_000,
  });
  assert.equal(unknownResult.result, 'indeterminate');
  assert.equal(unknownResult.code, 'STATUS_UNKNOWN');

  const expiredCache = await verifyOfflineEnvelope(
    await createOfflineEnvelope(envelopeInput({ expiresAt: 1_500 }), { sign: fixtureSign }),
    { verifier: fixtureVerifier, registry: cache, now: 2_000 },
  );
  assert.equal(expiredCache.result, 'indeterminate');
  assert.equal(expiredCache.code, 'FRESHNESS_EXPIRED');
});

test('tamper and replay fail closed without disclosing credential bytes', async () => {
  const cache = await makeCache();
  const encoded = await createOfflineEnvelope(envelopeInput(), { sign: fixtureSign });
  const raw = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - encoded.length % 4) % 4)), (c) => c.charCodeAt(0))));
  raw.schemaId = 'schema:tampered:v1';
  const tampered = encode(JSON.stringify(raw));
  const replay = new InMemoryOfflineReplayBoundary();
  const tamperResult = await verifyOfflineEnvelope(tampered, { verifier: fixtureVerifier, registry: cache, now: 1_000, replay });
  assert.equal(tamperResult.result, 'rejected');
  assert.equal(tamperResult.code, 'SIGNATURE_INVALID');

  const first = await verifyOfflineEnvelope(encoded, { verifier: fixtureVerifier, registry: cache, now: 1_000, replay });
  const second = await verifyOfflineEnvelope(encoded, { verifier: fixtureVerifier, registry: cache, now: 1_000, replay });
  assert.equal(first.result, 'verified');
  assert.equal(second.result, 'rejected');
  assert.equal(second.code, 'REPLAY_DETECTED');
});

test('downgrade, duplicate-key, and unbounded payloads are rejected', async () => {
  const encoded = await createOfflineEnvelope(envelopeInput(), { sign: fixtureSign });
  const decoded = parseOfflineEnvelope(encoded);
  assert.equal(decoded.schemaVersion, 1);

  const downgraded = encode(JSON.stringify({ ...decoded, schemaVersion: 0 }));
  const result = await verifyOfflineEnvelope(downgraded, {
    verifier: fixtureVerifier,
    registry: { evaluateCredential: () => ({ decision: 'verified', code: 'CREDENTIAL_VERIFIED' }) },
    now: 1_000,
  });
  assert.equal(result.result, 'rejected');
  assert.equal(result.code, 'DOWNGRADE_DETECTED');

  const duplicate = encode(JSON.stringify({ ...decoded, schemaVersion: 1 }).replace('"format":"ssw-offline-envelope"', '"format":"ssw-offline-envelope","format":"ssw-offline-envelope"'));
  assert.equal((await verifyOfflineEnvelope(duplicate, { verifier: fixtureVerifier, registry: { evaluateCredential: () => ({ decision: 'verified', code: 'CREDENTIAL_VERIFIED' }) }, now: 1_000 })).code, 'MALFORMED_ENVELOPE');

  await assert.rejects(
    createOfflineEnvelope(envelopeInput({ credential: 'x'.repeat(8_193) }), { sign: fixtureSign }),
    /credential is invalid/,
  );
});

test('cache rejects signature failures and sequence rollback', async () => {
  const cache = new OfflineTrustStatusCache({ verify: () => false }, () => 1_000);
  await assert.rejects(cache.prime(snapshot), /CACHE_SIGNATURE_INVALID/);

  const trusted = await makeCache();
  await assert.rejects(trusted.prime({ ...snapshot, sequence: 0 }), /CACHE_INVALID/);
});

