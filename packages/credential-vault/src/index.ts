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
): Promise<string> =>
  b64(
    asBytes(
      await webCrypto().subtle.encrypt(
        { name: 'AES-GCM', iv: source(iv) },
        key,
        source(plaintext),
      ),
    ),
  );

const decrypt = async (
  key: CryptoKey,
  ciphertext: string,
  iv: string,
): Promise<Uint8Array> =>
  asBytes(
    await webCrypto().subtle.decrypt(
      { name: 'AES-GCM', iv: source(unb64(iv)) },
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
      ciphertext: await encrypt(dek, plaintext, payloadIv),
    },
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
  return decrypt(dek, envelope.payload.ciphertext, envelope.payload.iv);
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
