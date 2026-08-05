import { test, expect } from 'vitest';
import { normalizeWalletError } from '../dist/index.js';
import { normalizeIdentityError } from '../dist/index.js';

test('normalizes errors without exposing secrets or credential material', () => {
  const result = normalizeWalletError({ code: 'AUTH_INVALID', message: 'token=super-secret', credential: 'private-key' });
  expect(result).toEqual({ code: 'AUTH_INVALID', message: 'Wallet operation failed' });
  expect(JSON.stringify(result)).not.toContain('super-secret');
});

test('provider API exposes modular wallet capabilities without credential fields', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../dist/index.js', import.meta.url), 'utf8'));
  expect(source).toMatch(/WalletProvider/);
  expect(source).not.toMatch(/privateKey|recoverySecret|credentialValue/iu);
});

test('identity hooks redact errors and include cancellation/stale-state guards', async () => {
  const result = normalizeIdentityError({ code: 'OPERATION_FAILED', message: 'credential=secret', credential: 'private-key' });
  expect(result).toEqual({ code: 'OPERATION_FAILED', message: 'Identity operation failed' });
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../dist/identity.js', import.meta.url), 'utf8'));
  expect(source).toMatch(/AbortController/);
  expect(source).toMatch(/sequence\.current/);
  expect(source).toMatch(/setState\(\{ loading: true \}\)/);
  expect(source).not.toMatch(/privateKey|recoverySecret|credentialValue/iu);
});
