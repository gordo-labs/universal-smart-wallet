import test from 'node:test';
import assert from 'node:assert/strict';
import { AdminVerifierScanner } from './verifier';
import { ScanInputError } from './input';
import { WebCameraAdapter } from './web-camera';

test('admin scanner rejects unknown schemes and consumes a scan once', () => {
  const scanner = new AdminVerifierScanner(value => value);
  assert.throws(() => scanner.scanDeepLink('javascript:alert(1)'), (error: unknown) => error instanceof ScanInputError && error.code === 'UNTRUSTED_LINK');
  const first = scanner.scanUri('openid4vp://?request=abc');
  assert.equal(first.source, 'uri');
  assert.throws(() => scanner.scanUri('openid4vp://?request=abc'), /Duplicate scan/);
});

test('permission denial exposes manual fallback and camera stop clears tracks', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const stopped: number[] = [];
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => { throw new DOMException('denied', 'NotAllowedError'); } } } });
  const adapter = new WebCameraAdapter();
  let fallback = 0;
  assert.equal(await adapter.start({ srcObject: null }, { onManualFallback: () => { fallback += 1; } }), 'permission-denied');
  assert.equal(fallback, 1);
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => stopped.push(1) }] }) } } });
  await adapter.start({ srcObject: null, play: async () => undefined });
  adapter.stop();
  assert.equal(stopped.length, 1);
  if (original) Object.defineProperty(globalThis, 'navigator', original);
});
