import { describe, expect, it } from 'vitest';
import {
  createSyntheticVpToken,
  createVerifierDemo,
  summarizeVerifierRequest,
  verifierDemoUi,
} from '../src/index.ts';

const setup = () => {
  const verifier = createVerifierDemo();
  const request = verifier.createRequest();
  return { verifier, request };
};

describe('OpenID4VP verifier demo', () => {
  it('generates a DCQL request for is_over_18', () => {
    const { request } = setup();
    expect(request.response_type).toBe('vp_token');
    expect(request.response_mode).toBe('direct_post');
    expect(request.dcql_query).toMatchObject({
      credentials: [{ claims: [{ path: ['is_over_18'], values: [true] }] }],
    });
  });

  it('grants one single-use access session only for a valid presentation', async () => {
    const { verifier, request } = setup();
    const token = createSyntheticVpToken({
      audience: request.client_id,
      nonce: request.nonce,
    });
    const result = await verifier.callback(
      `state=${request.state}&vp_token=${token}`,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const first = await verifier.route(`/session/${result.session.sessionId}`);
    const second = await verifier.route(`/session/${result.session.sessionId}`);
    expect(first.status).toBe(200);
    expect(second.status).toBe(404);
  });

  it.each([
    'invalid-signature',
    'expired',
    'revoked',
    'wrong-audience',
    'wrong-nonce',
    'missing-disclosure',
    'claim-mismatch',
    'consent-denied',
    'status-unavailable',
  ])(
    'fails closed for %s without disclosing claim matching',
    async (fixture) => {
      const { verifier, request } = setup();
      const token = createSyntheticVpToken({
        audience: request.client_id,
        nonce: request.nonce,
        fixture,
      });
      const result = await verifier.callback(
        `state=${request.state}&vp_token=${token}`,
      );
      expect(result).toEqual({ ok: false, code: 'verification_failed' });
    },
  );

  it('rejects replay and oversized callback bodies', async () => {
    const { verifier, request } = setup();
    const token = createSyntheticVpToken({
      audience: request.client_id,
      nonce: request.nonce,
    });
    const body = `state=${request.state}&vp_token=${token}`;
    await expect(verifier.callback(body)).resolves.toMatchObject({ ok: true });
    await expect(verifier.callback(body)).resolves.toEqual({
      ok: false,
      code: 'replay',
    });
    await expect(verifier.callback('x'.repeat(16_385))).resolves.toEqual({
      ok: false,
      code: 'response_too_large',
    });
  });

  it('uses PII-free rejection copy', () => {
    expect(verifierDemoUi.rejection).not.toMatch(
      /date|birth|claim|is_over_18/i,
    );
  });

  it('exposes request trust without treating ambiguous origins as trusted', () => {
    const { request } = setup();
    expect(summarizeVerifierRequest(request)).toMatchObject({
      requester: 'https://verifier.example',
      responseOrigin: 'https://verifier.example',
      signedRequest: false,
      identity: 'same-origin',
      level: 'review',
    });
    const ambiguous = summarizeVerifierRequest({
      ...request,
      response_uri: 'https://other.example/callback',
    });
    expect(ambiguous).toMatchObject({
      identity: 'ambiguous',
      level: 'blocked',
    });
    expect(verifierDemoUi.consent).toMatchObject({
      requester: 'Requester',
      requestedData: 'Requested data',
      sharedData: 'Data received',
      purpose: 'Purpose',
      expiry: 'Session expiry',
      trust: 'Request trust',
    });
  });
});
