import type { HolderCredentialClient } from '@ssw/identity-sdk/holder';

export class CredentialActionsError extends Error {
  constructor(readonly code: 'CONFIRMATION_REQUIRED' | 'PLAINTEXT_EXPORT' | 'OPERATION_FAILED', message: string) {
    super(message);
    this.name = 'CredentialActionsError';
  }
}

/**
 * Wallet controls for destructive and export operations. Export is accepted
 * only when the vault returns the encrypted-record envelope used by the app's
 * encrypted store; plaintext credential arrays are rejected at the UI boundary.
 */
export class CredentialActionsController {
  constructor(private readonly client: HolderCredentialClient) {}

  async delete(credentialId: string, options: { readonly confirm: boolean; readonly signal?: AbortSignal }): Promise<void> {
    if (!options.confirm) throw new CredentialActionsError('CONFIRMATION_REQUIRED', 'Deletion confirmation is required');
    try {
      await this.client.delete(credentialId, { signal: options.signal });
    } catch {
      throw new CredentialActionsError('OPERATION_FAILED', 'Credential could not be deleted');
    }
  }

  async exportEncrypted(options: {
    readonly credentialIds?: readonly string[];
    readonly confirm: boolean;
    readonly signal?: AbortSignal;
  }): Promise<Uint8Array> {
    if (!options.confirm) throw new CredentialActionsError('CONFIRMATION_REQUIRED', 'Export confirmation is required');
    let bytes: Uint8Array;
    try {
      bytes = await this.client.export({
        credentialIds: options.credentialIds,
        confirmExport: true,
        signal: options.signal,
      });
    } catch {
      throw new CredentialActionsError('OPERATION_FAILED', 'Credential export failed');
    }
    if (!isEncryptedEnvelope(bytes))
      throw new CredentialActionsError('PLAINTEXT_EXPORT', 'The vault did not return an encrypted export');
    return bytes;
  }
}

const isEncryptedEnvelope = (bytes: Uint8Array): boolean => {
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const envelope = value as Record<string, unknown>;
    if (envelope.schemaVersion !== 1 || !Array.isArray(envelope.encrypted)) return false;
    if ('credentials' in envelope || 'artifacts' in envelope) return false;
    return envelope.encrypted.every(record => {
      if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
      const item = record as Record<string, unknown>;
      return Array.isArray(item.iv) && Array.isArray(item.ciphertext) && !('artifact' in item);
    });
  } catch {
    return false;
  }
};

export { isEncryptedEnvelope };
