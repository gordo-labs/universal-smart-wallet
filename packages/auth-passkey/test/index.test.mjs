import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PasskeyAuthError,
  choosePrfStrategy,
  classifyPasskeyError,
  createBrowserPasskeyAdapter,
  createDeterministicPasskeyFixture,
  createPasskeyAuthService,
  InMemoryChallengeStore,
} from '../dist/index.js';

const fixture = createDeterministicPasskeyFixture();
const verifier = { verify: async ({ assertion }) => assertion.signature[0] === 5 };
const serviceWith = (now = 100) => createPasskeyAuthService({ verifier, challengeStore: new InMemoryChallengeStore(), now: () => now });
const put = async (store, context) => store.put(context);

test('registration binds origin, RP ID, challenge, account, UV and verifier code hash', async () => {
  const store = new InMemoryChallengeStore();
  const service = createPasskeyAuthService({ verifier, challengeStore: store, now: () => 100 });
  const context = fixture.context('registration');
  await put(store, context);
  const credential = await service.register(context, fixture.assertion('registration'));
  assert.equal(credential.account, fixture.account);
  for (const [field, value, code] of [
    ['origin', 'https://evil.example', 'ORIGIN_MISMATCH'],
    ['rpId', 'evil.example', 'RP_ID_MISMATCH'],
    ['challenge', 'replayed', 'CHALLENGE_MISMATCH'],
    ['account', '0x2222222222222222222222222222222222222222', 'ACCOUNT_MISMATCH'],
    ['verifierCodeHash', `0x${'33'.repeat(32)}`, 'VERIFIER_CODE_HASH_MISMATCH'],
  ]) {
    const retryStore = new InMemoryChallengeStore();
    const retry = createPasskeyAuthService({ verifier, challengeStore: retryStore, now: () => 100 });
    await retryStore.put(context);
    await assert.rejects(retry.register(context, { ...fixture.assertion('registration'), [field]: value }), (error) => error.code === code);
  }
  const uvStore = new InMemoryChallengeStore();
  const uvService = createPasskeyAuthService({ verifier, challengeStore: uvStore, now: () => 100 });
  await uvStore.put({ ...context, challenge: 'uv' });
  await assert.rejects(uvService.register({ ...context, challenge: 'uv' }, { ...fixture.assertion('registration'), challenge: 'uv', userVerified: false }), (error) => error.code === 'USER_VERIFICATION_REQUIRED');
});

test('challenge is single-use and context expiry is fail-closed', async () => {
  const store = new InMemoryChallengeStore();
  const service = createPasskeyAuthService({ verifier, challengeStore: store, now: () => 100 });
  const context = fixture.context('registration');
  await store.put(context);
  await service.register(context, fixture.assertion('registration'));
  await assert.rejects(service.register(context, fixture.assertion('registration')), (error) => error.code === 'CHALLENGE_REPLAYED');
  const expiredStore = new InMemoryChallengeStore();
  const expiredService = createPasskeyAuthService({ verifier, challengeStore: expiredStore, now: () => 200 });
  const expired = fixture.context('registration');
  await expiredStore.put(expired);
  await assert.rejects(expiredService.register(expired, fixture.assertion('registration')), (error) => error.code === 'CONTEXT_EXPIRED');
});

test('rotation verifies replacement before revoking old signer and preserves account/DID', async () => {
  const store = new InMemoryChallengeStore();
  const service = createPasskeyAuthService({ verifier, challengeStore: store, now: () => 100 });
  const first = fixture.context('registration');
  await store.put(first);
  await service.register(first, fixture.assertion('registration', 'old'));
  const failedContext = { ...fixture.context('registration', 'new'), challenge: 'failed' };
  await store.put(failedContext);
  await assert.rejects(service.rotate({ context: failedContext, oldCredentialId: 'old', replacement: { ...fixture.assertion('registration', 'new'), challenge: 'failed', signature: new Uint8Array([9]) } }), /rejected/);
  assert.equal(service.credentials().find((value) => value.credentialId === 'old').status, 'active');
  const goodContext = { ...fixture.context('registration', 'new'), challenge: 'good' };
  await store.put(goodContext);
  const result = await service.rotate({ context: goodContext, oldCredentialId: 'old', replacement: { ...fixture.assertion('registration', 'new'), challenge: 'good' } });
  assert.equal(result.account, fixture.account);
  assert.equal(result.did, goodContext.did);
  assert.equal(service.credentials().find((value) => value.credentialId === 'old').status, 'revoked');
  assert.equal(service.credentials().find((value) => value.credentialId === 'new').status, 'active');
});

test('removal requires an active replacement and never removes the last signer', async () => {
  const service = serviceWith();
  assert.throws(() => service.remove({ credentialId: 'old', replacementCredentialId: 'new' }), (error) => error.code === 'CREDENTIAL_NOT_FOUND');
});

test('browser adapter requires UV and exposes explicit PRF fallback', async () => {
  const calls = [];
  const api = {
    capabilities: async () => ({ webauthn: true, prf: false, reason: 'unsupported' }),
    create: async (input) => { calls.push(input); return { credentialId: 'browser', publicKey: new Uint8Array([1]), assertion: fixture.assertion('registration', 'browser') }; },
    get: async (input) => { calls.push(input); return { assertion: fixture.assertion('authentication', 'browser') }; },
  };
  const adapter = createBrowserPasskeyAdapter({ api });
  assert.equal(choosePrfStrategy({ preferPrf: true, capabilities: await adapter.capabilities() }), 'passphrase');
  await adapter.register({ context: fixture.context('registration'), preferPrf: true });
  assert.equal(calls[0].userVerification, 'required');
  assert.equal(calls[0].prf, false);
  assert.equal(classifyPasskeyError(new DOMException('cancel', 'NotAllowedError')).code, 'USER_CANCELLED');
  assert.equal(classifyPasskeyError(new DOMException('unsupported', 'NotSupportedError')).code, 'AUTHENTICATOR_UNAVAILABLE');
});

test('step-up returns proof only after the bound passkey verifies', async () => {
  const store = new InMemoryChallengeStore();
  const service = createPasskeyAuthService({ verifier, challengeStore: store, now: () => 100 });
  const registration = fixture.context('registration');
  await store.put(registration);
  await service.register(registration, fixture.assertion('registration'));
  const step = { ...fixture.context('step-up'), challenge: 'step' };
  await store.put(step);
  const result = await service.stepUp(step, { ...fixture.assertion('step-up'), challenge: 'step' });
  assert.deepEqual(result, { verified: true, account: fixture.account, did: step.did, challenge: 'step' });
});
