/**
 * Generated shared contract surface for the institutional issuer and
 * verifier OpenAPI documents. Keep this file format-neutral: actor-specific
 * methods belong in the dependent SDK tasks.
 */

export type JsonObject = Readonly<Record<string, unknown>>;

export interface IdentityHealth {
  readonly ok: boolean;
  readonly version: string;
}

export interface IssuerMetadata extends JsonObject {
  readonly credential_issuer?: string;
  readonly credential_configurations_supported?: JsonObject;
}

export interface IdentityErrorBody {
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
    readonly requestId?: string;
  };
}

export type IdentityResponse = JsonObject | readonly unknown[];

export interface IssuerServicePaths {
  '/v1/health': { GET: { response: IdentityHealth } };
  '/.well-known/openid-credential-issuer': {
    GET: { response: IssuerMetadata };
  };
  '/v1/templates': { POST: { body: JsonObject; response: IdentityResponse } };
  '/v1/issuers': { POST: { body: JsonObject; response: IdentityResponse } };
  '/v1/reviewer-policies': {
    POST: { body: JsonObject; response: IdentityResponse };
  };
  '/v1/issuance-requests': {
    POST: { body: JsonObject; response: IdentityResponse };
  };
  '/v1/issuance-requests/{sessionId}': {
    GET: { response: IdentityResponse };
  };
  '/v1/issuance-requests/{sessionId}/reviews': {
    POST: { body: JsonObject; response: IdentityResponse };
  };
  '/v1/issuance-requests/{sessionId}/offers': {
    POST: { body: JsonObject; response: IdentityResponse };
  };
  '/v1/oid4vci/{tenantId}/authorize': {
    POST: { body: JsonObject; response: IdentityResponse };
  };
  '/v1/oid4vci/{tenantId}/token': {
    POST: { body: JsonObject; response: IdentityResponse };
  };
  '/v1/oid4vci/{tenantId}/credential': {
    POST: { body: JsonObject; response: IdentityResponse };
  };
  '/v1/credentials/{credentialId}': {
    GET: { response: IdentityResponse };
  };
  '/v1/credentials/{credentialId}/reissue': {
    POST: { body: JsonObject; response: IdentityResponse };
  };
  '/v1/credentials/{credentialId}/suspend': {
    POST: { response: IdentityResponse };
  };
  '/v1/credentials/{credentialId}/revoke': {
    POST: { response: IdentityResponse };
  };
}

export interface VerifierServicePaths {
  '/v1/health': { GET: { response: IdentityHealth } };
  '/v1/verification-sessions': {
    POST: { body: JsonObject; response: IdentityResponse };
  };
  '/v1/verification-sessions/{sessionId}': {
    GET: { response: IdentityResponse };
  };
  '/v1/verification-sessions/{sessionId}/responses': {
    POST: { body: JsonObject; response: IdentityResponse };
  };
  '/v1/receipts/{receiptId}': { GET: { response: IdentityResponse } };
}

export const ISSUER_OPENAPI_PATHS = [
  '/v1/health',
  '/.well-known/openid-credential-issuer',
  '/v1/templates',
  '/v1/issuers',
  '/v1/reviewer-policies',
  '/v1/issuance-requests',
  '/v1/issuance-requests/{sessionId}',
  '/v1/issuance-requests/{sessionId}/reviews',
  '/v1/issuance-requests/{sessionId}/offers',
  '/v1/oid4vci/{tenantId}/authorize',
  '/v1/oid4vci/{tenantId}/token',
  '/v1/oid4vci/{tenantId}/credential',
  '/v1/credentials/{credentialId}',
  '/v1/credentials/{credentialId}/reissue',
  '/v1/credentials/{credentialId}/suspend',
  '/v1/credentials/{credentialId}/revoke',
] as const;

export const VERIFIER_OPENAPI_PATHS = [
  '/v1/health',
  '/v1/verification-sessions',
  '/v1/verification-sessions/{sessionId}',
  '/v1/verification-sessions/{sessionId}/responses',
  '/v1/receipts/{receiptId}',
] as const;

export type IssuerPath = (typeof ISSUER_OPENAPI_PATHS)[number];
export type VerifierPath = (typeof VERIFIER_OPENAPI_PATHS)[number];
