import type {
  CredentialArtifact,
  CredentialFormat,
  CredentialInspection,
} from '@ssw/credential-formats';

/** A holder-owned record. The artifact stays in the configured vault only. */
export type HolderCredential = {
  readonly credentialId: string;
  readonly format: CredentialFormat;
  readonly artifact: CredentialArtifact;
  readonly inspection?: CredentialInspection;
  readonly issuer?: string;
  readonly subject?: string;
  readonly assurance?: string;
  readonly status?: 'active' | 'deleted' | 'suspended' | 'revoked';
  readonly createdAt: number;
};

export type HolderCredentialSummary = Omit<HolderCredential, 'artifact'> & {
  /** Deliberately no credential value. */
  readonly hasArtifact: true;
};

export type HolderStore = {
  list(options?: { readonly signal?: AbortSignal }): Promise<readonly HolderCredential[]>;
  get(credentialId: string, options?: { readonly signal?: AbortSignal }): Promise<HolderCredential | undefined>;
  put(credential: HolderCredential, options?: { readonly signal?: AbortSignal }): Promise<void>;
  delete(credentialId: string, options?: { readonly signal?: AbortSignal }): Promise<boolean>;
  /** The vault owns encryption and export serialization. */
  export(input: {
    readonly credentialIds?: readonly string[];
    readonly signal?: AbortSignal;
  }): Promise<Uint8Array>;
};

export type CredentialOffer = {
  readonly credential_issuer: string;
  readonly credential_configuration_ids?: readonly string[];
  readonly grants?: Readonly<Record<string, unknown>>;
  readonly expires_in?: number;
  readonly [key: string]: unknown;
};

export type IssuanceTransport = {
  metadata(input: {
    readonly issuer: string;
    readonly offer: CredentialOffer;
    readonly signal?: AbortSignal;
  }): Promise<unknown>;
  token(input: {
    readonly issuer: string;
    readonly offer: CredentialOffer;
    readonly signal?: AbortSignal;
  }): Promise<{ readonly access_token: string; readonly expires_in?: number }>;
  credential(input: {
    readonly issuer: string;
    readonly offer: CredentialOffer;
    readonly accessToken: string;
    readonly proof: string;
    readonly signal?: AbortSignal;
  }): Promise<{
    readonly credential: string;
    readonly credential_id?: string;
    readonly format?: CredentialFormat;
    readonly status_id?: string;
  }>;
};

export type CredentialInspector = (
  credential: CredentialArtifact,
  options?: { readonly signal?: AbortSignal },
) => Promise<CredentialInspection>;

export type HolderProofFactory = (input: {
  readonly issuer: string;
  readonly offer: CredentialOffer;
  readonly signal?: AbortSignal;
}) => Promise<string>;

export type SelfAttestedCreator = (input: unknown, options?: { readonly signal?: AbortSignal }) => Promise<{
  readonly credentialId: string;
  readonly format: CredentialFormat;
  readonly artifact: CredentialArtifact;
  readonly inspection?: CredentialInspection;
  readonly issuer?: string;
  readonly subject?: string;
  readonly assurance?: string;
}>;

export type PresentationPort = (input: {
  readonly credential: HolderCredential;
  readonly claims: readonly string[];
  readonly audience: string;
  readonly nonce: string;
  readonly signal?: AbortSignal;
}) => Promise<unknown>;

export type HolderConsent = {
  readonly accepted: true;
  /** Must exactly equal the requested claim set; no implicit disclosure. */
  readonly claims: readonly string[];
  readonly reason?: string;
};

export type PresentationRequest = {
  readonly credentialId: string;
  readonly claims: readonly string[];
  readonly audience: string;
  readonly nonce: string;
  readonly consent: HolderConsent;
  readonly acknowledgeUnknownIssuer?: boolean;
};

export type HolderClientOptions = {
  readonly store: HolderStore;
  readonly issuance?: IssuanceTransport;
  readonly proofFactory?: HolderProofFactory;
  readonly selfAttestedCreator?: SelfAttestedCreator;
  readonly inspector?: CredentialInspector;
  readonly presenter?: PresentationPort;
  /** Exact issuer URI allowlist. Unknown issuers require explicit acknowledgement. */
  readonly trustedIssuers?: readonly string[];
  readonly now?: () => number;
};

export type HolderErrorCode =
  | 'INVALID_REQUEST'
  | 'CONSENT_REQUIRED'
  | 'CLAIM_CONSENT_MISMATCH'
  | 'UNKNOWN_ISSUER'
  | 'CREDENTIAL_NOT_FOUND'
  | 'ISSUANCE_NOT_CONFIGURED'
  | 'PROOF_NOT_CONFIGURED'
  | 'PRESENTATION_NOT_CONFIGURED'
  | 'EXPORT_CONSENT_REQUIRED'
  | 'ABORTED'
  | 'OPERATION_FAILED';

/** Stable, redacted holder error. It never carries credential or secret data. */
export class HolderClientError extends Error {
  constructor(readonly code: HolderErrorCode, message = 'Holder operation failed') {
    super(message);
    this.name = 'HolderClientError';
  }
}

const fail = (code: HolderErrorCode, message?: string): never => {
  throw new HolderClientError(code, message);
};

const isAbort = (error: unknown): boolean =>
  error instanceof HolderClientError && error.code === 'ABORTED';

const abortIfNeeded = (signal?: AbortSignal): void => {
  if (signal?.aborted) fail('ABORTED', 'Request aborted');
};

const parseOffer = (value: CredentialOffer | string): CredentialOffer => {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return fail('INVALID_REQUEST');
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    return fail('INVALID_REQUEST');
  const offer = parsed as Record<string, unknown>;
  if (
    typeof offer.credential_issuer !== 'string' ||
    offer.credential_issuer.length === 0 ||
    offer.credential_issuer.length > 2_048
  )
    return fail('INVALID_REQUEST');
  try {
    const url = new URL(offer.credential_issuer);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
      return fail('INVALID_REQUEST');
  } catch {
    return fail('INVALID_REQUEST');
  }
  if (
    offer.credential_configuration_ids !== undefined &&
    (!Array.isArray(offer.credential_configuration_ids) ||
      offer.credential_configuration_ids.some(
        (id) => typeof id !== 'string' || id.length === 0 || id.length > 512,
      ))
  )
    return fail('INVALID_REQUEST');
  return Object.freeze({
    ...offer,
    credential_issuer: offer.credential_issuer,
    ...(Array.isArray(offer.credential_configuration_ids)
      ? { credential_configuration_ids: Object.freeze([...offer.credential_configuration_ids] as string[]) }
      : {}),
  }) as CredentialOffer;
};

const issuerIsTrusted = (issuer: string, trusted: readonly string[]): boolean =>
  trusted.some((candidate) => candidate === issuer);

const sameClaims = (left: readonly string[], right: readonly string[]): boolean => {
  if (left.length !== right.length) return false;
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === left.length && b.length === right.length && a.every((v, i) => v === b[i]);
};

const summary = (credential: HolderCredential): HolderCredentialSummary => {
  const { artifact: _artifact, ...metadata } = credential;
  return Object.freeze({ ...metadata, hasArtifact: true });
};

export class HolderCredentialClient {
  private readonly now: () => number;
  private readonly trusted: readonly string[];

  constructor(private readonly options: HolderClientOptions) {
    this.now = options.now ?? (() => Date.now());
    this.trusted = Object.freeze([...(options.trustedIssuers ?? [])]);
  }

  async acceptOffer(
    input: CredentialOffer | string,
    options: {
      readonly acknowledgeUnknownIssuer?: boolean;
      readonly signal?: AbortSignal;
    } = {},
  ): Promise<HolderCredential> {
    abortIfNeeded(options.signal);
    const offer = parseOffer(input);
    if (!issuerIsTrusted(offer.credential_issuer, this.trusted) && !options.acknowledgeUnknownIssuer)
      fail('UNKNOWN_ISSUER', 'Issuer acknowledgement is required');
    const transport = this.options.issuance ?? fail('ISSUANCE_NOT_CONFIGURED');
    const proofFactory = this.options.proofFactory ?? fail('PROOF_NOT_CONFIGURED');
    try {
      await transport.metadata({ issuer: offer.credential_issuer, offer, signal: options.signal });
      const token = await transport.token({ issuer: offer.credential_issuer, offer, signal: options.signal });
      abortIfNeeded(options.signal);
      const proof = await proofFactory({ issuer: offer.credential_issuer, offer, signal: options.signal });
      const response = await transport.credential({
        issuer: offer.credential_issuer,
        offer,
        accessToken: token.access_token,
        proof,
        signal: options.signal,
      });
      if (typeof response.credential !== 'string' || response.credential.length === 0)
        fail('OPERATION_FAILED');
      const credentialId = response.credential_id ?? `credential-${this.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const format = response.format ?? 'sd-jwt-vc';
      const credential: HolderCredential = Object.freeze({
        credentialId,
        format,
        artifact: Object.freeze({
          format,
          profile: 'unknown',
          version: 'unknown',
          mediaType: 'application/octet-stream',
          kind: 'credential',
          value: response.credential,
        }),
        issuer: offer.credential_issuer,
        assurance: 'institutional',
        status: 'active',
        createdAt: this.now(),
      });
      await this.options.store.put(credential, { signal: options.signal });
      return credential;
    } catch (error) {
      if (isAbort(error)) throw error;
      if (options.signal?.aborted) fail('ABORTED', 'Request aborted');
      if (error instanceof HolderClientError) throw error;
      throw new HolderClientError('OPERATION_FAILED');
    }
  }

  async list(options: { readonly signal?: AbortSignal } = {}): Promise<readonly HolderCredentialSummary[]> {
    abortIfNeeded(options.signal);
    try {
      const credentials = await this.options.store.list(options);
      return Object.freeze(credentials.map(summary));
    } catch {
      if (options.signal?.aborted) fail('ABORTED', 'Request aborted');
      throw new HolderClientError('OPERATION_FAILED');
    }
  }

  async inspect(credentialId: string, options: { readonly signal?: AbortSignal } = {}): Promise<CredentialInspection> {
    abortIfNeeded(options.signal);
    const credential = await this.getCredential(credentialId, options);
    if (credential.inspection) return credential.inspection;
    const inspector = this.options.inspector;
    if (!inspector) throw new HolderClientError('OPERATION_FAILED');
    const inspectFn: CredentialInspector = inspector;
    try {
      return await inspectFn(credential.artifact, options);
    } catch {
      if (options.signal?.aborted) fail('ABORTED', 'Request aborted');
      throw new HolderClientError('OPERATION_FAILED');
    }
  }

  async createSelfAttested(input: unknown, options: { readonly signal?: AbortSignal } = {}): Promise<HolderCredential> {
    abortIfNeeded(options.signal);
    const creator = this.options.selfAttestedCreator ?? fail('OPERATION_FAILED');
    try {
      const created = await creator(input, options);
      const credential: HolderCredential = Object.freeze({
        ...created,
        status: 'active',
        assurance: 'self_attested',
        createdAt: this.now(),
      });
      await this.options.store.put(credential, options);
      return credential;
    } catch (error) {
      if (options.signal?.aborted) fail('ABORTED', 'Request aborted');
      if (error instanceof HolderClientError) throw error;
      throw new HolderClientError('OPERATION_FAILED');
    }
  }

  async delete(credentialId: string, options: { readonly signal?: AbortSignal } = {}): Promise<void> {
    abortIfNeeded(options.signal);
    try {
      const deleted = await this.options.store.delete(credentialId, options);
      if (!deleted) fail('CREDENTIAL_NOT_FOUND');
    } catch (error) {
      if (error instanceof HolderClientError) throw error;
      if (options.signal?.aborted) fail('ABORTED', 'Request aborted');
      throw new HolderClientError('OPERATION_FAILED');
    }
  }

  async export(input: {
    readonly credentialIds?: readonly string[];
    readonly confirmExport: true;
    readonly signal?: AbortSignal;
  }): Promise<Uint8Array> {
    if (input.confirmExport !== true) fail('EXPORT_CONSENT_REQUIRED');
    abortIfNeeded(input.signal);
    try {
      return await this.options.store.export(input);
    } catch {
      if (input.signal?.aborted) fail('ABORTED', 'Request aborted');
      throw new HolderClientError('OPERATION_FAILED');
    }
  }

  async present(input: PresentationRequest, options: { readonly signal?: AbortSignal } = {}): Promise<unknown> {
    abortIfNeeded(options.signal);
    if (!input.consent || input.consent.accepted !== true) fail('CONSENT_REQUIRED');
    if (!sameClaims(input.claims, input.consent.claims)) fail('CLAIM_CONSENT_MISMATCH');
    if (!input.audience || !input.nonce || input.claims.some((claim) => !/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/u.test(claim)))
      fail('INVALID_REQUEST');
    const credential = await this.getCredential(input.credentialId, options);
    if (credential.issuer && !issuerIsTrusted(credential.issuer, this.trusted) && !input.acknowledgeUnknownIssuer)
      fail('UNKNOWN_ISSUER', 'Issuer acknowledgement is required');
    const presenter = this.options.presenter;
    if (!presenter) throw new HolderClientError('PRESENTATION_NOT_CONFIGURED');
    const presentFn: PresentationPort = presenter;
    try {
      return await presentFn({ ...input, credential, signal: options.signal });
    } catch (error) {
      if (options.signal?.aborted) fail('ABORTED', 'Request aborted');
      if (error instanceof HolderClientError) throw error;
      throw new HolderClientError('OPERATION_FAILED');
    }
  }

  private async getCredential(
    credentialId: string,
    options: { readonly signal?: AbortSignal },
  ): Promise<HolderCredential> {
    try {
      const credential = await this.options.store.get(credentialId, options);
      if (!credential) throw new HolderClientError('CREDENTIAL_NOT_FOUND');
      return credential;
    } catch (error) {
      if (error instanceof HolderClientError) throw error;
      if (options.signal?.aborted) fail('ABORTED', 'Request aborted');
      throw new HolderClientError('OPERATION_FAILED');
    }
  }
}

/** Minimal in-memory vault useful for local tests; production apps inject an encrypted vault. */
export class InMemoryHolderStore implements HolderStore {
  private readonly records = new Map<string, HolderCredential>();
  async list(options: { readonly signal?: AbortSignal } = {}): Promise<readonly HolderCredential[]> {
    abortIfNeeded(options.signal);
    return [...this.records.values()];
  }
  async get(credentialId: string, options: { readonly signal?: AbortSignal } = {}): Promise<HolderCredential | undefined> {
    abortIfNeeded(options.signal);
    return this.records.get(credentialId);
  }
  async put(credential: HolderCredential, options: { readonly signal?: AbortSignal } = {}): Promise<void> {
    abortIfNeeded(options.signal);
    this.records.set(credential.credentialId, credential);
  }
  async delete(credentialId: string, options: { readonly signal?: AbortSignal } = {}): Promise<boolean> {
    abortIfNeeded(options.signal);
    return this.records.delete(credentialId);
  }
  async export(input: { readonly credentialIds?: readonly string[]; readonly signal?: AbortSignal }): Promise<Uint8Array> {
    abortIfNeeded(input.signal);
    const selected = input.credentialIds
      ? input.credentialIds.map((id) => this.records.get(id)).filter((v): v is HolderCredential => Boolean(v))
      : [...this.records.values()];
    // This test vault is deliberately explicit: callers must replace it with an encrypted vault in production.
    return new TextEncoder().encode(JSON.stringify({ schemaVersion: 1, credentials: selected }));
  }
}
