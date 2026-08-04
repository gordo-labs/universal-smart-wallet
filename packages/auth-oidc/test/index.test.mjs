import { describe, expect, it } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import {
  InMemoryOidcStateStore, OidcAuthError, appleProvider, googleProvider,
  pkceChallenge, verifyIdToken, discover,
} from '../dist/index.js';

describe('@ssw/auth-oidc', () => {
  it('creates S256 PKCE challenges without leaking the verifier', async () => {
    const verifier = 'a'.repeat(48);
    const challenge = await pkceChallenge(verifier);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).not.toContain(verifier);
  });

  it('verifies issuer, audience, nonce, signature and expiry', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey); jwk.kid = 'fixture'; jwk.alg = 'RS256';
    const token = await new SignJWT({ nonce: 'n-1', email: 'fixture@example.test', email_verified: true })
      .setProtectedHeader({ alg: 'RS256', kid: 'fixture' }).setIssuer('https://issuer.example')
      .setAudience('client').setSubject('subject-1').setIssuedAt().setExpirationTime('5m').sign(privateKey);
    const identity = await verifyIdToken(token, { issuer: 'https://issuer.example', audience: 'client', nonce: 'n-1', jwks: { keys: [jwk] } });
    expect(identity).toMatchObject({ issuer: 'https://issuer.example', subject: 'subject-1', email: 'fixture@example.test' });
    await expect(verifyIdToken(token, { issuer: 'https://issuer.example', audience: 'other', nonce: 'n-1', jwks: { keys: [jwk] } })).rejects.toMatchObject({ code: 'AUDIENCE_MISMATCH' });
    await expect(verifyIdToken(token, { issuer: 'https://issuer.example', audience: 'client', nonce: 'wrong', jwks: { keys: [jwk] } })).rejects.toMatchObject({ code: 'NONCE_MISMATCH' });
  });

  it('rejects insecure or oversized discovery responses', async () => {
    await expect(discover({ issuer: 'http://issuer.test', clientId: 'c' }, async () => new Response('{}'))).rejects.toMatchObject({ code: 'SSRF_BLOCKED' });
    const fetcher = async () => new Response('{"issuer":"https://issuer.test"}', { headers: { 'content-length': '100' } });
    await expect(discover({ issuer: 'https://issuer.test', clientId: 'c' }, fetcher, { maxBytes: 10 })).rejects.toMatchObject({ code: 'RESPONSE_TOO_LARGE' });
  });

  it('provides explicit provider examples and one-shot state consumption', async () => {
    expect(googleProvider('g').issuer).toBe('https://accounts.google.com');
    expect(appleProvider('a').issuer).toBe('https://appleid.apple.com');
    const store = new InMemoryOidcStateStore(); const value = { state: 's', nonce: 'n', verifier: 'v', provider: 'p', redirectUri: 'https://app.test/cb', expiresAt: 100, linking: false };
    await store.put(value); expect(await store.consume('s')).toEqual(value); expect(await store.consume('s')).toBeUndefined();
  });
});
