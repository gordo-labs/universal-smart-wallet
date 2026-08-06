import type { CredentialInspection } from '@ssw/credential-formats';
import type {
  CredentialOffer,
  HolderCredential,
  HolderCredentialClient,
  HolderCredentialSummary,
} from '@ssw/identity-sdk/holder';

export type OfferAssurance = 'institutional' | 'self_attested' | 'unknown';
export type OfferTrust = 'trusted' | 'unknown';

/** The review model intentionally contains metadata only; credential bytes stay inside the SDK. */
export type CredentialOfferReview = {
  readonly issuer: string;
  readonly issuerTrust: OfferTrust;
  readonly assurance: OfferAssurance;
  readonly status: 'not_stored';
  readonly expiresAt?: number;
  readonly credentialConfigurations: readonly string[];
  readonly warning?: string;
};

export type HolderCredentialView = {
  readonly summary: HolderCredentialSummary;
  readonly issuerTrust: OfferTrust;
};

export type IdentityStudioErrorCode =
  | 'INVALID_OFFER'
  | 'OFFER_REQUIRED'
  | 'OFFER_CANCELLED'
  | 'CONFIRMATION_REQUIRED'
  | 'UNKNOWN_ISSUER';

export class IdentityStudioError extends Error {
  constructor(readonly code: IdentityStudioErrorCode, message: string) {
    super(message);
    this.name = 'IdentityStudioError';
  }
}

const fail = (code: IdentityStudioErrorCode, message: string): never => {
  throw new IdentityStudioError(code, message);
};

const parseOffer = (input: CredentialOffer | string): CredentialOffer => {
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      return fail('INVALID_OFFER', 'The credential offer is not valid JSON');
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return fail('INVALID_OFFER', 'The credential offer must be an object');
  const offer = value as Record<string, unknown>;
  if (typeof offer.credential_issuer !== 'string' || offer.credential_issuer.length === 0)
    return fail('INVALID_OFFER', 'The offer does not identify an issuer');
  try {
    const issuer = new URL(offer.credential_issuer);
    if (!['https:', 'http:'].includes(issuer.protocol) || issuer.username || issuer.password)
      return fail('INVALID_OFFER', 'The issuer origin is not allowed');
  } catch {
    return fail('INVALID_OFFER', 'The issuer URL is invalid');
  }
  if (
    offer.expires_in !== undefined &&
    (!Number.isSafeInteger(offer.expires_in) || (offer.expires_in as number) <= 0)
  )
    return fail('INVALID_OFFER', 'The offer expiry is invalid');
  if (
    offer.credential_configuration_ids !== undefined &&
    (!Array.isArray(offer.credential_configuration_ids) ||
      offer.credential_configuration_ids.some(
        item => typeof item !== 'string' || item.length === 0 || item.length > 512,
      ))
  )
    return fail('INVALID_OFFER', 'The offer configurations are invalid');
  return offer as CredentialOffer;
};

const trustedIssuer = (issuer: string, trustedIssuers: readonly string[]): boolean =>
  trustedIssuers.some(candidate => candidate === issuer);

const assurance = (offer: CredentialOffer): OfferAssurance => {
  const value = offer['assurance'];
  return value === 'institutional' || value === 'self_attested' ? value : 'institutional';
};

/** Build a bounded, metadata-only view before any issuance or vault call occurs. */
export const reviewCredentialOffer = (
  input: CredentialOffer | string,
  options: { readonly trustedIssuers?: readonly string[]; readonly now?: number } = {},
): CredentialOfferReview => {
  const offer = parseOffer(input);
  const issuerTrust = trustedIssuer(offer.credential_issuer, options.trustedIssuers ?? [])
    ? 'trusted'
    : 'unknown';
  const expiresAt =
    typeof offer.expires_in === 'number'
      ? (options.now ?? Date.now()) + offer.expires_in * 1_000
      : undefined;
  return Object.freeze({
    issuer: offer.credential_issuer,
    issuerTrust,
    assurance: assurance(offer),
    status: 'not_stored',
    ...(expiresAt ? { expiresAt } : {}),
    credentialConfigurations: Object.freeze(
      Array.isArray(offer.credential_configuration_ids)
        ? [...offer.credential_configuration_ids]
        : [],
    ),
    ...(issuerTrust === 'unknown'
      ? { warning: 'Issuer is not in your trusted list. Review it before continuing.' }
      : {}),
  });
};

const sameReview = (left: CredentialOfferReview, right: CredentialOfferReview): boolean =>
  left.issuer === right.issuer &&
  left.expiresAt === right.expiresAt &&
  left.credentialConfigurations.length === right.credentialConfigurations.length &&
  left.credentialConfigurations.every((item, index) => item === right.credentialConfigurations[index]);

/** Controller keeps the raw offer private so a UI cannot accidentally render or log it. */
export class HolderIdentityStudioController {
  private pending?: { readonly review: CredentialOfferReview; readonly offer: CredentialOffer };

  constructor(
    private readonly client: HolderCredentialClient,
    private readonly trustedIssuers: readonly string[] = [],
    private readonly now: () => number = () => Date.now(),
  ) {}

  reviewOffer(input: CredentialOffer | string): CredentialOfferReview {
    const offer = parseOffer(input);
    const review = reviewCredentialOffer(offer, {
      trustedIssuers: this.trustedIssuers,
      now: this.now(),
    });
    this.pending = { review, offer };
    return review;
  }

  cancelOffer(): void {
    this.pending = undefined;
  }

  get pendingReview(): CredentialOfferReview | undefined {
    return this.pending?.review;
  }

  async acceptReviewedOffer(
    review: CredentialOfferReview,
    options: { readonly confirm: boolean; readonly acknowledgeUnknownIssuer?: boolean; readonly signal?: AbortSignal },
  ): Promise<HolderCredential> {
    if (!this.pending || !sameReview(this.pending.review, review))
      fail('OFFER_REQUIRED', 'Review the current offer before accepting it');
    if (!options.confirm) fail('CONFIRMATION_REQUIRED', 'Explicit acceptance is required');
    if (review.issuerTrust === 'unknown' && !options.acknowledgeUnknownIssuer)
      fail('UNKNOWN_ISSUER', 'Explicit acknowledgement is required for an unknown issuer');
    const pendingOffer = this.pending?.offer;
    if (!pendingOffer) fail('OFFER_REQUIRED', 'Review the current offer before accepting it');
    // Clear the pending review before invoking the network/vault boundary. A retry must be a new review.
    this.pending = undefined;
    return this.client.acceptOffer(pendingOffer as CredentialOffer, {
      acknowledgeUnknownIssuer: options.acknowledgeUnknownIssuer,
      signal: options.signal,
    });
  }
}

export const credentialViews = (
  summaries: readonly HolderCredentialSummary[],
  trustedIssuers: readonly string[],
): readonly HolderCredentialView[] =>
  Object.freeze(
    summaries.map(summary => ({
      summary,
      issuerTrust: (summary.issuer && trustedIssuer(summary.issuer, trustedIssuers)
        ? 'trusted'
        : 'unknown') as OfferTrust,
    })),
  );

export type CredentialInspectorView = {
  readonly inspection: CredentialInspection;
  readonly issuerTrust: OfferTrust;
  readonly assurance: string;
  readonly status: string;
  readonly expiresAt?: string;
};

export const inspectionView = (
  credential: HolderCredentialSummary,
  inspection: CredentialInspection,
  trustedIssuers: readonly string[],
): CredentialInspectorView => ({
  inspection,
  issuerTrust:
    credential.issuer && trustedIssuer(credential.issuer, trustedIssuers) ? 'trusted' : 'unknown',
  assurance: credential.assurance ?? 'unknown',
  status: credential.status ?? 'unknown',
});
