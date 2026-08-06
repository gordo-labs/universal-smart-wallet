import type { CredentialInspection } from '@ssw/credential-formats';
import type {
  CredentialOffer,
  HolderCredential,
  HolderCredentialSummary,
  HolderStore,
  IssuanceTransport,
} from '@ssw/identity-sdk/holder';

type EncryptedRecord = {
  readonly summary: HolderCredentialSummary;
  readonly iv: Uint8Array;
  readonly ciphertext: ArrayBuffer;
};

const bytes = (value: string): ArrayBuffer => new TextEncoder().encode(value).buffer as ArrayBuffer;

/**
 * Browser-only demo vault adapter. Metadata is indexable; credential artifacts
 * are AES-GCM encrypted before entering the adapter's backing map. A real app
 * should replace the transient key with PRF/passphrase recovery from SSW-007.
 */
export class ClientEncryptedHolderStore implements HolderStore {
  private readonly records = new Map<string, EncryptedRecord>();
  private keyPromise?: Promise<CryptoKey>;

  private key(): Promise<CryptoKey> {
    this.keyPromise ??= crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
    return this.keyPromise;
  }

  async list(options: { readonly signal?: AbortSignal } = {}): Promise<readonly HolderCredential[]> {
    if (options.signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
    return [...this.records.values()].map(record => record.summary as unknown as HolderCredential);
  }

  async get(
    credentialId: string,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<HolderCredential | undefined> {
    if (options.signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
    const record = this.records.get(credentialId);
    if (!record) return undefined;
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: record.iv as unknown as BufferSource },
      await this.key(),
      record.ciphertext,
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as HolderCredential;
  }

  async put(credential: HolderCredential, options: { readonly signal?: AbortSignal } = {}): Promise<void> {
    if (options.signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      await this.key(),
      bytes(JSON.stringify(credential)),
    );
    const { artifact: _artifact, ...metadata } = credential;
    this.records.set(credential.credentialId, {
      summary: Object.freeze({ ...metadata, hasArtifact: true }),
      iv,
      ciphertext,
    });
  }

  async delete(credentialId: string, options: { readonly signal?: AbortSignal } = {}): Promise<boolean> {
    if (options.signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
    return this.records.delete(credentialId);
  }

  async export(input: { readonly credentialIds?: readonly string[]; readonly signal?: AbortSignal }): Promise<Uint8Array> {
    if (input.signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
    const selected = input.credentialIds
      ? input.credentialIds.map(id => this.records.get(id)).filter((record): record is EncryptedRecord => Boolean(record))
      : [...this.records.values()];
    // Export contains ciphertext only; the transient AES key never leaves this process.
    return new TextEncoder().encode(
      JSON.stringify({
        schemaVersion: 1,
        encrypted: selected.map(record => ({
          summary: record.summary,
          iv: Array.from(record.iv),
          ciphertext: Array.from(new Uint8Array(record.ciphertext)),
        })),
      }),
    );
  }
}

const syntheticCredential = (issuer: string, offer: CredentialOffer): string =>
  JSON.stringify({
    kind: 'synthetic-institutional-credential',
    issuer,
    type: offer.credential_configuration_ids?.[0] ?? 'SyntheticCredential',
    claims: { synthetic: true },
  });

/** Development-only transport used by the local wallet screen; no production issuer is contacted. */
export const syntheticIssuance: IssuanceTransport = {
  async metadata() {
    return { synthetic: true };
  },
  async token() {
    return { access_token: 'synthetic-access-token' };
  },
  async credential({ issuer, offer }) {
    return {
      credential: syntheticCredential(issuer, offer),
      credential_id: `synthetic-${Date.now()}`,
      format: 'sd-jwt-vc',
    };
  },
};

export const syntheticInspector = async (artifact: HolderCredential['artifact']): Promise<CredentialInspection> => ({
  format: artifact.format,
  profile: artifact.profile,
  version: artifact.version,
  mediaType: artifact.mediaType,
  kind: artifact.kind,
  algorithm: 'synthetic-development-only',
  issuer: undefined,
  credentialTypes: ['SyntheticCredential'],
  holderBound: true,
});
