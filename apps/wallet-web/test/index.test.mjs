import { describe, expect, it } from 'vitest';
import {
  WalletController,
  WalletUiError,
  detectPasskeyCapability,
  sanitizeRemoteText,
} from '../dist/index.js';
import { buildOpenId4VpRequest } from '@ssw/openid4vc';
import { toDcql, ageOver18Policy } from '@ssw/presentation-policy';

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

  it('exposes an explicit consent summary and blocks ambiguous origins', async () => {
    const wallet = new WalletController();
    wallet.setup('correct horse battery staple');
    const request = buildOpenId4VpRequest({
      clientId: 'https://verifier.example',
      responseUri: 'https://other.example/callback',
      nonce: 'nonce',
      state: 'state',
      dcqlQuery: toDcql(ageOver18Policy()),
    });
    const review = await wallet.reviewPresentation(request);
    expect(review.consent).toMatchObject({
      requester: 'https://verifier.example',
      requesterOrigin: 'https://verifier.example',
      requestedData: ['is_over_18'],
      purpose: 'Verifier request',
      canApprove: false,
      trust: { identity: 'ambiguous', level: 'blocked' },
    });
    expect(() => wallet.requirePresentationApproval()).toThrow(
      expect.objectContaining({ code: 'unsafe-request' }),
    );
  });

  it('denies without revealing hidden claim matching and strips remote markup', () => {
    const wallet = new WalletController();
    wallet.setup('correct horse battery staple');
    expect(sanitizeRemoteText('<img src=x>Verifier\u0000')).toBe('Verifier');
    const error = wallet.denyPresentation();
    expect(error).toMatchObject({
      code: 'cancelled-presentation',
      message: 'Presentation cancelled; no disclosure was sent',
    });
    expect(error.message).not.toMatch(/claim|is_over_18|birth/i);
  });
});
