import { describe, expect, it } from 'vitest';
import {
  WalletController,
  WalletUiError,
  detectPasskeyCapability,
} from '../dist/index.js';

const offer = {
  credential_issuer: 'https://issuer.example',
  credential_configuration_ids: ['age'],
  grants: {
    'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
      'pre-authorized_code': 'code',
    },
  },
};

describe('wallet web controller', () => {
  it('keeps credentials behind an explicit unlock and clears session on lock', async () => {
    const wallet = new WalletController();
    expect(() => wallet.listCredentials()).not.toThrow();
    expect(() => wallet.reviewOffer(offer)).toThrow(WalletUiError);
    wallet.setup('correct horse battery staple');
    expect(wallet.state.screen).toBe('credentials');
    wallet.reviewOffer(offer);
    wallet.lock();
    expect(wallet.state).toEqual({ screen: 'locked', unlocked: false });
  });

  it('rejects malformed offers and supports cancellation without disclosure', () => {
    const wallet = new WalletController();
    wallet.setup('correct horse battery staple');
    expect(() => wallet.reviewOffer({ bad: true })).toThrow(WalletUiError);
    const error = wallet.cancelPresentation();
    expect(error.code).toBe('cancelled-presentation');
    expect(wallet.state.screen).toBe('credentials');
  });

  it('reports a safe PRF capability fallback', () => {
    expect(detectPasskeyCapability({ isSecureContext: true })).toEqual({
      available: false,
      reason: 'webauthn-unsupported',
    });
  });
});
