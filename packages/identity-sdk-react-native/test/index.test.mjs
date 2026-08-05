import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IdentityNativeAdapter,
  IdentityNativeError,
} from '../dist/index.js';

function harness(initialState = 'active') {
  let state = initialState;
  const lifecycleListeners = new Set();
  const linkListeners = new Set();
  const calls = { stop: 0, unsubscribeLifecycle: 0, unsubscribeLinks: 0 };
  const lifecycle = {
    currentState: () => state,
    subscribe(listener) {
      lifecycleListeners.add(listener);
      return () => { calls.unsubscribeLifecycle += 1; lifecycleListeners.delete(listener); };
    },
  };
  const appLinks = {
    subscribe(listener) {
      linkListeners.add(listener);
      return () => { calls.unsubscribeLinks += 1; linkListeners.delete(listener); };
    },
  };
  const emitLifecycle = (next) => {
    state = next;
    for (const listener of lifecycleListeners) listener({ state: next, at: 1 });
  };
  const emitLink = (value) => { for (const listener of linkListeners) listener(value); };
  return { lifecycle, appLinks, calls, emitLifecycle, emitLink };
}

test('package stays framework-neutral and exposes no React Native import', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../src/index.ts', import.meta.url), 'utf8'));
  assert.doesNotMatch(source, /from\s+['"](?:react-native|expo)(?:\/|['"])/iu);
});

test('backgrounding cancels passkey work and propagates a redacted reason', async () => {
  const h = harness();
  let observedSignal;
  const adapter = new IdentityNativeAdapter({
    lifecycle: h.lifecycle,
    appLinks: h.appLinks,
    passkey: { register: async ({ signal }) => new Promise((resolve) => { observedSignal = signal; signal.addEventListener('abort', () => resolve({ credentialId: 'never-used', authenticatorData: new Uint8Array(), clientDataJSON: new Uint8Array(), signature: new Uint8Array() }), { once: true }); }), authenticate: async () => { throw new Error('unused'); } },
    secureStorage: { get: async () => undefined, set: async () => {}, delete: async () => false },
    camera: { scan: async () => ({ value: 'unused' }) },
  });
  const pending = adapter.registerPasskey({ challenge: 'c', rpId: 'wallet.example', userVerification: 'required' });
  h.emitLifecycle('background');
  await assert.rejects(pending, (error) => error instanceof IdentityNativeError && error.code === 'BACKGROUNDED' && !error.message.includes('wallet.example'));
  assert.equal(observedSignal.aborted, true);
  adapter.dispose();
});

test('secure storage is byte-only, bounded, cloned, and never exposes backup', async () => {
  const h = harness();
  let stored;
  const adapter = new IdentityNativeAdapter({
    lifecycle: h.lifecycle, appLinks: h.appLinks,
    passkey: { register: async () => { throw new Error('unused'); }, authenticate: async () => { throw new Error('unused'); } },
    secureStorage: { get: async () => stored, set: async (_key, value) => { stored = value; }, delete: async () => true },
    camera: { scan: async () => ({ value: 'unused' }) },
  });
  const input = new Uint8Array([1, 2]);
  await adapter.writeSecret('vault:key', input);
  input[0] = 9;
  assert.deepEqual([...await adapter.readSecret('vault:key')], [1, 2]);
  await assert.rejects(Promise.resolve().then(() => adapter.writeSecret('vault:key', 'plaintext')), (error) => error.code === 'INVALID_INPUT');
  assert.equal('export' in adapter, false);
  adapter.dispose();
});

test('deep links are parsed, invalid links fail closed, and cancellation removes listener', async () => {
  const h = harness();
  const adapter = new IdentityNativeAdapter({
    lifecycle: h.lifecycle, appLinks: h.appLinks,
    passkey: { register: async () => { throw new Error('unused'); }, authenticate: async () => { throw new Error('unused'); } },
    secureStorage: { get: async () => undefined, set: async () => {}, delete: async () => false },
    camera: { scan: async () => ({ value: 'unused' }) },
  });
  const request = encodeURIComponent('a.b-c_d.e');
  const received = adapter.waitForCredentialLink({ expectedKind: 'presentation' });
  await new Promise((resolve) => setImmediate(resolve));
  h.emitLink('javascript:alert(1)');
  await assert.rejects(received, (error) => error instanceof IdentityNativeError && error.code === 'LINK_REJECTED' && !error.message.includes('javascript'));
  const controller = new AbortController();
  const cancelled = adapter.waitForCredentialLink({ signal: controller.signal });
  controller.abort();
  await assert.rejects(cancelled, (error) => error instanceof IdentityNativeError && error.code === 'ABORTED');
  assert.ok(h.calls.unsubscribeLinks >= 2);
  const valid = adapter.waitForCredentialLink({ expectedKind: 'presentation' });
  await new Promise((resolve) => setImmediate(resolve));
  h.emitLink(`openid4vp://?request=${request}`);
  assert.equal((await valid).kind, 'presentation');
  adapter.dispose();
});

test('camera is stopped after completion and cancellation', async () => {
  const h = harness();
  let resolveScan;
  let stopped = 0;
  const adapter = new IdentityNativeAdapter({
    lifecycle: h.lifecycle, appLinks: h.appLinks,
    passkey: { register: async () => { throw new Error('unused'); }, authenticate: async () => { throw new Error('unused'); } },
    secureStorage: { get: async () => undefined, set: async () => {}, delete: async () => false },
    camera: { scan: async ({ signal }) => new Promise((resolve) => { resolveScan = resolve; signal.addEventListener('abort', () => {}, { once: true }); }), stop: () => { stopped += 1; } },
  });
  const pending = adapter.scanCamera();
  await new Promise((resolve) => setImmediate(resolve));
  resolveScan({ value: 'opaque-qr' });
  assert.equal((await pending).value, 'opaque-qr');
  assert.equal(stopped, 1);
  adapter.dispose();
});

test('initial universal link uses the same bounded parser and cancellation boundary', async () => {
  const h = harness();
  const request = encodeURIComponent('a.b-c_d.e');
  const adapter = new IdentityNativeAdapter({
    lifecycle: h.lifecycle,
    appLinks: {
      subscribe: h.appLinks.subscribe,
      initialLink: async () => `openid4vp://?request=${request}`,
    },
    passkey: { register: async () => { throw new Error('unused'); }, authenticate: async () => { throw new Error('unused'); } },
    secureStorage: { get: async () => undefined, set: async () => {}, delete: async () => false },
    camera: { scan: async () => ({ value: 'unused' }) },
  });
  assert.equal((await adapter.waitForCredentialLink({ expectedKind: 'presentation' })).kind, 'presentation');
  adapter.dispose();
});
