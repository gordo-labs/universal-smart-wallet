/** Bounded OpenID4VCI 1.0 pre-authorized-code client boundary. */

export const adapterName = 'openid4vc-adapter';
export const PRE_AUTHORIZED_CODE_GRANT =
  'urn:ietf:params:oauth:grant-type:pre-authorized_code' as const;
export const MAX_DOCUMENT_BYTES = 32_768;
export const MAX_TOKEN_BYTES = 8_192;
export const REQUEST_TIMEOUT_MS = 5_000;

export type HttpResponse = {
  readonly status: number;
  readonly headers?: Headers;
  readonly body: string;
};
export type HttpTransport = (
  url: string,
  init?: RequestInit,
) => Promise<HttpResponse>;

export class OpenId4VciError extends Error {
  readonly code: string;
  readonly action: 'retry' | 'inspect' | 'restart' | 'reject';
  constructor(
    code: string,
    message: string,
    action: OpenId4VciError['action'] = 'reject',
  ) {
    super(message);
    this.name = 'OpenId4VciError';
    this.code = code;
    this.action = action;
  }
}

export interface IssuerMetadata {
  readonly credential_issuer: string;
  readonly credential_endpoint: string;
  readonly token_endpoint?: string;
  readonly authorization_servers?: readonly string[];
  readonly credential_configurations_supported: Readonly<
    Record<
      string,
      {
        readonly format: 'dc+sd-jwt';
        readonly vct: string;
      }
    >
  >;
}
export interface CredentialOffer {
  readonly credential_issuer: string;
  readonly credential_configuration_ids: readonly string[];
  readonly grants: {
    readonly [PRE_AUTHORIZED_CODE_GRANT]: {
      readonly 'pre-authorized_code': string;
      readonly tx_code?: {
        readonly input_mode?: 'numeric' | 'text';
        readonly length?: number;
      };
    };
  };
}
export interface TokenResponse {
  readonly access_token: string;
  readonly token_type?: string;
  readonly expires_in?: number;
}
export interface CredentialResponse {
  readonly format?: 'dc+sd-jwt';
  readonly credential: string;
}
export interface VaultInsertion {
  put(
    metadata: {
      id: string;
      credentialType: string;
      issuer: string;
      issuedAt?: string;
      expiresAt?: string;
    },
    credential: unknown,
    options: Record<string, unknown>,
  ): Promise<void>;
}
export interface WalletIssuanceInput {
  readonly offer: CredentialOffer | string;
  readonly expectedIssuer?: string;
  readonly transport: HttpTransport;
  readonly proofJwt: string;
  readonly verifyCredential: (credential: string) => Promise<unknown>;
  readonly vault?: VaultInsertion;
  readonly vaultOptions?: Record<string, unknown>;
  readonly credentialId?: string;
}

const text = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.length === 0 || value.length > 8_192)
    throw new OpenId4VciError('invalid_metadata', `${field} is invalid`);
  return value;
};
const origin = (value: string): URL => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new OpenId4VciError('invalid_metadata', 'URL is invalid');
  }
  if (url.protocol !== 'https:')
    throw new OpenId4VciError('insecure_origin', 'HTTPS is required');
  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]' ||
    /^127\./u.test(host) ||
    /^10\./u.test(host) ||
    /^192\.168\./u.test(host) ||
    /^169\.254\./u.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./u.test(host)
  )
    throw new OpenId4VciError(
      'private_network',
      'Private-network URL rejected',
    );
  return url;
};
const sameOrigin = (a: string, b: string): boolean =>
  new URL(a).origin === new URL(b).origin;
const json = (value: string, max = MAX_DOCUMENT_BYTES): unknown => {
  if (value.length > max)
    throw new OpenId4VciError(
      'response_too_large',
      'Response exceeds size policy',
    );
  try {
    return JSON.parse(value);
  } catch {
    throw new OpenId4VciError('invalid_json', 'Malformed JSON');
  }
};

export function parseIssuerMetadata(
  value: unknown,
  expectedIssuer?: string,
): IssuerMetadata {
  if (!value || typeof value !== 'object')
    throw new OpenId4VciError(
      'invalid_metadata',
      'Issuer metadata must be an object',
    );
  const raw = value as Record<string, unknown>;
  const issuer = text(raw.credential_issuer, 'credential_issuer');
  const endpoint = text(raw.credential_endpoint, 'credential_endpoint');
  origin(issuer);
  origin(endpoint);
  if (
    !sameOrigin(issuer, endpoint) ||
    (expectedIssuer && issuer !== expectedIssuer)
  )
    throw new OpenId4VciError(
      'origin_mismatch',
      'Issuer and endpoint origin mismatch',
    );
  const configs = raw.credential_configurations_supported;
  if (!configs || typeof configs !== 'object' || Array.isArray(configs))
    throw new OpenId4VciError(
      'invalid_metadata',
      'Credential configurations missing',
    );
  const normalized: Record<string, { format: 'dc+sd-jwt'; vct: string }> = {};
  for (const [id, config] of Object.entries(
    configs as Record<string, unknown>,
  )) {
    if (!config || typeof config !== 'object')
      throw new OpenId4VciError(
        'invalid_metadata',
        'Credential configuration invalid',
      );
    const item = config as Record<string, unknown>;
    if (
      item.format !== 'dc+sd-jwt' ||
      typeof item.vct !== 'string' ||
      item.vct.length > 128
    )
      throw new OpenId4VciError(
        'unsupported_format',
        'Only dc+sd-jwt configurations are supported',
      );
    normalized[id] = { format: 'dc+sd-jwt', vct: item.vct };
  }
  const token =
    raw.token_endpoint === undefined
      ? undefined
      : text(raw.token_endpoint, 'token_endpoint');
  if (token) {
    origin(token);
    if (!sameOrigin(issuer, token))
      throw new OpenId4VciError(
        'origin_mismatch',
        'Token endpoint origin mismatch',
      );
  }
  return {
    credential_issuer: issuer,
    credential_endpoint: endpoint,
    ...(token ? { token_endpoint: token } : {}),
    credential_configurations_supported: normalized,
  };
}

export function parseCredentialOffer(value: unknown): CredentialOffer {
  if (!value || typeof value !== 'object')
    throw new OpenId4VciError(
      'invalid_offer',
      'Credential offer must be an object',
    );
  const raw = value as Record<string, unknown>;
  const issuer = text(raw.credential_issuer, 'credential_issuer');
  origin(issuer);
  const ids = raw.credential_configuration_ids;
  if (!Array.isArray(ids) || ids.length !== 1 || typeof ids[0] !== 'string')
    throw new OpenId4VciError(
      'invalid_offer',
      'Exactly one credential configuration is required',
    );
  const grants = raw.grants as Record<string, unknown> | undefined;
  const grant = grants?.[PRE_AUTHORIZED_CODE_GRANT] as
    | Record<string, unknown>
    | undefined;
  const code = grant?.['pre-authorized_code'];
  if (typeof code !== 'string' || code.length === 0 || code.length > 512)
    throw new OpenId4VciError(
      'invalid_offer',
      'Pre-authorized code is invalid',
    );
  return {
    credential_issuer: issuer,
    credential_configuration_ids: ids as [string],
    grants: {
      [PRE_AUTHORIZED_CODE_GRANT]: {
        'pre-authorized_code': code,
        ...(grant?.tx_code
          ? {
              tx_code:
                grant.tx_code as CredentialOffer['grants'][typeof PRE_AUTHORIZED_CODE_GRANT]['tx_code'],
            }
          : {}),
      },
    },
  };
}

async function request(
  transport: HttpTransport,
  url: string,
  init?: RequestInit,
): Promise<HttpResponse> {
  origin(url);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      transport(url, init),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new OpenId4VciError(
                'timeout',
                'Issuer request timed out',
                'retry',
              ),
            ),
          REQUEST_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (error) {
    if (error instanceof OpenId4VciError) throw error;
    throw new OpenId4VciError(
      'network_error',
      'Issuer is unavailable',
      'retry',
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}
async function getJson(
  transport: HttpTransport,
  url: string,
  expectedOrigin: string,
): Promise<unknown> {
  if (!sameOrigin(url, expectedOrigin))
    throw new OpenId4VciError(
      'origin_mismatch',
      'Cross-origin redirect/metadata rejected',
    );
  const response = await request(transport, url);
  if (response.status >= 300 && response.status < 400)
    throw new OpenId4VciError(
      'redirect_rejected',
      'Redirects are not followed',
    );
  if (response.status !== 200)
    throw new OpenId4VciError(
      'issuer_error',
      'Issuer metadata unavailable',
      'retry',
    );
  return json(response.body);
}

export async function issuePreAuthorizedCredential(
  input: WalletIssuanceInput,
): Promise<{ credential: string; verified: unknown; stored: boolean }> {
  if (input.proofJwt.length === 0 || input.proofJwt.length > MAX_TOKEN_BYTES)
    throw new OpenId4VciError('invalid_proof', 'Proof is missing or too large');
  const offer =
    typeof input.offer === 'string'
      ? parseCredentialOffer(json(input.offer))
      : parseCredentialOffer(input.offer);
  const issuer = origin(input.expectedIssuer ?? offer.credential_issuer).origin;
  if (offer.credential_issuer !== issuer)
    throw new OpenId4VciError('origin_mismatch', 'Offer issuer mismatch');
  const metadata = parseIssuerMetadata(
    await getJson(
      input.transport,
      `${issuer}/.well-known/openid-credential-issuer`,
      issuer,
    ),
    issuer,
  );
  const configId = offer.credential_configuration_ids[0];
  if (!metadata.credential_configurations_supported[configId])
    throw new OpenId4VciError(
      'unsupported_configuration',
      'Credential configuration is not offered',
    );
  const tokenEndpoint = metadata.token_endpoint ?? `${issuer}/oauth/token`;
  const tokenResponse = await request(input.transport, tokenEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent(PRE_AUTHORIZED_CODE_GRANT)}&pre-authorized_code=${encodeURIComponent(offer.grants[PRE_AUTHORIZED_CODE_GRANT]['pre-authorized_code'])}`,
  });
  if (tokenResponse.status !== 200) {
    let error = 'access_denied';
    try {
      const body = json(tokenResponse.body, MAX_TOKEN_BYTES) as Record<
        string,
        unknown
      >;
      if (typeof body.error === 'string') error = body.error;
    } catch {
      /* safe generic error */
    }
    throw new OpenId4VciError(
      `oauth_${error}`,
      'Issuer authorization failed',
      error === 'temporarily_unavailable' ? 'retry' : 'restart',
    );
  }
  const token = json(
    tokenResponse.body,
    MAX_TOKEN_BYTES,
  ) as Partial<TokenResponse>;
  if (
    typeof token.access_token !== 'string' ||
    token.access_token.length > MAX_TOKEN_BYTES
  )
    throw new OpenId4VciError('invalid_token_response', 'Invalid access token');
  const credentialResponse = await request(
    input.transport,
    metadata.credential_endpoint,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token.access_token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        format: 'dc+sd-jwt',
        credential_configuration_id: configId,
        proof: { proof_type: 'jwt', jwt: input.proofJwt },
      }),
    },
  );
  if (credentialResponse.status !== 200) {
    let error = 'credential_error';
    try {
      const failure = json(credentialResponse.body, MAX_TOKEN_BYTES) as Record<
        string,
        unknown
      >;
      if (typeof failure.error === 'string') error = failure.error;
    } catch {
      /* generic safe action */
    }
    throw new OpenId4VciError(
      `oauth_${error}`,
      'Credential request failed',
      error === 'invalid_or_missing_proof' ? 'restart' : 'retry',
    );
  }
  const body = json(credentialResponse.body) as Partial<CredentialResponse>;
  if (
    typeof body.credential !== 'string' ||
    body.credential.length > MAX_TOKEN_BYTES
  )
    throw new OpenId4VciError(
      'invalid_credential',
      'Credential response is invalid',
    );
  const verified = await input.verifyCredential(body.credential);
  if (!verified)
    throw new OpenId4VciError(
      'verification_failed',
      'Credential verification failed',
    );
  let stored = false;
  if (input.vault) {
    const claims = verified as Record<string, unknown>;
    await input.vault.put(
      {
        id: input.credentialId ?? `credential-${Date.now()}`,
        credentialType: String(claims.vct ?? 'AgeCredential'),
        issuer: String(claims.issuer ?? offer.credential_issuer),
      },
      verified,
      input.vaultOptions ?? {},
    );
    stored = true;
  }
  return { credential: body.credential, verified, stored };
}

export class DeterministicIssuerAdapter {
  readonly metadata: IssuerMetadata;
  readonly offer: CredentialOffer;
  private readonly accessToken = 'synthetic-access-token';
  constructor(
    metadata: IssuerMetadata,
    offer: CredentialOffer,
    private readonly credential: string,
    private readonly expectedProof = 'synthetic-proof',
  ) {
    this.metadata = metadata;
    this.offer = offer;
  }
  readonly transport: HttpTransport = async (url, init) => {
    if (url.endsWith('/.well-known/openid-credential-issuer'))
      return { status: 200, body: JSON.stringify(this.metadata) };
    if (url.endsWith('/oauth/token')) {
      const body = String(init?.body ?? '');
      if (
        !body.includes(
          encodeURIComponent(
            this.offer.grants[PRE_AUTHORIZED_CODE_GRANT]['pre-authorized_code'],
          ),
        )
      )
        return {
          status: 400,
          body: JSON.stringify({ error: 'invalid_grant' }),
        };
      return {
        status: 200,
        body: JSON.stringify({
          access_token: this.accessToken,
          token_type: 'Bearer',
        }),
      };
    }
    if (url === this.metadata.credential_endpoint) {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        proof?: { jwt?: string };
      };
      if (body.proof?.jwt !== this.expectedProof)
        return {
          status: 400,
          body: JSON.stringify({ error: 'invalid_or_missing_proof' }),
        };
      return {
        status: 200,
        body: JSON.stringify({
          format: 'dc+sd-jwt',
          credential: this.credential,
        }),
      };
    }
    return { status: 404, body: JSON.stringify({ error: 'not_found' }) };
  };
}
