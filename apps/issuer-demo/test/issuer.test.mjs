import { describe, expect, it } from 'vitest';
import {
  createSyntheticIssuer,
  issuerDemoUi,
  syntheticPublicKey,
} from '../src/index.ts';

describe('synthetic OpenID4VCI issuer routes', () => {
  it('completes the wallet offer flow and exposes only synthetic key material', async () => {
    const issuer = createSyntheticIssuer();
    const result = await (
      await import('@ssw/openid4vc')
    ).issuePreAuthorizedCredential({
      offer: issuer.offer,
      transport: issuer.transport,
      proofJwt: 'synthetic-proof',
      verifyCredential: async (credential) => ({
        issuer: 'https://issuer.example',
        vct: 'AgeCredential',
        credential,
      }),
    });
    expect(result.credential).toContain('is_over_18-true');
    expect(issuer.route('/.well-known/jwks.json').body).toContain(
      syntheticPublicKey.kid,
    );
  });

  it.each(['expired', 'reused', 'invalid-code', 'revoked'])(
    'supports %s fixture',
    async (fixture) => {
      const issuer = createSyntheticIssuer(fixture);
      if (fixture === 'invalid-code')
        expect(
          issuer.route('/oauth/token', {
            method: 'POST',
            body: 'pre-authorized_code=wrong',
          }).status,
        ).toBe(400);
      else if (fixture === 'reused') {
        expect(
          issuer.route('/oauth/token', {
            method: 'POST',
            body: 'pre-authorized_code=synthetic-reused-pre-authorized-code',
          }).status,
        ).toBe(400);
      } else {
        expect(
          issuer.route('/credential', {
            method: 'POST',
            headers: {
              authorization: `Bearer synthetic-access-token-${fixture}`,
            },
            body: JSON.stringify({ proof: { jwt: 'synthetic-proof' } }),
          }).status,
        ).toBe(200);
      }
    },
  );

  it('bounds requests and keeps UI copy PII-free', () => {
    const issuer = createSyntheticIssuer();
    expect(
      issuer.route('/credential', { method: 'POST', body: 'x'.repeat(16_385) })
        .status,
    ).toBe(413);
    expect(issuerDemoUi.warning).toMatch(/no real identity/i);
    expect(issuerDemoUi.warning).not.toMatch(/enter|provide|upload|submit/i);
  });
});
