import {
  InMemoryVaultStore,
  type CredentialVaultStore,
  type VaultIndexMetadata,
} from '@ssw/credential-vault';
import {
  issuePreAuthorizedCredential,
  parseCredentialOffer,
  parseOpenId4VpRequest,
  OpenId4VpError,
  type CredentialOffer,
  type HttpTransport,
  type OpenId4VpRequest,
} from '@ssw/openid4vc';
import {
  fromDcql,
  selectPresentationCandidates,
  type PresentationCandidate,
  type PresentationPolicy,
} from '@ssw/presentation-policy';

export const appName = 'wallet-web';
export const runtimeBoundary = 'browser adapters only';

export type PasskeyCapability = {
  available: boolean;
  reason: 'available' | 'secure-context-required' | 'webauthn-unsupported';
};

/** Capability smoke check used by the local wallet UI; no credential is created here. */
export function detectPasskeyCapability(
  scope: {
    isSecureContext?: boolean;
    credentials?: { create?: unknown; get?: unknown };
  } = globalThis as typeof globalThis & { credentials?: CredentialsContainer },
): PasskeyCapability {
  if (scope.isSecureContext === false)
    return { available: false, reason: 'secure-context-required' };
  if (
    !scope.credentials ||
    typeof scope.credentials.create !== 'function' ||
    typeof scope.credentials.get !== 'function'
  )
    return { available: false, reason: 'webauthn-unsupported' };
  return { available: true, reason: 'available' };
}

export type WalletScreen =
  | 'locked'
  | 'credentials'
  | 'offer-review'
  | 'presentation-review';
export type WalletErrorCode =
  | 'locked'
  | 'rejected-offer'
  | 'cancelled-presentation'
  | 'corrupt-vault'
  | 'unsupported-prf'
  | 'unsafe-request'
  | 'ambiguous-verifier';

export class WalletUiError extends Error {
  constructor(
    readonly code: WalletErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'WalletUiError';
  }
}

export type OfferReview = Readonly<{
  issuer: string;
  credentialType: string;
  purpose: string;
  claims: readonly string[];
  expiry?: string;
  readonly exactDisclosures: readonly string[];
  offer: CredentialOffer;
}>;

export type RequestTrust = Readonly<{
  /** Whether the request was carried by a signed request object/request URI. */
  signedRequest: boolean;
  requestUri?: string;
  /** A same-origin HTTPS check is a useful local signal, never remote HTML. */
  verifierOrigin: string;
  identity: 'confirmed' | 'same-origin' | 'ambiguous';
  level: 'trusted' | 'review' | 'blocked';
  warning?: string;
}>;

export type ConsentRiskState = Readonly<{
  requester: string;
  requesterOrigin: string;
  requestedData: readonly string[];
  sharedData: readonly string[];
  purpose: string;
  expiry?: string;
  trust: RequestTrust;
  /** Approval is disabled for ambiguous or unsafe requests. */
  canApprove: boolean;
}>;

export type PresentationReview = Readonly<{
  verifier: string;
  purpose: string;
  requestedClaims: readonly string[];
  matchingCredentials: readonly VaultIndexMetadata[];
  request: OpenId4VpRequest;
  policy: PresentationPolicy;
  consent: ConsentRiskState;
}>;

const safeRemoteText = (value: string, max = 256): string =>
  value
    .replace(/[\u0000-\u001f\u007f]/gu, '')
    .replace(/<[^>]*>/gu, '')
    .trim()
    .slice(0, max);

/** Remote metadata is text-only: callers must not inject it as HTML. */
export const sanitizeRemoteText = safeRemoteText;

const originOf = (value: string): string => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.origin : '';
  } catch {
    return '';
  }
};

const trustForRequest = (
  request: OpenId4VpRequest,
  hooks: Parameters<typeof parseOpenId4VpRequest>[1],
): RequestTrust => {
  const verifierOrigin = originOf(request.client_id);
  const responseOrigin = originOf(request.response_uri);
  const sameOrigin = !!verifierOrigin && verifierOrigin === responseOrigin;
  const signedRequest = Boolean(request.request_uri);
  const identity = hooks?.resolveVerifier
    ? 'confirmed'
    : sameOrigin
      ? 'same-origin'
      : 'ambiguous';
  const level =
    identity === 'ambiguous'
      ? 'blocked'
      : signedRequest && identity === 'confirmed'
        ? 'trusted'
        : 'review';
  return {
    signedRequest,
    ...(request.request_uri ? { requestUri: request.request_uri } : {}),
    verifierOrigin,
    identity,
    level,
    ...(level === 'blocked'
      ? {
          warning:
            'Verifier identity and response origin could not be confirmed.',
        }
      : level === 'review'
        ? {
            warning:
              'Unsigned request; verify the verifier origin before approving.',
          }
        : {}),
  };
};

const secretBytes = (secret: string): Uint8Array => {
  if (!secret || secret.length < 8 || secret.length > 512)
    throw new WalletUiError('locked', 'Unlock factor is required');
  return new TextEncoder().encode(secret);
};

/** Local wallet state machine. Plaintext credentials exist only in unlocked method scopes. */
export class WalletController {
  private secret?: Uint8Array;
  private screen: WalletScreen = 'locked';
  private pendingOffer?: OfferReview;
  private pendingPresentation?: PresentationReview;

  constructor(
    readonly vault: CredentialVaultStore = new InMemoryVaultStore(),
  ) {}

  get state(): Readonly<{ screen: WalletScreen; unlocked: boolean }> {
    return { screen: this.screen, unlocked: this.secret !== undefined };
  }

  setup(factor: string): void {
    this.secret = secretBytes(factor);
    this.screen = 'credentials';
  }

  unlock(factor: string): void {
    this.secret = secretBytes(factor);
    this.screen = 'credentials';
  }

  lock(): void {
    this.secret?.fill(0);
    this.secret = undefined;
    this.pendingOffer = undefined;
    this.pendingPresentation = undefined;
    this.screen = 'locked';
  }

  async listCredentials(): Promise<readonly VaultIndexMetadata[]> {
    return this.vault.list();
  }

  async deleteCredential(id: string): Promise<void> {
    this.requireUnlocked();
    await this.vault.delete(id);
  }

  reviewOffer(
    offer: string | unknown,
    purpose = 'Credential offer',
  ): OfferReview {
    this.requireUnlocked();
    try {
      const parsed = parseCredentialOffer(
        typeof offer === 'string' ? JSON.parse(offer) : offer,
      );
      const review: OfferReview = {
        issuer: safeRemoteText(parsed.credential_issuer),
        credentialType: safeRemoteText(parsed.credential_configuration_ids[0]),
        purpose: safeRemoteText(purpose),
        claims: ['is_over_18: true'],
        exactDisclosures: ['is_over_18: true'],
        offer: parsed,
      };
      this.pendingOffer = review;
      this.screen = 'offer-review';
      return review;
    } catch {
      throw new WalletUiError(
        'rejected-offer',
        'Offer is invalid or cannot be verified',
      );
    }
  }

  async acceptOffer(input: {
    readonly transport: HttpTransport;
    readonly proofJwt: string;
    readonly verifyCredential: (credential: string) => Promise<unknown>;
    readonly credentialId?: string;
  }): Promise<{ credential: string; verified: unknown; stored: boolean }> {
    const secret = this.requireUnlocked();
    if (!this.pendingOffer)
      throw new WalletUiError(
        'rejected-offer',
        'Review the offer before accepting',
      );
    try {
      return await issuePreAuthorizedCredential({
        offer: this.pendingOffer.offer,
        transport: input.transport,
        proofJwt: input.proofJwt,
        verifyCredential: input.verifyCredential,
        credentialId: input.credentialId,
        vault: {
          put: (metadata, credential) =>
            this.vault.put(metadata, credential, {
              strategy: 'passphrase',
              passphrase: new TextDecoder().decode(secret),
            }),
        },
      });
    } catch {
      throw new WalletUiError(
        'rejected-offer',
        'Credential was not verified or stored',
      );
    } finally {
      this.pendingOffer = undefined;
      this.screen = 'credentials';
    }
  }

  async reviewPresentation(
    input: string | URL | Record<string, unknown>,
    hooks: Parameters<typeof parseOpenId4VpRequest>[1] = {},
  ): Promise<PresentationReview> {
    const secret = this.requireUnlocked();
    try {
      const request = await parseOpenId4VpRequest(input, hooks);
      const policy = fromDcql(request.dcql_query, 'Verifier request');
      const metadata = await this.vault.list();
      const candidates: PresentationCandidate[] = [];
      for (const item of metadata) {
        const opened = await this.vault.get(item.id, secret);
        const value = opened.credential as Record<string, unknown>;
        candidates.push({
          id: item.id,
          format: 'dc+sd-jwt',
          vct: String(value.vct ?? item.credentialType),
          claims: (value.claims ?? value.disclosedClaims ?? value) as Record<
            string,
            unknown
          >,
          disclosures: [],
        });
      }
      const matches = selectPresentationCandidates(policy, candidates).map(
        (candidate) => metadata.find((item) => item.id === candidate.id)!,
      );
      const review: PresentationReview = {
        verifier: safeRemoteText(request.client_id),
        purpose: safeRemoteText(policy.purpose),
        requestedClaims: policy.credentials.flatMap((credential) =>
          credential.claims.map((claim) => claim.path.join('.')),
        ),
        matchingCredentials: matches,
        request,
        policy,
        consent: {
          requester: safeRemoteText(request.client_id),
          requesterOrigin: originOf(request.client_id),
          requestedData: policy.credentials.flatMap((credential) =>
            credential.claims.map((claim) => claim.path.join('.')),
          ),
          sharedData: matches.flatMap(() =>
            policy.credentials.flatMap((credential) =>
              credential.claims
                .filter((claim) => claim.requiredDisclosure)
                .map((claim) => claim.path.join('.')),
            ),
          ),
          purpose: safeRemoteText(policy.purpose),
          expiry: matches
            .map((item) => item.expiresAt)
            .find((value): value is string => typeof value === 'string'),
          trust: trustForRequest(request, hooks),
          canApprove: trustForRequest(request, hooks).level !== 'blocked',
        },
      };
      this.pendingPresentation = review;
      this.screen = 'presentation-review';
      return review;
    } catch (error) {
      if (error instanceof OpenId4VpError) {
        const code =
          error.code === 'ambiguous_verifier' ||
          error.code === 'untrusted_request' ||
          error.code === 'insecure_origin' ||
          error.code === 'invalid_transaction_data'
            ? 'unsafe-request'
            : 'corrupt-vault';
        throw new WalletUiError(code, 'Request could not be safely reviewed');
      }
      throw new WalletUiError(
        'corrupt-vault',
        'Request or vault data could not be safely opened',
      );
    }
  }

  cancelPresentation(): WalletUiError {
    this.pendingPresentation = undefined;
    this.screen = this.secret ? 'credentials' : 'locked';
    return new WalletUiError(
      'cancelled-presentation',
      'Presentation cancelled; no disclosure was sent',
    );
  }

  requirePresentationApproval(): PresentationReview {
    if (!this.pendingPresentation)
      throw new WalletUiError(
        'cancelled-presentation',
        'No presentation is awaiting approval',
      );
    if (!this.pendingPresentation.consent.canApprove)
      throw new WalletUiError(
        'unsafe-request',
        'Verifier identity must be confirmed before approval',
      );
    return this.pendingPresentation;
  }

  /** Deny without exposing whether any hidden claim matched. */
  denyPresentation(): WalletUiError {
    this.pendingPresentation = undefined;
    this.screen = this.secret ? 'credentials' : 'locked';
    return new WalletUiError(
      'cancelled-presentation',
      'Presentation cancelled; no disclosure was sent',
    );
  }

  /** Submit only the exact credential set approved in the review screen. */
  async submitPresentation(input: {
    readonly approvedCredentialIds: readonly string[];
    readonly present: (
      credential: unknown,
      request: OpenId4VpRequest,
    ) => Promise<string>;
    readonly transport: HttpTransport;
  }): Promise<{ readonly vpToken: string; readonly responseUri: string }> {
    const secret = this.requireUnlocked();
    const review = this.requirePresentationApproval();
    const expected = review.matchingCredentials.map((item) => item.id).sort();
    const approved = [...input.approvedCredentialIds].sort();
    if (
      expected.length !== approved.length ||
      expected.some((id, index) => id !== approved[index])
    )
      throw new WalletUiError(
        'cancelled-presentation',
        'Approval does not match the reviewed disclosure set',
      );
    const opened = await Promise.all(
      approved.map((id) => this.vault.get(id, secret)),
    );
    if (opened.length !== 1)
      throw new WalletUiError(
        'cancelled-presentation',
        'This demo requires one approved credential',
      );
    const vpToken = await input.present(opened[0].credential, review.request);
    if (!vpToken || vpToken.length > 32768)
      throw new WalletUiError(
        'cancelled-presentation',
        'Presentation was rejected before sending',
      );
    const response = await input.transport(review.request.response_uri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        vp_token: vpToken,
        state: review.request.state,
      }).toString(),
    });
    if (response.status < 200 || response.status >= 300)
      throw new WalletUiError(
        'cancelled-presentation',
        'Verifier did not accept the presentation',
      );
    this.pendingPresentation = undefined;
    this.screen = 'credentials';
    return { vpToken, responseUri: review.request.response_uri };
  }

  private requireUnlocked(): Uint8Array {
    if (!this.secret)
      throw new WalletUiError('locked', 'Unlock the wallet to continue');
    return this.secret;
  }
}

export const walletUiCopy = Object.freeze({
  title: 'Sovereign Smart Wallet',
  warning: 'Local synthetic demo. Review every claim before disclosure.',
  prfFallback:
    'WebAuthn PRF is unavailable; use the approved encrypted passphrase fallback.',
  consentLabels: Object.freeze({
    requester: 'Requester',
    requestedData: 'Requested data',
    sharedData: 'Data to share',
    purpose: 'Purpose',
    expiry: 'Expires',
    trust: 'Request trust',
  }),
  unsafeRequest: 'This request is unsafe or ambiguous and cannot be approved.',
  denial: 'Presentation cancelled; no disclosure was sent.',
});
