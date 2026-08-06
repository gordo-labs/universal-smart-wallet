import { describe, expect, it } from 'vitest';
import { WalletCredentialScanner } from './wallet.ts';

describe('wallet scanner', () => {
  it('supports offer/request sources and blocks untrusted links', () => {
    const scanner = new WalletCredentialScanner(value => value);
    expect(scanner.scanOffer('openid-credential-offer://?credential_offer=abc').kind).toBe('issuance');
    expect(scanner.scanRequest('openid4vp://?request=abc').kind).toBe('presentation');
    expect(() => scanner.scanDeepLink('foo://credential', 'issuance')).toThrowError('The link is not in the configured allow-list');
  });

  it('accepts only explicitly allow-listed HTTPS deep links', () => {
    const scanner = new WalletCredentialScanner(value => value, ['wallet.example']);
    expect(scanner.scanDeepLink('https://wallet.example/offer?id=1', 'issuance').source).toBe('deep-link');
    expect(() => scanner.scanDeepLink('https://evil.example/offer', 'issuance')).toThrowError(/allow-list/);
  });
});
