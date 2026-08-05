import test from 'node:test';
import assert from 'node:assert/strict';
import { IdentityNativeAdapter, IdentityNativeError } from '@ssw/identity-sdk-react-native';
import { MobileWalletController, MobileWalletError, SingleUseLinkGate } from '../dist/index.js';

const validOffer = 'openid-credential-offer://?credential_offer=%7B%22credential_issuer%22%3A%22https%3A%2F%2Fissuer.example%22%2C%22credential_configuration_ids%22%3A%5B%22SyntheticEnrollment%22%5D%7D';
const validPresentation = `openid4vp://?request=${encodeURIComponent('a.b-c_d.e')}`;
const validOffline = `ssw-offline://v1/${'A'.repeat(32)}`;

function harness() {
  let lifecycleState = 'active';
  const lifecycleListeners = new Set();
  const linkListeners = new Set();
  const camera = { stopped: 0, value: validOffer };
  const lifecycle = {
    currentState: () => lifecycleState,
    subscribe(listener) { lifecycleListeners.add(listener); return () => lifecycleListeners.delete(listener); },
  };
  const native = new IdentityNativeAdapter({
    lifecycle,
    appLinks: { subscribe(listener) { linkListeners.add(listener); return () => linkListeners.delete(listener); } },
    passkey: {
      register: async ({ signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new IdentityNativeError('BACKGROUNDED')), { once: true });
      }),
      authenticate: async () => ({ credentialId: 'synthetic', authenticatorData: new Uint8Array([1]), clientDataJSON: new Uint8Array([2]), signature: new Uint8Array([3]) }),
    },
    secureStorage: { get: async () => new Uint8Array([7]), set: async () => {}, delete: async () => true },
    camera: { scan: async () => ({ value: camera.value, format: 'qr' }), stop: () => { camera.stopped += 1; } },
  });
  return { native, camera, background() { lifecycleState = 'background'; for (const listener of lifecycleListeners) listener({ state: 'background', at: 1 }); }, link(value) { for (const listener of linkListeners) listener(value); } };
}

function controller(h, overrides = {}) {
  const holder = {
    acceptOffer: async () => ({ credentialId: 'credential-1', format: 'sd-jwt-vc', artifact: { format: 'sd-jwt-vc', profile: 'x', version: '1', mediaType: 'application', kind: 'credential', value: 'synthetic' }, assurance: 'institutional', createdAt: 1 }),
    present: async input => input,
  };
  return new MobileWalletController({ native: h.native, holder, ...overrides });
}

test('sensitive passkey sessions are cancelled when app backgrounds', async () => {
  const h = harness();
  const app = controller(h);
  const pending = app.registerPasskey({ challenge: 'synthetic', rpId: 'wallet.example' });
  h.background();
  await assert.rejects(pending, error => error instanceof IdentityNativeError && error.code === 'BACKGROUNDED');
  app.dispose();
});

test('secure values only pass through byte-only native storage', async () => {
  const h = harness();
  const app = controller(h);
  const value = await app.readProtectedSecret('vault:key');
  assert.deepEqual([...value], [7]);
  await app.writeProtectedSecret('vault:key', new Uint8Array([8]));
  app.dispose();
});

test('issuance and presentation links are single-use and inbox-bound', async () => {
  const h = harness();
  const app = controller(h);
  const first = app.receiveLink(validOffer);
  assert.equal(first.kind, 'issuance');
  assert.throws(() => app.receiveLink(validOffer), error => error instanceof MobileWalletError && error.code === 'LINK_REPLAY');
  const request = app.receiveLink(validPresentation);
  assert.equal(request.kind, 'presentation');
  assert.equal(app.inboxItems.length, 2);
  app.dispose();
});

test('camera permission denial exposes recovery UI and does not start camera', async () => {
  const h = harness();
  const app = controller(h);
  const result = await app.scanCamera(false);
  assert.equal(result.ok, false);
  assert.match(result.permission.recoveryMessage, /paste.*link/iu);
  assert.equal(h.camera.stopped, 0);
  app.dispose();
});

test('camera scans stop at the native boundary and duplicate payloads fail closed', async () => {
  const h = harness();
  const app = controller(h);
  const result = await app.scanCamera(true);
  assert.equal(result.ok, true);
  assert.equal(h.camera.stopped, 1);
  h.camera.value = validOffer;
  await assert.rejects(app.scanCamera(true), error => error instanceof MobileWalletError && error.code === 'LINK_REPLAY');
  app.dispose();
});

test('one-time gate retains only bounded digests', () => {
  const gate = new SingleUseLinkGate(2);
  assert.equal(gate.accept('a'), true);
  assert.equal(gate.accept('a'), false);
  assert.equal(gate.accept('b'), true);
  assert.equal(gate.size, 2);
  assert.equal(gate.accept('c'), true);
  assert.equal(gate.size, 2);
});
