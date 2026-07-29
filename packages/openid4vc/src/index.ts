/** Bounded OpenID4VCI 1.0 pre-authorized-code client boundary. */

export const adapterName = 'openid4vc-adapter';
export const PRE_AUTHORIZED_CODE_GRANT =
  'urn:ietf:params:oauth:grant-type:pre-authorized_code' as const;
export const MAX_DOCUMENT_BYTES = 32_768;
export const MAX_TOKEN_BYTES = 8_192;
export const REQUEST_TIMEOUT_MS = 5_000;

/** OpenID4VP 1.0 same-device/direct_post protocol boundary. */
export const VP_TOKEN_RESPONSE_TYPE = 'vp_token' as const;
export const DIRECT_POST_RESPONSE_MODE = 'direct_post' as const;
export const MAX_PRESENTATION_BYTES = 32_768;
export const MAX_REQUEST_URI_BYTES = 2_048;

export class OpenId4VpError extends Error {
  readonly code: string;
  readonly action: 'reject' | 'inspect' | 'retry';
  constructor(
    code: string,
    message: string,
    action: OpenId4VpError['action'] = 'reject',
  ) {
    super(message);
    this.name = 'OpenId4VpError';
    this.code = code;
    this.action = action;
  }
}

export interface OpenId4VpRequest {
  readonly response_type: typeof VP_TOKEN_RESPONSE_TYPE;
  readonly response_mode: typeof DIRECT_POST_RESPONSE_MODE;
  readonly client_id: string;
  readonly response_uri: string;
  readonly nonce: string;
  readonly state: string;
  readonly dcql_query: unknown;
  readonly transaction_data?: readonly string[];
  readonly request_uri?: string;
}

export interface RequestTrustHooks {
  /** Validate a signed request JWT and return its trusted claims. */
  readonly verifySignedRequest?: (
    jwt: string,
  ) => Promise<Record<string, unknown>>;
  /** Validate a request URI and retrieve its signed request object. */
  readonly fetchRequestUri?: (uri: string) => Promise<string>;
  /** Resolve/confirm verifier identity before consent. */
  readonly resolveVerifier?: (clientId: string) => Promise<boolean>;
  readonly validateTransactionData?: (value: string) => Promise<boolean>;
}

const uniqueParam = (
  params: URLSearchParams,
  name: string,
): string | undefined => {
  const values = params.getAll(name);
  if (values.length > 1)
    throw new OpenId4VpError('duplicate_parameter', `${name} is duplicated`);
  return values[0];
};
const requiredParam = (params: URLSearchParams, name: string): string => {
  const value = uniqueParam(params, name);
  if (!value || value.length > 8_192)
    throw new OpenId4VpError('invalid_request', `${name} is required`);
  return value;
};
const httpsOrigin = (value: string): URL => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new OpenId4VpError('invalid_request', 'URL is invalid');
  }
  if (url.protocol !== 'https:')
    throw new OpenId4VpError('insecure_origin', 'HTTPS is required');
  return url;
};

/** Parse an authorization request or request_uri with strict duplicate/fail-closed handling. */
export async function parseOpenId4VpRequest(
  input: string | URL | Record<string, unknown>,
  hooks: RequestTrustHooks = {},
): Promise<OpenId4VpRequest> {
  let claims: Record<string, unknown>;
  if (typeof input === 'string' || input instanceof URL) {
    const url = new URL(String(input));
    const requestUri = uniqueParam(url.searchParams, 'request_uri');
    const requestJwt = uniqueParam(url.searchParams, 'request');
    if (requestUri) {
      if (requestUri.length > MAX_REQUEST_URI_BYTES)
        throw new OpenId4VpError(
          'request_uri_too_large',
          'request_uri is too large',
        );
      const uri = httpsOrigin(requestUri).toString();
      if (!hooks.fetchRequestUri || !hooks.verifySignedRequest)
        throw new OpenId4VpError(
          'untrusted_request',
          'Signed request trust hook is required',
        );
      const jwt = await hooks.fetchRequestUri(uri);
      claims = await hooks.verifySignedRequest(jwt);
      claims.request_uri = uri;
    } else if (requestJwt) {
      if (!hooks.verifySignedRequest)
        throw new OpenId4VpError(
          'untrusted_request',
          'Signed request trust hook is required',
        );
      claims = await hooks.verifySignedRequest(requestJwt);
    } else {
      for (const name of [
        'response_type',
        'response_mode',
        'client_id',
        'response_uri',
        'nonce',
        'state',
        'dcql_query',
        'transaction_data',
      ])
        uniqueParam(url.searchParams, name);
      claims = Object.fromEntries(url.searchParams.entries());
      const dcql = uniqueParam(url.searchParams, 'dcql_query');
      if (dcql) {
        try {
          claims.dcql_query = JSON.parse(dcql);
        } catch {
          throw new OpenId4VpError('invalid_dcql', 'dcql_query is invalid');
        }
      }
      const transaction = uniqueParam(url.searchParams, 'transaction_data');
      if (transaction) claims.transaction_data = [transaction];
    }
  } else claims = input;
  const responseType = claims.response_type;
  const responseMode = claims.response_mode;
  if (
    responseType !== VP_TOKEN_RESPONSE_TYPE ||
    responseMode !== DIRECT_POST_RESPONSE_MODE
  )
    throw new OpenId4VpError(
      'unsupported_request',
      'Only vp_token/direct_post is supported',
    );
  const clientId = typeof claims.client_id === 'string' ? claims.client_id : '';
  const responseUri =
    typeof claims.response_uri === 'string' ? claims.response_uri : '';
  const nonce = typeof claims.nonce === 'string' ? claims.nonce : '';
  const state = typeof claims.state === 'string' ? claims.state : '';
  if (!clientId || !nonce || !state || !claims.dcql_query)
    throw new OpenId4VpError(
      'invalid_request',
      'Required request fields are missing',
    );
  httpsOrigin(responseUri);
  if (hooks.resolveVerifier && !(await hooks.resolveVerifier(clientId)))
    throw new OpenId4VpError(
      'ambiguous_verifier',
      'Verifier identity could not be confirmed',
    );
  const transactionData = claims.transaction_data;
  if (
    transactionData !== undefined &&
    (!Array.isArray(transactionData) ||
      transactionData.some(
        (item) => typeof item !== 'string' || item.length > 4_096,
      ))
  )
    throw new OpenId4VpError(
      'invalid_transaction_data',
      'transaction_data is invalid',
    );
  if (transactionData && hooks.validateTransactionData) {
    for (const item of transactionData)
      if (!(await hooks.validateTransactionData(item)))
        throw new OpenId4VpError(
          'invalid_transaction_data',
          'transaction_data is not recognized',
        );
  } else if (transactionData && !hooks.validateTransactionData) {
    throw new OpenId4VpError(
      'invalid_transaction_data',
      'transaction_data trust hook is required',
    );
  }
  return {
    response_type: VP_TOKEN_RESPONSE_TYPE,
    response_mode: DIRECT_POST_RESPONSE_MODE,
    client_id: clientId,
    response_uri: responseUri,
    nonce,
    state,
    dcql_query: claims.dcql_query,
    ...(transactionData
      ? { transaction_data: transactionData as string[] }
      : {}),
    ...(typeof claims.request_uri === 'string'
      ? { request_uri: claims.request_uri }
      : {}),
  };
}

export interface VerifierRequestInput {
  readonly clientId: string;
  readonly responseUri: string;
  readonly nonce: string;
  readonly state: string;
  readonly dcqlQuery: unknown;
  readonly transactionData?: readonly string[];
}
export function buildOpenId4VpRequest(
  input: VerifierRequestInput,
): OpenId4VpRequest {
  if (!input.clientId || !input.nonce || !input.state)
    throw new OpenId4VpError(
      'invalid_request',
      'client_id, nonce and state are required',
    );
  httpsOrigin(input.responseUri);
  if (input.transactionData?.some((v) => !v || v.length > 4_096))
    throw new OpenId4VpError(
      'invalid_transaction_data',
      'transaction_data is invalid',
    );
  return {
    response_type: VP_TOKEN_RESPONSE_TYPE,
    response_mode: DIRECT_POST_RESPONSE_MODE,
    client_id: input.clientId,
    response_uri: input.responseUri,
    nonce: input.nonce,
    state: input.state,
    dcql_query: input.dcqlQuery,
    ...(input.transactionData
      ? { transaction_data: [...input.transactionData] }
      : {}),
  };
}

export interface DirectPostVerifyInput {
  readonly body: string | URLSearchParams | Record<string, unknown>;
  readonly expected: Pick<
    OpenId4VpRequest,
    'state' | 'nonce' | 'client_id' | 'response_uri'
  >;
  readonly consumeState: (state: string) => boolean;
  readonly verifyVpToken: (
    vpToken: string,
    expected: { audience: string; nonce: string },
  ) => Promise<{
    readonly disclosures: readonly string[];
    readonly claims: Readonly<Record<string, unknown>>;
  }>;
  readonly expectedDisclosures?: readonly string[];
}
export async function verifyOpenId4VpDirectPost(
  input: DirectPostVerifyInput,
): Promise<{
  readonly claims: Readonly<Record<string, unknown>>;
  readonly vpToken: string;
}> {
  const params =
    typeof input.body === 'string'
      ? new URLSearchParams(input.body)
      : input.body instanceof URLSearchParams
        ? input.body
        : new URLSearchParams(
            Object.entries(input.body).map(([k, v]) => [k, String(v)]),
          );
  const state = requiredParam(params, 'state');
  const vpToken = requiredParam(params, 'vp_token');
  if (
    params.getAll('state').length !== 1 ||
    params.getAll('vp_token').length !== 1
  )
    throw new OpenId4VpError(
      'duplicate_parameter',
      'Response parameters are duplicated',
    );
  if (state !== input.expected.state)
    throw new OpenId4VpError('state_mismatch', 'state mismatch');
  if (vpToken.length > MAX_PRESENTATION_BYTES)
    throw new OpenId4VpError('response_too_large', 'vp_token is too large');
  if (!input.consumeState(state))
    throw new OpenId4VpError('replay', 'state was already consumed');
  const result = await input.verifyVpToken(vpToken, {
    audience: input.expected.client_id,
    nonce: input.expected.nonce,
  });
  if (input.expectedDisclosures) {
    const actual = [...result.disclosures].sort();
    const expected = [...input.expectedDisclosures].sort();
    if (
      actual.length !== expected.length ||
      actual.some((value, index) => value !== expected[index])
    )
      throw new OpenId4VpError(
        'disclosure_mismatch',
        'Disclosure set is not exactly the approved set',
      );
  }
  return { claims: result.claims, vpToken };
}

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
