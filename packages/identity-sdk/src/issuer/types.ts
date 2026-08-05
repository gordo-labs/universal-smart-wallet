import type {
  IdentityResponse,
  IssuerMetadata,
  JsonObject,
} from '../generated.js';

/** Opaque identifiers are intentionally not accepted as arbitrary PII. */
export type OpaqueId = string;
export type CredentialFormat = 'sd-jwt-vc' | 'iso-mdoc' | 'w3c-vc-di';
export type InstitutionalAssurance =
  | 'institutional'
  | 'government'
  | 'pid'
  | 'eaa'
  | 'qeaa';
export type ClaimType = 'string' | 'boolean' | 'number' | 'date';

export interface ClaimDefinition {
  readonly name: OpaqueId;
  readonly type: ClaimType;
  readonly required: boolean;
  readonly selectivelyDisclosable: boolean;
}

export interface CredentialTemplate {
  readonly schemaVersion: 1;
  readonly tenantId: OpaqueId;
  readonly templateId: OpaqueId;
  readonly version: number;
  readonly type: OpaqueId;
  readonly assurance: InstitutionalAssurance;
  readonly formats: readonly CredentialFormat[];
  readonly claims: readonly ClaimDefinition[];
  readonly status: 'published';
}

export interface IssuerProfile {
  readonly schemaVersion: 1;
  readonly tenantId: OpaqueId;
  readonly issuerId: OpaqueId;
  readonly issuerUri: string;
  readonly assurance: InstitutionalAssurance;
  /** Opaque signer reference; private key material never enters the SDK. */
  readonly keyRef: OpaqueId;
  readonly authorizedTemplateIds: readonly OpaqueId[];
}

export interface ReviewerPolicy {
  readonly schemaVersion: 1;
  readonly tenantId: OpaqueId;
  readonly policyId: OpaqueId;
  readonly templateId: OpaqueId;
  readonly requiredApprovals: number;
  readonly authorizedReviewerIds: readonly OpaqueId[];
}

export interface EvidenceReference {
  readonly evidenceId: OpaqueId;
  readonly kind: OpaqueId;
  readonly digest: `sha256:${string}`;
  readonly source: string;
}

export type SubjectBindingMethod =
  | 'jwk-thumbprint'
  | 'did-pkh'
  | 'mdoc-device-key';

export interface SubjectBinding {
  readonly schemaVersion: 1;
  readonly bindingId: OpaqueId;
  readonly method: SubjectBindingMethod;
  /** Holder binding value is write-only at the protocol boundary. */
  readonly value: string;
}

export interface IssuanceRequest {
  readonly sessionId: OpaqueId;
  readonly issuerId: OpaqueId;
  readonly templateId: OpaqueId;
  readonly templateVersion: number;
  readonly format: CredentialFormat;
  readonly reviewerPolicyId: OpaqueId;
  readonly claims: Readonly<Record<string, unknown>>;
  readonly subjectBinding: SubjectBinding;
  readonly evidence: readonly EvidenceReference[];
  readonly expiresAt: number;
}

export type IssuanceKind = 'issue' | 'reissue';
export type IssuanceState =
  | 'pending_review'
  | 'approved'
  | 'offered'
  | 'issued'
  | 'rejected'
  | 'expired'
  | 'signing_ambiguous';

export interface ReviewDecision {
  readonly reviewerId?: OpaqueId;
  readonly decision: 'approved' | 'rejected';
  readonly reviewedAt?: number;
}

export interface IssuanceSession {
  readonly schemaVersion: 1;
  readonly tenantId: OpaqueId;
  readonly sessionId: OpaqueId;
  readonly kind: IssuanceKind;
  readonly issuerId: OpaqueId;
  readonly templateId: OpaqueId;
  readonly templateVersion: number;
  readonly format: CredentialFormat;
  readonly reviewerPolicyId: OpaqueId;
  readonly state: IssuanceState;
  readonly evidence: readonly EvidenceReference[];
  readonly reviews: readonly ReviewDecision[];
  readonly expiresAt: number;
  readonly replacesCredentialId?: OpaqueId;
}

export type ReviewInput = Readonly<{ decision: 'approved' | 'rejected' }>;
export type OfferFlow = 'pre-authorized_code' | 'authorization_code';
export interface OfferRequest {
  readonly flow: OfferFlow;
  readonly ttlMs?: number;
  readonly clientId?: OpaqueId;
  readonly redirectUri?: string;
}

export interface IssuerCredentialOffer {
  readonly credential_issuer: string;
  readonly credential_configuration_ids: readonly string[];
  readonly grants: JsonObject;
  readonly expires_in: number;
}

export interface AuthorizationRequest {
  readonly issuer_state: string;
  readonly client_id: OpaqueId;
  readonly redirect_uri: string;
  readonly state: string;
}

export interface AuthorizationResponse {
  readonly redirect_uri: string;
  /** Single-use authorization code; never include in telemetry. */
  readonly code: string;
  readonly state: string;
}

export type TokenGrantType =
  | 'authorization_code'
  | 'urn:ietf:params:oauth:grant-type:pre-authorized_code';
export interface TokenRequest {
  readonly grant_type: TokenGrantType;
  readonly 'pre-authorized_code'?: string;
  readonly code?: string;
  readonly client_id?: OpaqueId;
  readonly redirect_uri?: string;
}

export interface TokenResponse {
  /** Write-only in OpenAPI; callers must not log or persist it in SDK telemetry. */
  readonly access_token: string;
  readonly token_type: 'Bearer';
  readonly expires_in: number;
}

export interface CredentialProof {
  readonly proof_type: 'jwt';
  readonly jwt: string;
}
export interface CredentialRequest {
  readonly credential_configuration_id: string;
  readonly proof: CredentialProof;
}

export interface IssuerCredentialResponse {
  readonly format: string;
  /** Write-only credential artifact; never include in telemetry. */
  readonly credential: string;
  readonly credential_id: OpaqueId;
  readonly status_id: OpaqueId;
}

export interface CredentialRecord extends JsonObject {
  readonly schemaVersion: 1;
  readonly tenantId: OpaqueId;
  readonly credentialId: OpaqueId;
  readonly statusId: OpaqueId;
  readonly issuerId: OpaqueId;
  readonly templateId: OpaqueId;
  readonly templateVersion: number;
  readonly format: CredentialFormat;
  readonly issuedAt: number;
  readonly status: 'valid' | 'suspended' | 'revoked';
  readonly replacesCredentialId?: OpaqueId;
}

export type IssuerIdentityResponse =
  | CredentialTemplate
  | IssuerProfile
  | ReviewerPolicy
  | IssuanceSession
  | IssuerCredentialOffer
  | TokenResponse
  | AuthorizationResponse
  | IssuerCredentialResponse
  | CredentialRecord
  | IdentityResponse;

export type IssuerRequestOptions = Readonly<{
  signal?: AbortSignal;
  timeoutMs?: number;
  idempotencyKey?: string;
  retry?: { readonly retries?: number; readonly baseDelayMs?: number };
}>;

export type IssuerEndpointPath =
  | '/v1/health'
  | '/.well-known/openid-credential-issuer'
  | '/v1/templates'
  | '/v1/issuers'
  | '/v1/reviewer-policies'
  | '/v1/issuance-requests'
  | '/v1/issuance-requests/{sessionId}'
  | '/v1/issuance-requests/{sessionId}/reviews'
  | '/v1/issuance-requests/{sessionId}/offers'
  | '/v1/oid4vci/{tenantId}/authorize'
  | '/v1/oid4vci/{tenantId}/token'
  | '/v1/oid4vci/{tenantId}/credential'
  | '/v1/credentials/{credentialId}'
  | '/v1/credentials/{credentialId}/reissue'
  | '/v1/credentials/{credentialId}/suspend'
  | '/v1/credentials/{credentialId}/revoke';

export type IssuerOpenApiContract = {
  '/v1/health': { GET: { response: { ok: boolean; version: string } } };
  '/.well-known/openid-credential-issuer': {
    GET: { response: IssuerMetadata };
  };
  '/v1/templates': {
    POST: { body: CredentialTemplate; response: CredentialTemplate };
  };
  '/v1/issuers': { POST: { body: IssuerProfile; response: IssuerProfile } };
  '/v1/reviewer-policies': {
    POST: { body: ReviewerPolicy; response: ReviewerPolicy };
  };
  '/v1/issuance-requests': {
    POST: { body: IssuanceRequest; response: IssuanceSession };
  };
  '/v1/issuance-requests/{sessionId}': {
    GET: { response: IssuanceSession };
  };
  '/v1/issuance-requests/{sessionId}/reviews': {
    POST: { body: ReviewInput; response: IssuanceSession };
  };
  '/v1/issuance-requests/{sessionId}/offers': {
    POST: { body: OfferRequest; response: IssuerCredentialOffer };
  };
  '/v1/oid4vci/{tenantId}/authorize': {
    POST: { body: AuthorizationRequest; response: IdentityResponse };
  };
  '/v1/oid4vci/{tenantId}/token': {
    POST: { body: TokenRequest; response: TokenResponse };
  };
  '/v1/oid4vci/{tenantId}/credential': {
    POST: { body: CredentialRequest; response: IdentityResponse };
  };
  '/v1/credentials/{credentialId}': {
    GET: { response: CredentialRecord };
  };
  '/v1/credentials/{credentialId}/reissue': {
    POST: { body: IssuanceRequest; response: IssuanceSession };
  };
  '/v1/credentials/{credentialId}/suspend': {
    POST: { response: CredentialRecord };
  };
  '/v1/credentials/{credentialId}/revoke': {
    POST: { response: CredentialRecord };
  };
};
