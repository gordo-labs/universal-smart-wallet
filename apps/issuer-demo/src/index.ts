import {
  PRE_AUTHORIZED_CODE_GRANT,
  type HttpResponse,
  type HttpTransport,
} from '@ssw/openid4vc';

export const appName = 'issuer-demo';
export const runtimeBoundary = 'synthetic local issuer only';
export const SYNTHETIC_ISSUER = 'https://issuer.example';
export const SYNTHETIC_VCT = 'AgeCredential';
export const MAX_REQUEST_BYTES = 16_384;
export const MAX_REQUESTS_PER_CODE = 1;

export type IssuerFixture =
  | 'valid'
  | 'expired'
  | 'reused'
  | 'invalid-code'
  | 'revoked';
export type IssuerRouteRequest = {
  readonly method?: string;
  readonly body?: string;
  readonly headers?: Record<string, string>;
};

/** Fixed, non-production key material. It is deliberately not a private key. */
export const syntheticPublicKey = Object.freeze({
  kty: 'EC',
  crv: 'P-256',
  x: 'synthetic-issuer-x',
  y: 'synthetic-issuer-y',
  kid: 'synthetic-local-issuer-2026-07',
  alg: 'ES256',
  use: 'sig',
});

const metadata = {
  credential_issuer: SYNTHETIC_ISSUER,
  credential_endpoint: `${SYNTHETIC_ISSUER}/credential`,
  token_endpoint: `${SYNTHETIC_ISSUER}/oauth/token`,
  credential_configurations_supported: {
    age: { format: 'dc+sd-jwt' as const, vct: SYNTHETIC_VCT },
  },
};

const json = (value: unknown): HttpResponse => ({
  status: 200,
  body: JSON.stringify(value),
});
const error = (status: number, code: string): HttpResponse => ({
  status,
  body: JSON.stringify({ error: code }),
});

/** Deterministic local issuer routes for wallet and contract tests. */
export class SyntheticIssuer {
  readonly metadata = metadata;
  readonly offer: Record<string, unknown>;
  readonly transport: HttpTransport;
  private readonly code: string;
  private issued = false;
  private readonly fixture: IssuerFixture;

  constructor(fixture: IssuerFixture = 'valid') {
    this.fixture = fixture;
    this.code = `synthetic-${fixture}-pre-authorized-code`;
    this.offer = {
      credential_issuer: SYNTHETIC_ISSUER,
      credential_configuration_ids: ['age'],
      grants: {
        [PRE_AUTHORIZED_CODE_GRANT]: { 'pre-authorized_code': this.code },
      },
    };
    this.transport = async (url, init) =>
      this.route(new URL(url).pathname, {
        method: init?.method,
        body: typeof init?.body === 'string' ? init.body : undefined,
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
      });
  }

  route(path: string, request: IssuerRouteRequest = {}): HttpResponse {
    if ((request.body?.length ?? 0) > MAX_REQUEST_BYTES)
      return error(413, 'request_too_large');
    const method = (request.method ?? 'GET').toUpperCase();
    if (method === 'GET' && path === '/.well-known/openid-credential-issuer')
      return json(this.metadata);
    if (method === 'GET' && (path === '/credential-offer' || path === '/offer'))
      return json(this.offer);
    if (
      method === 'GET' &&
      (path === '/.well-known/jwks.json' || path === '/public-key')
    )
      return json({ keys: [syntheticPublicKey] });
    if (method === 'GET' && path === '/status/revoked')
      return json({ status: 'revoked', fixture: 'synthetic' });
    if (method === 'POST' && path === '/oauth/token')
      return this.token(request.body ?? '');
    if (method === 'POST' && path === '/credential')
      return this.credential(request);
    return error(404, 'not_found');
  }

  private token(body: string): HttpResponse {
    if (this.fixture === 'invalid-code') return error(400, 'invalid_grant');
    if (!body.includes(encodeURIComponent(this.code)))
      return error(400, 'invalid_grant');
    if (this.fixture === 'reused' || this.issued)
      return error(400, 'invalid_grant');
    return json({
      access_token: `synthetic-access-token-${this.fixture}`,
      token_type: 'Bearer',
      expires_in: 60,
    });
  }

  private credential(request: IssuerRouteRequest): HttpResponse {
    const auth = request.headers?.authorization ?? '';
    if (!auth.startsWith('Bearer synthetic-access-token-'))
      return error(401, 'invalid_token');
    if (this.issued || this.fixture === 'reused')
      return error(400, 'invalid_grant');
    let proof: string | undefined;
    try {
      proof = (JSON.parse(request.body ?? '{}') as { proof?: { jwt?: string } })
        .proof?.jwt;
    } catch {
      return error(400, 'invalid_request');
    }
    if (proof !== 'synthetic-proof')
      return error(400, 'invalid_or_missing_proof');
    this.issued = true;
    if (this.fixture === 'expired')
      return json({
        format: 'dc+sd-jwt',
        credential: 'synthetic-expired-age-credential',
      });
    if (this.fixture === 'revoked')
      return json({
        format: 'dc+sd-jwt',
        credential: 'synthetic-revoked-age-credential',
      });
    return json({
      format: 'dc+sd-jwt',
      credential: 'synthetic-signed-age-credential-is_over_18-true',
    });
  }
}

export function createSyntheticIssuer(
  fixture: IssuerFixture = 'valid',
): SyntheticIssuer {
  return new SyntheticIssuer(fixture);
}

/** Minimal UI model: all copy is synthetic and explicitly excludes identity proofing. */
export const issuerDemoUi = Object.freeze({
  title: 'Synthetic AgeCredential issuer demo',
  warning:
    'Local fixture only — no real identity, date of birth, or personal data is requested.',
  claim: 'is_over_18: true',
});
