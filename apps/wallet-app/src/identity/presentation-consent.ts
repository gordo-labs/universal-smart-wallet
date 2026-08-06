import type {
  HolderCredentialClient,
  PresentationRequest,
} from '@ssw/identity-sdk/holder';

export type ConsentPreview = {
  readonly audience: string;
  readonly nonce: string;
  readonly claims: readonly string[];
};

export type PresentationConsentErrorCode =
  | 'NO_CLAIMS_SELECTED'
  | 'CONFIRMATION_REQUIRED'
  | 'CANCELLED'
  | 'OPERATION_FAILED';

export class PresentationConsentError extends Error {
  constructor(readonly code: PresentationConsentErrorCode, message: string) {
    super(message);
    this.name = 'PresentationConsentError';
  }
}

const uniqueClaims = (claims: readonly string[]): string[] => [...new Set(claims)];

/**
 * Explicit claim-by-claim presentation consent. Cancellation and every new
 * request clear the selection, so a previous disclosure cannot be reused.
 */
export class PresentationConsentController {
  private selected = new Set<string>();
  private cancelled = false;
  private request?: PresentationRequest;

  constructor(private readonly client: HolderCredentialClient) {}

  begin(request: PresentationRequest): ConsentPreview {
    this.request = Object.freeze({
      ...request,
      claims: Object.freeze(uniqueClaims(request.claims)),
      consent: undefined as never,
    });
    this.selected.clear();
    this.cancelled = false;
    return this.preview;
  }

  get preview(): ConsentPreview {
    if (!this.request) return Object.freeze({ audience: '', nonce: '', claims: Object.freeze([]) });
    return Object.freeze({
      audience: this.request.audience,
      nonce: this.request.nonce,
      claims: Object.freeze([...this.selected]),
    });
  }

  setClaimConsent(claim: string, accepted: boolean): ConsentPreview {
    if (!this.request || !this.request.claims.includes(claim))
      throw new PresentationConsentError('OPERATION_FAILED', 'Claim is not part of this request');
    if (accepted) this.selected.add(claim);
    else this.selected.delete(claim);
    return this.preview;
  }

  cancel(): void {
    this.cancelled = true;
    this.selected.clear();
    this.request = undefined;
  }

  async submit(options: { readonly confirm: boolean; readonly signal?: AbortSignal }): Promise<unknown> {
    if (this.cancelled || !this.request)
      throw new PresentationConsentError('CANCELLED', 'Presentation consent was cancelled');
    if (!options.confirm)
      throw new PresentationConsentError('CONFIRMATION_REQUIRED', 'Explicit presentation confirmation is required');
    const claims = [...this.selected];
    if (claims.length === 0)
      throw new PresentationConsentError('NO_CLAIMS_SELECTED', 'Select at least one claim to disclose');
    const request = this.request;
    try {
      const result = await this.client.present(
        {
          ...request,
          claims,
          consent: { accepted: true, claims },
        },
        { signal: options.signal },
      );
      this.selected.clear();
      this.request = undefined;
      return result;
    } catch (error) {
      if (error instanceof PresentationConsentError) throw error;
      throw new PresentationConsentError('OPERATION_FAILED', 'Presentation could not be completed');
    }
  }
}
