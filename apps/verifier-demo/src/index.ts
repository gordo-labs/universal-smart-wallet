import {
  buildOpenId4VpRequest,
  verifyOpenId4VpDirectPost,
  type HttpResponse,
  type OpenId4VpRequest,
} from '@ssw/openid4vc';
import { ageOver18Policy, toDcql } from '@ssw/presentation-policy';
import {
  evaluateIssuerTrust,
  StatusCache,
  type StatusTransport,
  type TrustBundle,
} from '@ssw/credential-domain';

export const appName = 'verifier-demo';
export const runtimeBoundary = 'synthetic local verifier only';
export const VERIFIER_CLIENT_ID = 'https://verifier.example';
export const RESPONSE_URI = `${VERIFIER_CLIENT_ID}/callback`;
export const MAX_REQUEST_BYTES = 16_384;

export const syntheticTrustBundle: TrustBundle = Object.freeze({
  version: 1,
  generatedAt: Date.UTC(2026, 6, 29),
  expiresAt: Date.UTC(2027, 6, 29),
  issuers: [
    {
      issuer: 'https://issuer.example',
      keyIds: ['synthetic-local-issuer-2026-07'],
      statusListOrigins: ['https://issuer.example'],
    },
  ],
});

export function evaluateSyntheticIssuer(keyId: string) {
  return evaluateIssuerTrust(
    syntheticTrustBundle,
    'https://issuer.example',
    keyId,
  );
}

export async function evaluateSyntheticStatus(
  statusUrl: string,
  transport: StatusTransport,
) {
  return new StatusCache(transport).lookup(statusUrl);
}

export type VerifierFixture =
  | 'valid'
  | 'invalid-signature'
  | 'expired'
  | 'revoked'
  | 'wrong-audience'
  | 'wrong-nonce'
  | 'missing-disclosure'
  | 'claim-mismatch'
  | 'consent-denied'
  | 'status-unavailable';

export type VerifierRouteRequest = {
  readonly method?: string;
  readonly body?: string;
  readonly headers?: Record<string, string>;
};

export type AccessSession = {
  readonly sessionId: string;
  readonly purpose: string;
  readonly expiresAt: number;
};

export type VerificationResult =
  | { readonly ok: true; readonly session: AccessSession }
  | { readonly ok: false; readonly code: string };

const json = (value: unknown, status = 200): HttpResponse => ({
  status,
  body: JSON.stringify(value),
});

const randomToken = (): string => {
  const bytes = new Uint8Array(18);
  if (!globalThis.crypto?.getRandomValues)
    throw new Error('secure randomness unavailable');
  globalThis.crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
};

/** A deterministic, non-production VP token fixture for local tests only. */
export function createSyntheticVpToken(input: {
  readonly audience: string;
  readonly nonce: string;
  readonly fixture?: VerifierFixture;
}): string {
  return [
    'synthetic-vp',
    `aud=${input.audience}`,
    `nonce=${input.nonce}`,
    `fixture=${input.fixture ?? 'valid'}`,
  ].join('|');
}

const parseSyntheticVpToken = (
  token: string,
  expected: { audience: string; nonce: string },
): {
  disclosures: readonly string[];
  claims: Readonly<Record<string, unknown>>;
} => {
  if (!token.startsWith('synthetic-vp|')) throw new Error('invalid_signature');
  const fields = new Map(
    token
      .split('|')
      .slice(1)
      .map((part) => part.split('='))
      .filter(([key, value]) => key && value)
      .map(([key, ...value]) => [key, value.join('=')]),
  );
  const fixture = fields.get('fixture') ?? 'valid';
  if (fixture === 'invalid-signature') throw new Error('invalid_signature');
  if (fixture === 'expired') throw new Error('credential_expired');
  if (fixture === 'revoked') throw new Error('credential_revoked');
  if (fixture === 'status-unavailable') throw new Error('status_unavailable');
  if (fixture === 'wrong-audience' || fields.get('aud') !== expected.audience)
    throw new Error('audience_mismatch');
  if (fixture === 'wrong-nonce' || fields.get('nonce') !== expected.nonce)
    throw new Error('nonce_mismatch');
  if (fixture === 'consent-denied') throw new Error('consent_denied');
  if (fixture === 'claim-mismatch')
    return { disclosures: ['is_over_18'], claims: { is_over_18: false } };
  if (fixture === 'missing-disclosure')
    return { disclosures: [], claims: { is_over_18: true } };
  return {
    disclosures: ['is_over_18'],
    claims: { is_over_18: true },
  };
};

/** Local OpenID4VP verifier with bounded state, replay protection and one-shot sessions. */
export class VerifierDemo {
  readonly policy = ageOver18Policy();
  readonly ui = verifierDemoUi;
  private readonly requests = new Map<string, OpenId4VpRequest>();
  private readonly sessions = new Map<string, AccessSession>();

  createRequest(): OpenId4VpRequest {
    const request = buildOpenId4VpRequest({
      clientId: VERIFIER_CLIENT_ID,
      responseUri: RESPONSE_URI,
      nonce: randomToken(),
      state: randomToken(),
      dcqlQuery: toDcql(this.policy),
    });
    this.requests.set(request.state, request);
    return request;
  }

  async callback(body: string): Promise<VerificationResult> {
    if (body.length > MAX_REQUEST_BYTES)
      return { ok: false, code: 'response_too_large' };
    let state = '';
    try {
      state = new URLSearchParams(body).get('state') ?? '';
      const expected = this.requests.get(state);
      if (!expected) return { ok: false, code: 'replay' };
      const result = await verifyOpenId4VpDirectPost({
        body,
        expected,
        consumeState: (value) => {
          if (!this.requests.has(value)) return false;
          this.requests.delete(value);
          return true;
        },
        verifyVpToken: async (vpToken, challenge) =>
          parseSyntheticVpToken(vpToken, challenge),
        expectedDisclosures: ['is_over_18'],
      });
      if (result.claims.is_over_18 !== true)
        return { ok: false, code: 'verification_failed' };
      const session: AccessSession = {
        sessionId: randomToken(),
        purpose: this.policy.purpose,
        expiresAt: Date.now() + 60_000,
      };
      this.sessions.set(session.sessionId, session);
      return { ok: true, session };
    } catch (error) {
      const code =
        error instanceof Error ? error.message : 'verification_failed';
      return {
        ok: false,
        code: code === 'replay' ? 'replay' : 'verification_failed',
      };
    }
  }

  /** Minimal HTTP-like routes used by the demo and integration tests. */
  async route(
    path: string,
    request: VerifierRouteRequest = {},
  ): Promise<HttpResponse> {
    const method = (request.method ?? 'GET').toUpperCase();
    if (method === 'GET' && path === '/request')
      return json(this.createRequest());
    if (method === 'POST' && path === '/callback') {
      const result = await this.callback(request.body ?? '');
      return result.ok ? json(result) : json({ error: result.code }, 400);
    }
    if (method === 'GET' && path.startsWith('/session/')) {
      const id = path.slice('/session/'.length);
      const session = this.sessions.get(id);
      if (!session) return json({ error: 'session_unavailable' }, 404);
      this.sessions.delete(id);
      return json({ session });
    }
    return json({ error: 'not_found' }, 404);
  }
}

export const verifierDemoUi = Object.freeze({
  title: 'Synthetic age verification',
  purpose: 'Confirm is_over_18 without revealing a date of birth.',
  rejection: 'Presentation could not be verified.',
});

export function createVerifierDemo(): VerifierDemo {
  return new VerifierDemo();
}
