import { IdentityClient } from '../core.js';
import type {
  IdentityClientOptions,
  RequestOptions,
  ServerIdentityClientOptions,
} from '../core.js';
import type {
  AuthorizationRequest,
  AuthorizationResponse,
  IssuerCredentialOffer,
  CredentialRecord,
  CredentialRequest,
  CredentialTemplate,
  IssuanceRequest,
  IssuanceSession,
  IssuerIdentityResponse,
  IssuerCredentialResponse,
  IssuerRequestOptions,
  IssuerOpenApiContract,
  IssuerProfile,
  OfferRequest,
  ReviewerPolicy,
  ReviewInput,
  TokenRequest,
  TokenResponse,
} from './types.js';

export type { IdentityClientOptions, ServerIdentityClientOptions };
export type { IssuerOpenApiContract };

const encoded = (value: string, name: string): string => {
  if (!value || value.length > 128) throw new TypeError(`${name} is invalid`);
  return encodeURIComponent(value);
};

const requestOptions = (
  options: IssuerRequestOptions = {},
): RequestOptions => ({
  signal: options.signal,
  timeoutMs: options.timeoutMs,
  idempotencyKey: options.idempotencyKey,
  retry: options.retry,
});

/**
 * Typed issuer API over the OpenAPI contract.
 *
 * This client only handles protocol requests. Issuer private keys remain behind
 * the server's IssuerSignerPort and are never accepted by this package.
 */
export class InstitutionalIssuerClient extends IdentityClient {
  private tenantOptions(
    tenantId: string,
    options: IssuerRequestOptions = {},
  ): RequestOptions {
    return {
      ...requestOptions(options),
      headers: { 'x-tenant-id': tenantId },
    };
  }

  private postTenant<T>(
    path: string,
    tenantId: string,
    body: unknown,
    options: IssuerRequestOptions = {},
  ): Promise<T> {
    return this.post<T>(path, body, this.tenantOptions(tenantId, options));
  }

  private getTenant<T>(
    path: string,
    tenantId: string,
    options: IssuerRequestOptions = {},
  ): Promise<T> {
    return this.get<T>(path, this.tenantOptions(tenantId, options));
  }

  registerTemplate(
    tenantId: string,
    input: CredentialTemplate,
    options?: IssuerRequestOptions,
  ): Promise<CredentialTemplate> {
    return this.postTenant('/v1/templates', tenantId, input, options);
  }

  registerIssuer(
    tenantId: string,
    input: IssuerProfile,
    options?: IssuerRequestOptions,
  ): Promise<IssuerProfile> {
    return this.postTenant('/v1/issuers', tenantId, input, options);
  }

  registerReviewerPolicy(
    tenantId: string,
    input: ReviewerPolicy,
    options?: IssuerRequestOptions,
  ): Promise<ReviewerPolicy> {
    return this.postTenant('/v1/reviewer-policies', tenantId, input, options);
  }

  createIssuanceRequest(
    tenantId: string,
    input: IssuanceRequest,
    options?: IssuerRequestOptions,
  ): Promise<IssuanceSession> {
    return this.postTenant('/v1/issuance-requests', tenantId, input, options);
  }

  getIssuanceSession(
    tenantId: string,
    sessionId: string,
    options?: IssuerRequestOptions,
  ): Promise<IssuanceSession> {
    return this.getTenant(
      `/v1/issuance-requests/${encoded(sessionId, 'sessionId')}`,
      tenantId,
      options,
    );
  }

  reviewIssuance(
    tenantId: string,
    sessionId: string,
    input: ReviewInput,
    options?: IssuerRequestOptions,
  ): Promise<IssuanceSession> {
    return this.postTenant(
      `/v1/issuance-requests/${encoded(sessionId, 'sessionId')}/reviews`,
      tenantId,
      input,
      options,
    );
  }

  createOffer(
    tenantId: string,
    sessionId: string,
    input: OfferRequest,
    options?: IssuerRequestOptions,
  ): Promise<IssuerCredentialOffer> {
    return this.postTenant(
      `/v1/issuance-requests/${encoded(sessionId, 'sessionId')}/offers`,
      tenantId,
      input,
      options,
    );
  }

  authorize(
    tenantId: string,
    input: AuthorizationRequest,
    options?: IssuerRequestOptions,
  ): Promise<AuthorizationResponse> {
    // Authorization codes are single-use. A transport failure is ambiguous;
    // callers must query their own flow state instead of retrying this call.
    return this.post<AuthorizationResponse>(
      `/v1/oid4vci/${encoded(tenantId, 'tenantId')}/authorize`,
      input,
      { ...requestOptions(options), retry: { retries: 0 } },
    );
  }

  exchangeToken(
    tenantId: string,
    input: TokenRequest,
    options?: IssuerRequestOptions,
  ): Promise<TokenResponse> {
    // Grants are consumed by the service and therefore are never retried.
    return this.post<TokenResponse>(
      `/v1/oid4vci/${encoded(tenantId, 'tenantId')}/token`,
      input,
      { ...requestOptions(options), retry: { retries: 0 } },
    );
  }

  issueCredential(
    tenantId: string,
    accessToken: string,
    input: CredentialRequest,
    options?: IssuerRequestOptions,
  ): Promise<IssuerCredentialResponse> {
    if (!accessToken || accessToken.length > 512)
      throw new TypeError('accessToken is invalid');
    // The service consumes the bearer token before signing. Never retry an
    // ambiguous response, even if the caller supplied an idempotency key.
    return this.post<IssuerCredentialResponse>(
      `/v1/oid4vci/${encoded(tenantId, 'tenantId')}/credential`,
      input,
      {
        ...requestOptions(options),
        authorization: `Bearer ${accessToken}`,
        retry: { retries: 0 },
      },
    );
  }

  getCredential(
    tenantId: string,
    credentialId: string,
    options?: IssuerRequestOptions,
  ): Promise<CredentialRecord> {
    return this.getTenant(
      `/v1/credentials/${encoded(credentialId, 'credentialId')}`,
      tenantId,
      options,
    );
  }

  reissueCredential(
    tenantId: string,
    credentialId: string,
    input: IssuanceRequest,
    options?: IssuerRequestOptions,
  ): Promise<IssuanceSession> {
    return this.postTenant(
      `/v1/credentials/${encoded(credentialId, 'credentialId')}/reissue`,
      tenantId,
      input,
      options,
    );
  }

  suspendCredential(
    tenantId: string,
    credentialId: string,
    options?: IssuerRequestOptions,
  ): Promise<CredentialRecord> {
    return this.postTenant(
      `/v1/credentials/${encoded(credentialId, 'credentialId')}/suspend`,
      tenantId,
      undefined,
      options,
    );
  }

  revokeCredential(
    tenantId: string,
    credentialId: string,
    options?: IssuerRequestOptions,
  ): Promise<CredentialRecord> {
    return this.postTenant(
      `/v1/credentials/${encoded(credentialId, 'credentialId')}/revoke`,
      tenantId,
      undefined,
      options,
    );
  }
}

export const createBrowserIssuerClient = (
  options: IdentityClientOptions,
): InstitutionalIssuerClient => new InstitutionalIssuerClient(options);

export const createServerIssuerClient = (
  options: ServerIdentityClientOptions,
): InstitutionalIssuerClient =>
  new InstitutionalIssuerClient({
    ...options,
    headers: {
      ...options.headers,
      authorization: `ApiKey ${options.apiKey}`,
    },
  });
