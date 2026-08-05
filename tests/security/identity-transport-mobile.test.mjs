import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CredentialScannerError,
  classifyCredentialInput,
  classifyUriScheme,
  parseCredentialInput,
} from '../../packages/credential-scanner/dist/index.js';
import {
  InMemoryOfflineReplayBoundary,
  createOfflineEnvelope,
  parseOfflineEnvelope,
  verifyOfflineEnvelope,
} from '../../packages/credential-scanner/dist/offline/index.js';
import {
  IdentityNativeAdapter,
  IdentityNativeError,
} from '../../packages/identity-sdk-react-native/dist/index.js';
import {
  MobileWalletController,
  MobileWalletError,
} from '../../apps/wallet-mobile/dist/index.js';

const NOW = 10_000;
const validPresentation = `openid4vp://?request=${encodeURIComponent('a.b-c_d.e')}`;
const validOffer =
  'openid-credential-offer://?credential_offer=%7B%22credential_issuer%22%3A%22https%3A%2F%2Fissuer.synthetic.example%22%2C%22credential_configuration_ids%22%3A%5B%22SyntheticIdentityCredential%22%5D%7D';

const encode = (value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};

const decode = (value) => {
  const padded =
    value.replaceAll('-', '+').replaceAll('_', '/') +
    '='.repeat((4 - (value.length % 4)) % 4);
  return new TextDecoder().decode(
    Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)),
  );
};

const offlineInput = (overrides = {}) => ({
  format: 'ssw-offline-envelope',
  schemaVersion: 1,
  envelopeId: 'identity-envelope-1',
  tenantId: 'tenant-a',
  jurisdiction: 'ES-test',
  issuerId: 'issuer.synthetic',
  schemaId: 'schema.identity.v1',
  keyId: 'issuer-key-v1',
  statusId: 'status-1',
  issuedAt: NOW - 100,
  expiresAt: NOW + 500,
  nonce: 'nonce-identity-0001',
  credential: 'synthetic-credential-bytes',
  ...overrides,
});

const offlineSigner = ({ payload }) => encode(payload);
const offlineVerifier = {
  verify: ({ payload, signature }) => signature === encode(payload),
};
const trustedRegistry = {
  evaluateCredential: () => ({
    decision: 'verified',
    code: 'CREDENTIAL_VERIFIED',
    snapshotId: 'snapshot-identity-1',
    snapshotExpiresAt: NOW + 900,
  }),
};

test('QR and deep-link parser rejects phishing, ambiguity, and unbounded input', () => {
  const jwt = 'a.b-c_d.e';
  const rejected = [
    'javascript:alert(1)',
    `openid4vp://evil.example?request=${jwt}`,
    `openid4vp://?request=${jwt}&request=${jwt}`,
    'openid4vp://?request=not-a-compact-token',
    `ssw-offline://v1/${'!'.repeat(32)}`,
    `openid4vp://?request=${'A'.repeat(20_000)}`,
  ];
  for (const value of rejected) {
    const result = classifyCredentialInput(value);
    assert.equal(
      result.accepted,
      false,
      `input must reject: ${value.slice(0, 40)}`,
    );
    assert.doesNotMatch(
      JSON.stringify(result),
      /javascript|evil\.example|A{20}/u,
    );
  }
  assert.equal(classifyUriScheme('javascript:alert(1)'), 'unknown');
  assert.throws(
    () =>
      parseCredentialInput(
        'openid4vp://?request_uri=https%3A%2F%2Fevil.example%2Fvp',
      ),
    (error) =>
      error instanceof CredentialScannerError &&
      error.code === 'UNTRUSTED_REQUEST_URI',
  );
  assert.equal(parseCredentialInput(validPresentation).kind, 'presentation');
  assert.equal(parseCredentialInput(validOffer).kind, 'issuance');
});

test('offline signature tampering, replay, stale status, and disclosure boundaries fail closed', async () => {
  const encoded = await createOfflineEnvelope(offlineInput(), {
    sign: offlineSigner,
  });
  const replay = new InMemoryOfflineReplayBoundary();
  const first = await verifyOfflineEnvelope(encoded, {
    verifier: offlineVerifier,
    registry: trustedRegistry,
    now: NOW,
    replay,
  });
  assert.equal(first.result, 'verified');
  assert.equal(first.code, 'VERIFIED');
  assert.equal(first.credential, undefined);
  const second = await verifyOfflineEnvelope(encoded, {
    verifier: offlineVerifier,
    registry: trustedRegistry,
    now: NOW,
    replay,
  });
  assert.deepEqual(
    { result: second.result, code: second.code },
    { result: 'rejected', code: 'REPLAY_DETECTED' },
  );

  const decoded = parseOfflineEnvelope(encoded);
  const tampered = encode(
    JSON.stringify({ ...decoded, schemaId: 'schema.attacker.v1' }),
  );
  const tamperedResult = await verifyOfflineEnvelope(tampered, {
    verifier: offlineVerifier,
    registry: trustedRegistry,
    now: NOW,
  });
  assert.deepEqual(
    { result: tamperedResult.result, code: tamperedResult.code },
    { result: 'rejected', code: 'SIGNATURE_INVALID' },
  );

  const stale = await verifyOfflineEnvelope(
    await createOfflineEnvelope(offlineInput({ expiresAt: NOW }), {
      sign: offlineSigner,
    }),
    { verifier: offlineVerifier, registry: trustedRegistry, now: NOW },
  );
  assert.deepEqual(
    { result: stale.result, code: stale.code },
    { result: 'indeterminate', code: 'FRESHNESS_EXPIRED' },
  );
  const unavailable = await verifyOfflineEnvelope(encoded, {
    verifier: offlineVerifier,
    registry: {
      evaluateCredential: () => ({
        decision: 'indeterminate',
        code: 'STATUS_UNKNOWN',
      }),
    },
    now: NOW,
  });
  assert.deepEqual(
    { result: unavailable.result, code: unavailable.code },
    { result: 'indeterminate', code: 'STATUS_UNKNOWN' },
  );
});

test('seeded adversarial mutations are deterministic and retain the failing seed', async () => {
  const encoded = await createOfflineEnvelope(offlineInput(), {
    sign: offlineSigner,
  });
  const source = parseOfflineEnvelope(encoded);
  const random = (seed) => {
    let state = seed >>> 0;
    return () => {
      state = (state * 1_664_525 + 1_013_904_223) >>> 0;
      return state;
    };
  };
  const run = async (seed) => {
    const next = random(seed);
    const mutated = { ...source };
    const choice = next() % 4;
    if (choice === 0) mutated.schemaId = `schema.attacker.${seed}`;
    if (choice === 1) mutated.tenantId = `tenant-attacker-${seed}`;
    if (choice === 2)
      mutated.signature = `${mutated.signature.slice(0, -1)}${mutated.signature.endsWith('A') ? 'B' : 'A'}`;
    if (choice === 3) mutated.expiresAt = NOW;
    const result = await verifyOfflineEnvelope(
      encode(JSON.stringify(mutated)),
      {
        verifier: offlineVerifier,
        registry: trustedRegistry,
        now: NOW,
      },
    );
    assert.notEqual(
      result.result,
      'verified',
      `seed=${seed} unexpectedly verified`,
    );
    return { seed, result: result.result, code: result.code };
  };
  const first = [];
  const second = [];
  for (let seed = 1; seed <= 64; seed += 1) {
    first.push(await run(seed));
    second.push(await run(seed));
  }
  assert.deepEqual(first, second);
  assert.equal(
    first.every(({ seed }) => Number.isInteger(seed)),
    true,
  );
});

function nativeHarness() {
  let state = 'active';
  const lifecycleListeners = new Set();
  const linkListeners = new Set();
  const calls = { stop: 0 };
  const lifecycle = {
    currentState: () => state,
    subscribe(listener) {
      lifecycleListeners.add(listener);
      return () => lifecycleListeners.delete(listener);
    },
  };
  const appLinks = {
    subscribe(listener) {
      linkListeners.add(listener);
      return () => linkListeners.delete(listener);
    },
  };
  const native = new IdentityNativeAdapter({
    lifecycle,
    appLinks,
    passkey: {
      register: async ({ signal }) =>
        new Promise((resolve) => {
          signal.addEventListener(
            'abort',
            () =>
              resolve({
                credentialId: 'unused',
                authenticatorData: new Uint8Array(),
                clientDataJSON: new Uint8Array(),
                signature: new Uint8Array(),
              }),
            { once: true },
          );
        }),
      authenticate: async () => ({
        credentialId: 'synthetic-passkey',
        authenticatorData: new Uint8Array([1]),
        clientDataJSON: new Uint8Array([2]),
        signature: new Uint8Array([3]),
      }),
    },
    secureStorage: {
      get: async () => new Uint8Array([1]),
      set: async () => {},
      delete: async () => true,
    },
    camera: {
      scan: async () => ({ value: validPresentation, format: 'qr' }),
      stop: () => {
        calls.stop += 1;
      },
    },
  });
  return {
    native,
    background() {
      state = 'background';
      for (const listener of lifecycleListeners) listener({ state, at: NOW });
    },
    link(value) {
      for (const listener of linkListeners) listener(value);
    },
    calls,
  };
}

test('mobile lifecycle cancels sensitive work, rejects deceptive links, and redacts errors', async () => {
  const h = nativeHarness();
  const rejected = h.native.waitForCredentialLink({
    expectedKind: 'presentation',
  });
  await new Promise((resolve) => setImmediate(resolve));
  h.link('javascript:alert(credential-secret)');
  await assert.rejects(
    rejected,
    (error) =>
      error instanceof IdentityNativeError &&
      error.code === 'LINK_REJECTED' &&
      !error.message.includes('credential-secret'),
  );
  h.native.dispose();
  assert.equal(h.calls.stop, 0);

  const backgrounded = nativeHarness();
  const pending = backgrounded.native.registerPasskey({
    challenge: 'synthetic-challenge',
    rpId: 'wallet.synthetic.example',
    userVerification: 'required',
  });
  backgrounded.background();
  await assert.rejects(
    pending,
    (error) =>
      error instanceof IdentityNativeError &&
      error.code === 'BACKGROUNDED' &&
      !error.message.includes('wallet.synthetic.example'),
  );
  backgrounded.native.dispose();
});

test('mobile wallet enforces one-time links and exact presentation consent', async () => {
  const h = nativeHarness();
  const app = new MobileWalletController({
    native: h.native,
    now: () => NOW,
    holder: {
      acceptOffer: async () => ({
        credentialId: 'synthetic-credential',
        format: 'sd-jwt-vc',
        assurance: 'institutional',
      }),
      present: async (input) => input,
    },
  });
  const item = app.receiveLink(validPresentation);
  assert.equal(item.kind, 'presentation');
  assert.throws(
    () => app.receiveLink(validPresentation),
    (error) =>
      error instanceof MobileWalletError && error.code === 'LINK_REPLAY',
  );
  await assert.rejects(
    () =>
      app.present(
        { claims: ['credentialRef'], consent: { accepted: false, claims: [] } },
        { confirm: true },
      ),
    (error) =>
      error instanceof MobileWalletError &&
      error.code === 'CONSENT_REQUIRED' &&
      !error.message.includes('credentialRef'),
  );
  app.dispose();
  assert.equal(app.state, 'disposed');
  assert.deepEqual(app.inboxItems, []);
});
