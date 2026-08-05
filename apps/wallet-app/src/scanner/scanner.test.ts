import test from 'node:test';
import assert from 'node:assert/strict';
import { WalletCredentialScanner } from './wallet';
import { ScanInputError } from './input';

test('wallet scanner supports offer/request sources and blocks untrusted links', () => {
  const scanner = new WalletCredentialScanner(value => value);
  assert.equal(scanner.scanOffer('openid-credential-offer://?credential_offer=abc').kind, 'issuance');
  assert.equal(scanner.scanRequest('openid4vp://?request=abc').kind, 'presentation');
  assert.throws(() => scanner.scanDeepLink('foo://credential', 'issuance'), (error: unknown) => error instanceof ScanInputError && error.code === 'UNTRUSTED_LINK');
});

test('wallet scanner accepts only explicitly allow-listed HTTPS deep links', () => {
  const scanner = new WalletCredentialScanner(value => value, ['wallet.example']);
  assert.equal(scanner.scanDeepLink('https://wallet.example/offer?id=1', 'issuance').source, 'deep-link');
  assert.throws(() => scanner.scanDeepLink('https://evil.example/offer', 'issuance'), /allow-list/);
});
