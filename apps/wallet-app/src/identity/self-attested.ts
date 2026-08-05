import type { HolderCredential, HolderCredentialClient } from '@ssw/identity-sdk/holder';

/** This warning is intentionally exported as a constant so every surface uses the same copy. */
export const SELF_ATTESTED_WARNING =
  'Self-attested: this credential is created by you and has no institutional endorsement. It cannot be upgraded to an institutional assurance level.';

export type SelfAttestedClaim = {
  readonly name: string;
  readonly value: string;
};

export type SelfAttestedDraft = {
  readonly claims: readonly SelfAttestedClaim[];
};

export type SelfAttestedEditorErrorCode =
  | 'INVALID_CLAIM_NAME'
  | 'EMPTY_CLAIMS'
  | 'CONFIRMATION_REQUIRED'
  | 'CANCELLED'
  | 'OPERATION_FAILED';

export class SelfAttestedEditorError extends Error {
  constructor(readonly code: SelfAttestedEditorErrorCode, message: string) {
    super(message);
    this.name = 'SelfAttestedEditorError';
  }
}

const claimName = /^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/u;

const cloneClaims = (claims: readonly SelfAttestedClaim[]): SelfAttestedClaim[] =>
  claims.map(claim => ({ name: claim.name, value: claim.value }));

const validateClaims = (claims: readonly SelfAttestedClaim[]): void => {
  if (claims.length === 0) throw new SelfAttestedEditorError('EMPTY_CLAIMS', 'At least one claim is required');
  const names = new Set<string>();
  for (const claim of claims) {
    if (!claimName.test(claim.name) || names.has(claim.name))
      throw new SelfAttestedEditorError('INVALID_CLAIM_NAME', 'Claim names must be unique and well formed');
    if (claim.value.length > 4_096)
      throw new SelfAttestedEditorError('OPERATION_FAILED', 'Claim value is too large');
    names.add(claim.name);
  }
};

/**
 * State machine behind the self-attested editor. It never accepts an assurance
 * value from the UI: the holder SDK is the only authority for the permanent
 * `self_attested` label.
 */
export class SelfAttestedEditorController {
  private claims: SelfAttestedClaim[];
  private cancelled = false;

  constructor(private readonly client: HolderCredentialClient, initial: SelfAttestedDraft = { claims: [] }) {
    this.claims = cloneClaims(initial.claims);
  }

  get warning(): string {
    return SELF_ATTESTED_WARNING;
  }

  get draft(): SelfAttestedDraft {
    return Object.freeze({ claims: Object.freeze(cloneClaims(this.claims)) });
  }

  setClaim(name: string, value: string): SelfAttestedDraft {
    const next = this.claims.filter(claim => claim.name !== name);
    next.push({ name, value });
    this.claims = next;
    this.cancelled = false;
    return this.draft;
  }

  removeClaim(name: string): SelfAttestedDraft {
    this.claims = this.claims.filter(claim => claim.name !== name);
    return this.draft;
  }

  cancel(): void {
    this.cancelled = true;
    this.claims = [];
  }

  async save(options: { readonly confirm: boolean; readonly signal?: AbortSignal }): Promise<HolderCredential> {
    if (this.cancelled) throw new SelfAttestedEditorError('CANCELLED', 'Self-attested editing was cancelled');
    if (!options.confirm)
      throw new SelfAttestedEditorError('CONFIRMATION_REQUIRED', 'Explicit confirmation is required');
    validateClaims(this.claims);
    try {
      const created = await this.client.createSelfAttested(
        { claims: Object.fromEntries(this.claims.map(claim => [claim.name, claim.value])) },
        { signal: options.signal },
      );
      // Defence-in-depth: the client must enforce this invariant; the UI never
      // presents a successful result with another assurance level.
      if (created.assurance !== 'self_attested')
        throw new SelfAttestedEditorError('OPERATION_FAILED', 'Self-attested assurance invariant failed');
      return created;
    } catch (error) {
      if (error instanceof SelfAttestedEditorError) throw error;
      throw new SelfAttestedEditorError('OPERATION_FAILED', 'Self-attested credential could not be created');
    }
  }
}
