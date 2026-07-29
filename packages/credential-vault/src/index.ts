/**
 * Key-management boundary for the encrypted vault.
 *
 * This module deliberately does not speak WebAuthn or persist secrets. A
 * caller supplies the transient PRF output or passphrase after authentication;
 * only the authenticated envelope is serialisable.
 */

export const VAULT_ENVELOPE_VERSION = 1 as const;
const AES_KEY_BYTES = 32;
const IV_BYTES = 12;
const SALT_BYTES = 16;
const MIN_PBKDF2_ITERATIONS = 100_000;
const MAX_PBKDF2_ITERATIONS = 2_000_000;

export type VaultStrategy = 'prf' | 'passphrase';
export type PrfCapability = {
  readonly supported: boolean;
  readonly reason: 'available' | 'missing-api' | 'unsupported';
};

export interface VaultEnvelope {
  readonly version: typeof VAULT_ENVELOPE_VERSION;
  readonly algorithm: 'AES-GCM-256';
  readonly strategy: VaultStrategy;
  readonly kdf: {
    readonly name: 'HKDF-SHA-256' | 'PBKDF2-SHA-256';
    readonly salt: string;
    readonly iterations?: number;
  };
  readonly wrappedDek: { readonly iv: string; readonly ciphertext: string };
  readonly payload: { readonly iv: string; readonly ciphertext: string };
  /** Base64url authenticated metadata (AAD); never contains credential data. */
  readonly aad?: string;
}

export interface EnvelopeOptions {
  readonly strategy: VaultStrategy;
  /** Transient WebAuthn PRF output. Never persist or log it. */
  readonly prfOutput?: Uint8Array;
  /** Transient user-entered recovery factor. Never persist or log it. */
  readonly passphrase?: string;
  readonly iterations?: number;
  /** Injected only for deterministic tests; production uses crypto randomness. */
  readonly randomBytes?: (length: number) => Uint8Array;
  /** Authenticated, non-secret metadata bound to the ciphertext. */
  readonly associatedData?: Uint8Array;
}

const webCrypto = (): Crypto => {
  const value = globalThis.crypto;
  if (!value?.subtle) throw new Error('WebCrypto unavailable');
  return value;
};

const random = (
  length: number,
  injected?: (length: number) => Uint8Array,
): Uint8Array => {
  const bytes = injected
    ? injected(length)
    : webCrypto().getRandomValues(new Uint8Array(length));
  if (bytes.length !== length)
    throw new Error('Random source returned an invalid length');
  return bytes;
};

const b64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
};
const unb64 = (value: string): Uint8Array => {
  const binary = atob(
    value.replaceAll('-', '+').replaceAll('_', '/') +
      '='.repeat((4 - (value.length % 4)) % 4),
  );
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};
const asBytes = (value: Uint8Array | ArrayBuffer): Uint8Array =>
  value instanceof Uint8Array ? value : new Uint8Array(value);
const source = (value: Uint8Array): ArrayBuffer =>
  value.slice().buffer as ArrayBuffer;

const boundedIterations = (iterations = MIN_PBKDF2_ITERATIONS): number => {
  if (
    !Number.isSafeInteger(iterations) ||
    iterations < MIN_PBKDF2_ITERATIONS ||
    iterations > MAX_PBKDF2_ITERATIONS
  ) {
    throw new Error(
      `PBKDF2 iterations must be between ${MIN_PBKDF2_ITERATIONS} and ${MAX_PBKDF2_ITERATIONS}`,
    );
  }
  return iterations;
};

const importAesKey = (
  bytes: Uint8Array,
  usages: KeyUsage[],
): Promise<CryptoKey> =>
  webCrypto().subtle.importKey(
    'raw',
    source(bytes),
    { name: 'AES-GCM' },
    false,
    usages,
  );

const deriveWrappingKey = async (
  strategy: VaultStrategy,
  secret: Uint8Array | string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> => {
  const subtle = webCrypto().subtle;
  if (strategy === 'prf') {
    if (!(secret instanceof Uint8Array) || secret.length < 32)
      throw new Error('PRF output is required and must be at least 32 bytes');
    const base = await subtle.importKey('raw', source(secret), 'HKDF', false, [
      'deriveKey',
    ]);
    return subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: source(salt),
        info: source(new TextEncoder().encode('ssw-vault-wrap-v1')),
      },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }
  if (typeof secret !== 'string' || secret.length < 12)
    throw new Error(
      'A recovery passphrase of at least 12 characters is required',
    );
  const base = await subtle.importKey(
    'raw',
    source(new TextEncoder().encode(secret)),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: source(salt), iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

const encrypt = async (
  key: CryptoKey,
  plaintext: Uint8Array,
  iv: Uint8Array,
  associatedData?: Uint8Array,
): Promise<string> =>
  b64(
    asBytes(
      await webCrypto().subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: source(iv),
          ...(associatedData ? { additionalData: source(associatedData) } : {}),
        },
        key,
        source(plaintext),
      ),
    ),
  );

const decrypt = async (
  key: CryptoKey,
  ciphertext: string,
  iv: string,
  associatedData?: Uint8Array,
): Promise<Uint8Array> =>
  asBytes(
    await webCrypto().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: source(unb64(iv)),
        ...(associatedData ? { additionalData: source(associatedData) } : {}),
      },
      key,
      source(unb64(ciphertext)),
    ),
  );

export async function createVaultEnvelope(
  plaintext: Uint8Array,
  options: EnvelopeOptions,
): Promise<VaultEnvelope> {
  if (options.strategy === 'prf' && !options.prfOutput)
    throw new Error(
      'PRF strategy requires an explicit PRF output; no silent downgrade',
    );
  if (options.strategy === 'passphrase' && !options.passphrase)
    throw new Error('Passphrase strategy requires an explicit recovery factor');
  const iterations =
    options.strategy === 'passphrase'
      ? boundedIterations(options.iterations)
      : undefined;
  const salt = random(SALT_BYTES, options.randomBytes);
  const dekBytes = random(AES_KEY_BYTES, options.randomBytes);
  const wrappingKey = await deriveWrappingKey(
    options.strategy,
    options.strategy === 'prf' ? options.prfOutput! : options.passphrase!,
    salt,
    iterations ?? 0,
  );
  const dek = await importAesKey(dekBytes, ['encrypt', 'decrypt']);
  const wrappedIv = random(IV_BYTES, options.randomBytes);
  const payloadIv = random(IV_BYTES, options.randomBytes);
  return {
    version: VAULT_ENVELOPE_VERSION,
    algorithm: 'AES-GCM-256',
    strategy: options.strategy,
    kdf: {
      name: options.strategy === 'prf' ? 'HKDF-SHA-256' : 'PBKDF2-SHA-256',
      salt: b64(salt),
      ...(iterations ? { iterations } : {}),
    },
    wrappedDek: {
      iv: b64(wrappedIv),
      ciphertext: await encrypt(wrappingKey, dekBytes, wrappedIv),
    },
    payload: {
      iv: b64(payloadIv),
      ciphertext: await encrypt(
        dek,
        plaintext,
        payloadIv,
        options.associatedData,
      ),
    },
    ...(options.associatedData ? { aad: b64(options.associatedData) } : {}),
  };
}

export async function openVaultEnvelope(
  envelope: VaultEnvelope,
  secret: Uint8Array | string,
): Promise<Uint8Array> {
  if (
    envelope.version !== VAULT_ENVELOPE_VERSION ||
    envelope.algorithm !== 'AES-GCM-256'
  )
    throw new Error('Unsupported or corrupt vault envelope version');
  const iterations =
    envelope.strategy === 'passphrase'
      ? boundedIterations(envelope.kdf.iterations)
      : 0;
  const wrappingKey = await deriveWrappingKey(
    envelope.strategy,
    secret,
    unb64(envelope.kdf.salt),
    iterations,
  );
  const dekBytes = await decrypt(
    wrappingKey,
    envelope.wrappedDek.ciphertext,
    envelope.wrappedDek.iv,
  );
  if (dekBytes.length !== AES_KEY_BYTES)
    throw new Error('Invalid wrapped vault key length');
  const dek = await importAesKey(dekBytes, ['decrypt']);
  return decrypt(
    dek,
    envelope.payload.ciphertext,
    envelope.payload.iv,
    envelope.aad ? unb64(envelope.aad) : undefined,
  );
}

export async function migrateVaultEnvelope(
  envelope: VaultEnvelope,
  currentSecret: Uint8Array | string,
  next: EnvelopeOptions,
): Promise<VaultEnvelope> {
  return createVaultEnvelope(
    await openVaultEnvelope(envelope, currentSecret),
    next,
  );
}

export async function detectWebAuthnPrfCapability(
  scope: {
    PublicKeyCredential?: {
      getClientCapabilities?: () => Promise<Record<string, boolean>>;
    };
  } = globalThis,
): Promise<PrfCapability> {
  const method = scope.PublicKeyCredential?.getClientCapabilities;
  if (!method) return { supported: false, reason: 'missing-api' };
  try {
    const capabilities = await method();
    return capabilities.prf === true
      ? { supported: true, reason: 'available' }
      : { supported: false, reason: 'unsupported' };
  } catch {
    return { supported: false, reason: 'unsupported' };
  }
}

export function requirePrfCapability(capability: PrfCapability): void {
  if (!capability.supported)
    throw new Error(
      `WebAuthn PRF unavailable (${capability.reason}); choose explicit recovery passphrase strategy`,
    );
}

export interface VaultPort {
  readonly kind: 'credential-vault';
}
export const vaultPort: VaultPort = { kind: 'credential-vault' };

/** Deliberately bounded index: these fields are useful for UX and contain no credential claims. */
export interface VaultIndexMetadata {
  readonly id: string;
  readonly credentialType: string;
  readonly issuer: string;
  readonly issuedAt?: string;
  readonly expiresAt?: string;
}

export interface VaultEntry extends VaultIndexMetadata {
  readonly envelope: VaultEnvelope;
}

export const VAULT_BACKUP_VERSION = 1 as const;
export interface VaultBackupEnvelope extends VaultEnvelope {
  readonly backupVersion: typeof VAULT_BACKUP_VERSION;
  readonly kind: 'ssw-credential-vault-backup';
  readonly sequence: number;
  readonly createdAt: string;
}

type BackupPayload = { readonly entries: readonly VaultEntry[] };
const backupAad = (sequence: number, createdAt: string): Uint8Array =>
  new TextEncoder().encode(
    JSON.stringify({
      kind: 'ssw-credential-vault-backup',
      backupVersion: VAULT_BACKUP_VERSION,
      sequence,
      createdAt,
    }),
  );
const isVaultEntry = (value: unknown): value is VaultEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<VaultEntry> & { credential?: unknown };
  return (
    !('credential' in entry) &&
    typeof entry.id === 'string' &&
    typeof entry.credentialType === 'string' &&
    typeof entry.issuer === 'string' &&
    !!entry.envelope &&
    entry.envelope.version === VAULT_ENVELOPE_VERSION &&
    entry.envelope.algorithm === 'AES-GCM-256'
  );
};

/** Export only already-encrypted records; plaintext credentials and keys never enter the backup payload. */
export async function createVaultBackup(
  entries: readonly VaultEntry[],
  options: EnvelopeOptions & {
    readonly sequence: number;
    readonly createdAt?: string;
  },
): Promise<VaultBackupEnvelope> {
  if (!Number.isSafeInteger(options.sequence) || options.sequence < 1)
    throw new Error('backup sequence must be a positive integer');
  const createdAt = options.createdAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(createdAt)))
    throw new Error('invalid backup timestamp');
  if (!entries.every(isVaultEntry))
    throw new Error('backup entries must contain encrypted envelopes');
  const outer = await createVaultEnvelope(
    new TextEncoder().encode(
      JSON.stringify({ entries } satisfies BackupPayload),
    ),
    { ...options, associatedData: backupAad(options.sequence, createdAt) },
  );
  return {
    ...outer,
    backupVersion: VAULT_BACKUP_VERSION,
    kind: 'ssw-credential-vault-backup',
    sequence: options.sequence,
    createdAt,
  };
}

export async function openVaultBackup(
  envelope: VaultBackupEnvelope,
  secret: Uint8Array | string,
  options: { readonly minimumSequence?: number } = {},
): Promise<{
  sequence: number;
  createdAt: string;
  entries: readonly VaultEntry[];
}> {
  if (
    envelope.kind !== 'ssw-credential-vault-backup' ||
    envelope.backupVersion !== VAULT_BACKUP_VERSION ||
    !Number.isSafeInteger(envelope.sequence) ||
    envelope.sequence < 1
  )
    throw new Error('Unsupported or corrupt vault backup version');
  if (
    options.minimumSequence !== undefined &&
    envelope.sequence < options.minimumSequence
  )
    throw new Error('Vault backup rollback detected');
  const bytes = await openVaultEnvelope(envelope, secret);
  if (envelope.aad !== b64(backupAad(envelope.sequence, envelope.createdAt)))
    throw new Error('Vault backup integrity metadata mismatch');
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('Vault backup payload is corrupt');
  }
  const entries = (payload as BackupPayload)?.entries;
  if (!Array.isArray(entries) || !entries.every(isVaultEntry))
    throw new Error('Vault backup payload is corrupt');
  return {
    sequence: envelope.sequence,
    createdAt: envelope.createdAt,
    entries: entries.map(clone),
  };
}

export type VaultStoreErrorKind = 'recoverable' | 'terminal';
export class VaultStoreError extends Error {
  readonly kind: VaultStoreErrorKind;
  constructor(
    kind: VaultStoreErrorKind,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'VaultStoreError';
    this.kind = kind;
  }
}

const metadataBytes = (metadata: VaultIndexMetadata): Uint8Array =>
  new TextEncoder().encode(JSON.stringify(metadata));
const metadataMatches = (
  metadata: VaultIndexMetadata,
  envelope: VaultEnvelope,
): boolean => envelope.aad === b64(metadataBytes(metadata));
const entryMetadata = (entry: VaultEntry): VaultIndexMetadata => ({
  id: entry.id,
  credentialType: entry.credentialType,
  issuer: entry.issuer,
  ...(entry.issuedAt ? { issuedAt: entry.issuedAt } : {}),
  ...(entry.expiresAt ? { expiresAt: entry.expiresAt } : {}),
});
const credentialBytes = (credential: unknown): Uint8Array =>
  new TextEncoder().encode(JSON.stringify(credential));
const parseCredential = (bytes: Uint8Array): unknown =>
  JSON.parse(new TextDecoder().decode(bytes));
const clone = <T>(value: T): T => structuredClone(value);

export interface CredentialVaultStore {
  put(
    metadata: VaultIndexMetadata,
    credential: unknown,
    options: EnvelopeOptions,
  ): Promise<void>;
  get(
    id: string,
    secret: Uint8Array | string,
  ): Promise<{ metadata: VaultIndexMetadata; credential: unknown }>;
  list(): Promise<readonly VaultIndexMetadata[]>;
  delete(id: string): Promise<void>;
  migrate(
    id: string,
    currentSecret: Uint8Array | string,
    next: EnvelopeOptions,
  ): Promise<void>;
  exportBackup(
    options: EnvelopeOptions & {
      readonly sequence: number;
      readonly createdAt?: string;
    },
  ): Promise<VaultBackupEnvelope>;
  restoreBackup(
    envelope: VaultBackupEnvelope,
    secret: Uint8Array | string,
    options?: { readonly minimumSequence?: number },
  ): Promise<void>;
}

/** In-memory adapter used by deterministic tests and non-browser runtimes. */
export class InMemoryVaultStore implements CredentialVaultStore {
  private readonly entries = new Map<string, VaultEntry>();
  async put(
    metadata: VaultIndexMetadata,
    credential: unknown,
    options: EnvelopeOptions,
  ): Promise<void> {
    if (!metadata.id || !metadata.credentialType || !metadata.issuer)
      throw new VaultStoreError('terminal', 'Invalid vault metadata');
    const envelope = await createVaultEnvelope(credentialBytes(credential), {
      ...options,
      associatedData: metadataBytes(metadata),
    });
    this.entries.set(metadata.id, { ...clone(metadata), envelope });
  }
  async get(
    id: string,
    secret: Uint8Array | string,
  ): Promise<{ metadata: VaultIndexMetadata; credential: unknown }> {
    const entry = this.entries.get(id);
    if (!entry)
      throw new VaultStoreError('recoverable', 'Vault entry not found');
    try {
      if (!metadataMatches(entryMetadata(entry), entry.envelope))
        throw new Error('metadata authentication failed');
      const bytes = await openVaultEnvelope(entry.envelope, secret);
      return {
        metadata: clone(entryMetadata(entry)),
        credential: parseCredential(bytes),
      };
    } catch {
      throw new VaultStoreError(
        'recoverable',
        'Vault entry is corrupt or cannot be opened',
      );
    }
  }
  async list(): Promise<readonly VaultIndexMetadata[]> {
    return [...this.entries.values()].map(
      ({ envelope: _envelope, ...metadata }) => clone(metadata),
    );
  }
  async delete(id: string): Promise<void> {
    this.entries.delete(id);
  }
  async migrate(
    id: string,
    currentSecret: Uint8Array | string,
    next: EnvelopeOptions,
  ): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry)
      throw new VaultStoreError('recoverable', 'Vault entry not found');
    try {
      if (!metadataMatches(entryMetadata(entry), entry.envelope))
        throw new Error('metadata authentication failed');
      const plaintext = await openVaultEnvelope(entry.envelope, currentSecret);
      const envelope = await createVaultEnvelope(plaintext, {
        ...next,
        associatedData: metadataBytes(entryMetadata(entry)),
      });
      this.entries.set(id, { ...entry, envelope });
    } catch {
      throw new VaultStoreError(
        'recoverable',
        'Vault migration failed; previous entry retained',
      );
    }
  }
  async exportBackup(
    options: EnvelopeOptions & {
      readonly sequence: number;
      readonly createdAt?: string;
    },
  ): Promise<VaultBackupEnvelope> {
    return createVaultBackup([...this.entries.values()].map(clone), options);
  }
  async restoreBackup(
    envelope: VaultBackupEnvelope,
    secret: Uint8Array | string,
    options: { readonly minimumSequence?: number } = {},
  ): Promise<void> {
    const backup = await openVaultBackup(envelope, secret, options);
    const next = new Map(
      backup.entries.map((entry) => [entry.id, clone(entry)] as const),
    );
    this.entries.clear();
    for (const [id, entry] of next) this.entries.set(id, entry);
  }
}

/** IndexedDB adapter. A single object store makes put/migrate atomic with metadata. */
export class IndexedDbVaultStore implements CredentialVaultStore {
  private readonly factory: IDBFactory;
  private readonly dbName: string;
  constructor(
    factory: IDBFactory = globalThis.indexedDB,
    dbName = 'ssw-credential-vault',
  ) {
    if (!factory)
      throw new VaultStoreError('terminal', 'IndexedDB unavailable');
    this.factory = factory;
    this.dbName = dbName;
  }
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = this.factory.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('entries'))
          request.result.createObjectStore('entries', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  private async tx<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest | void,
  ): Promise<T | void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('entries', mode);
      let result: unknown;
      try {
        const request = fn(transaction.objectStore('entries'));
        if (request)
          request.onsuccess = () => {
            result = request.result;
          };
      } catch (error) {
        reject(error);
        return;
      }
      transaction.oncomplete = () => {
        db.close();
        resolve(result as T);
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    });
  }
  async put(
    metadata: VaultIndexMetadata,
    credential: unknown,
    options: EnvelopeOptions,
  ): Promise<void> {
    const envelope = await createVaultEnvelope(credentialBytes(credential), {
      ...options,
      associatedData: metadataBytes(metadata),
    });
    await this.tx('readwrite', (store) => store.put({ ...metadata, envelope }));
  }
  async get(
    id: string,
    secret: Uint8Array | string,
  ): Promise<{ metadata: VaultIndexMetadata; credential: unknown }> {
    const entry = await this.tx<VaultEntry>('readonly', (store) =>
      store.get(id),
    );
    if (!entry)
      throw new VaultStoreError('recoverable', 'Vault entry not found');
    try {
      const metadata = entryMetadata(entry);
      if (!metadataMatches(metadata, entry.envelope))
        throw new Error('metadata authentication failed');
      return {
        metadata,
        credential: parseCredential(
          await openVaultEnvelope(entry.envelope, secret),
        ),
      };
    } catch {
      throw new VaultStoreError(
        'recoverable',
        'Vault entry is corrupt or cannot be opened',
      );
    }
  }
  async list(): Promise<readonly VaultIndexMetadata[]> {
    const entries = (await this.tx<VaultEntry[]>('readonly', (store) =>
      store.getAll(),
    )) as VaultEntry[];
    return entries.map(
      ({ id, credentialType, issuer, issuedAt, expiresAt }) => ({
        id,
        credentialType,
        issuer,
        ...(issuedAt ? { issuedAt } : {}),
        ...(expiresAt ? { expiresAt } : {}),
      }),
    );
  }
  async delete(id: string): Promise<void> {
    await this.tx('readwrite', (store) => store.delete(id));
  }
  async migrate(
    id: string,
    currentSecret: Uint8Array | string,
    next: EnvelopeOptions,
  ): Promise<void> {
    const entry = await this.tx<VaultEntry>('readonly', (store) =>
      store.get(id),
    );
    if (!entry)
      throw new VaultStoreError('recoverable', 'Vault entry not found');
    try {
      const metadata = entryMetadata(entry);
      if (!metadataMatches(metadata, entry.envelope))
        throw new Error('metadata authentication failed');
      const plaintext = await openVaultEnvelope(entry.envelope, currentSecret);
      const envelope = await createVaultEnvelope(plaintext, {
        ...next,
        associatedData: metadataBytes(metadata),
      });
      await this.tx('readwrite', (store) => store.put({ ...entry, envelope }));
    } catch {
      throw new VaultStoreError(
        'recoverable',
        'Vault migration failed; previous entry retained',
      );
    }
  }
  async exportBackup(
    options: EnvelopeOptions & {
      readonly sequence: number;
      readonly createdAt?: string;
    },
  ): Promise<VaultBackupEnvelope> {
    const entries = (await this.tx<VaultEntry[]>('readonly', (store) =>
      store.getAll(),
    )) as VaultEntry[];
    return createVaultBackup(entries, options);
  }
  async restoreBackup(
    envelope: VaultBackupEnvelope,
    secret: Uint8Array | string,
    options: { readonly minimumSequence?: number } = {},
  ): Promise<void> {
    const backup = await openVaultBackup(envelope, secret, options);
    await this.tx('readwrite', (store) => {
      store.clear();
      for (const entry of backup.entries) store.put(entry);
    });
  }
}

/** Small dependency-free fake used in migration/transaction tests. */
export class FakeIndexedDbVaultStore extends InMemoryVaultStore {}
