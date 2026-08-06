import {
  createVaultEnvelope,
  openVaultEnvelope,
  type EnvelopeOptions,
  type VaultEnvelope,
} from '@ssw/credential-vault';
import { serializeCanonical } from '@ssw/platform-types';

export const PORTABILITY_FORMAT = 'ssw-wallet-migration' as const;
export const PORTABILITY_VERSION = 1 as const;
export const PORTABILITY_ALGORITHM = 'AES-GCM-256' as const;
const MAX_BUNDLE_BYTES = 2_000_000;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const HEX = /^0x(?:[0-9a-fA-F]{2})*$/u;

export type PortableAsset = {
  readonly kind: 'native' | 'erc20' | 'erc721' | 'erc1155';
  readonly address?: `0x${string}`;
  readonly tokenId?: string;
  readonly balance?: string;
};

/** Public account/control state. It deliberately has no private keys or raw credentials. */
export type PortableWalletState = {
  readonly wallet: {
    readonly address: `0x${string}`;
    readonly chainId: number;
    readonly did?: string;
    readonly locator?: string;
  };
  readonly control: {
    readonly recoveryAvailable: boolean;
    readonly signers: readonly {
      readonly id: string;
      readonly kind: 'passkey' | 'recovery' | 'operational';
      readonly publicKey?: `0x${string}`;
    }[];
    readonly modules: readonly {
      readonly address: `0x${string}`;
      readonly type: string;
      readonly version: string;
      readonly codeHash: `0x${string}`;
    }[];
  };
  readonly assets: readonly PortableAsset[];
  readonly history?: {
    readonly cursor?: string;
    readonly digest?: `0x${string}`;
  };
  /** A vault backup is already encrypted and is encrypted again by this bundle. */
  readonly vaultBackup?: unknown;
};

export type BundleHeader = {
  readonly format: typeof PORTABILITY_FORMAT;
  readonly version: typeof PORTABILITY_VERSION;
  readonly bundleId: string;
  readonly keyId: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly walletAddress: `0x${string}`;
  readonly chainId: number;
  readonly encryption: {
    readonly algorithm: typeof PORTABILITY_ALGORITHM;
    readonly strategy: EnvelopeOptions['strategy'];
  };
};

export type MigrationBundle = BundleHeader & {
  readonly envelope: VaultEnvelope;
  readonly signature: `0x${string}`;
};

export type SignaturePort = {
  readonly keyId: string;
  sign(input: Uint8Array): Promise<Uint8Array>;
  verify(
    input: Uint8Array,
    signature: Uint8Array,
    keyId: string,
  ): Promise<boolean>;
};

export type UserAuthorizationPort = {
  authorize(
    action: 'wallet-export' | 'wallet-import' | 'vendor-rotation',
  ): Promise<void>;
};

export type WalletSnapshotPort = {
  snapshot(): Promise<PortableWalletState>;
};

export type RotationCapability = {
  readonly portable: boolean;
  readonly reason?: string;
  readonly recoveryAvailable: boolean;
  readonly account: `0x${string}`;
  readonly chainId: number;
  readonly did?: string;
  readonly assetsDigest: `0x${string}`;
  readonly historyDigest: `0x${string}`;
};

export type RotationPort = {
  inspect(): Promise<RotationCapability>;
  installNextControl(): Promise<void>;
  verifyNextControl(): Promise<boolean>;
  removeOldControl(): Promise<void>;
  rollbackNextControl(): Promise<void>;
  snapshot(): Promise<PortableWalletState>;
};

export type RotationResult = {
  readonly status: 'rotated';
  readonly account: `0x${string}`;
  readonly did?: string;
  readonly oldControlRemoved: true;
};

export type ImportPort = {
  prepare(state: PortableWalletState): Promise<unknown>;
  commit(handle: unknown): Promise<void>;
  verify(handle: unknown, state: PortableWalletState): Promise<boolean>;
  rollback(handle: unknown): Promise<void>;
};

export class PortabilityError extends Error {
  constructor(
    readonly code:
      | 'INVALID_BUNDLE'
      | 'UNSUPPORTED_VERSION'
      | 'BUNDLE_EXPIRED'
      | 'SIGNATURE_INVALID'
      | 'DECRYPTION_FAILED'
      | 'AUTHORIZATION_REQUIRED'
      | 'ROTATION_UNSUPPORTED'
      | 'ROTATION_FAILED'
      | 'IMPORT_FAILED'
      | 'ROLLBACK_FAILED',
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'PortabilityError';
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const toBytes = (value: string): Uint8Array => encoder.encode(value);
const b64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
};
const hex = (bytes: Uint8Array): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const fromHex = (value: string): Uint8Array => {
  const raw = value.slice(2);
  if (raw.length % 2 !== 0 || !/^[0-9a-f]+$/u.test(raw))
    throw new PortabilityError('INVALID_BUNDLE', 'invalid signature encoding');
  return Uint8Array.from({ length: raw.length / 2 }, (_, index) =>
    Number.parseInt(raw.slice(index * 2, index * 2 + 2), 16),
  );
};
const assertString = (value: unknown, field: string, max = 256): string => {
  if (typeof value !== 'string' || value.length === 0 || value.length > max)
    throw new PortabilityError('INVALID_BUNDLE', `${field} is invalid`);
  return value;
};
const assertAddress = (value: unknown, field: string): `0x${string}` => {
  if (
    typeof value !== 'string' ||
    !ADDRESS.test(value) ||
    /^0x0+$/u.test(value)
  )
    throw new PortabilityError('INVALID_BUNDLE', `${field} is invalid`);
  return value.toLowerCase() as `0x${string}`;
};
const assertHex = (value: unknown, field: string): `0x${string}` => {
  if (typeof value !== 'string' || !HEX.test(value) || value.length > 131074)
    throw new PortabilityError('INVALID_BUNDLE', `${field} is invalid`);
  return value.toLowerCase() as `0x${string}`;
};
const assertDate = (value: unknown, field: string): string => {
  const result = assertString(value, field, 64);
  if (Number.isNaN(Date.parse(result)))
    throw new PortabilityError('INVALID_BUNDLE', `${field} is invalid`);
  return result;
};
const assertId = (value: unknown, field: string): string => {
  const result = assertString(value, field, 128);
  if (!/^[A-Za-z0-9._:-]+$/u.test(result))
    throw new PortabilityError('INVALID_BUNDLE', `${field} is invalid`);
  return result;
};
const clone = <T>(value: T): T => structuredClone(value);
const SECRET_FIELD =
  /(private.?key|secret|password|passphrase|mnemonic|seed|recovery.?material|raw.?credential|plaintext.?key)/iu;
const assertNoSecretMaterial = (value: unknown, depth = 0): void => {
  if (depth > 8)
    throw new PortabilityError(
      'INVALID_BUNDLE',
      'wallet state nesting limit exceeded',
    );
  if (Array.isArray(value)) {
    for (const item of value) assertNoSecretMaterial(item, depth + 1);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_FIELD.test(key))
      throw new PortabilityError(
        'INVALID_BUNDLE',
        'plaintext secret material is not portable',
      );
    assertNoSecretMaterial(child, depth + 1);
  }
};
const assertKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void => {
  for (const key of Object.keys(value))
    if (!allowed.includes(key))
      throw new PortabilityError(
        'INVALID_BUNDLE',
        `unknown ${label} field: ${key}`,
      );
};

function validateState(state: PortableWalletState): PortableWalletState {
  if (!state || typeof state !== 'object')
    throw new PortabilityError('INVALID_BUNDLE', 'wallet state is invalid');
  assertNoSecretMaterial(state);
  const wallet = state.wallet;
  if (!wallet || typeof wallet !== 'object')
    throw new PortabilityError('INVALID_BUNDLE', 'wallet state is invalid');
  assertKeys(
    state as unknown as Record<string, unknown>,
    ['wallet', 'control', 'assets', 'history', 'vaultBackup'],
    'wallet state',
  );
  assertKeys(
    wallet as unknown as Record<string, unknown>,
    ['address', 'chainId', 'did', 'locator'],
    'wallet',
  );
  const chainId = wallet?.chainId;
  if (!Number.isSafeInteger(chainId) || chainId < 1)
    throw new PortabilityError('INVALID_BUNDLE', 'wallet chain is invalid');
  assertAddress(wallet.address, 'wallet address');
  if (wallet.did !== undefined) assertString(wallet.did, 'wallet did');
  if (wallet.locator !== undefined)
    assertString(wallet.locator, 'wallet locator', 256);
  if (
    !state.control ||
    typeof state.control.recoveryAvailable !== 'boolean' ||
    !Array.isArray(state.control.signers) ||
    !Array.isArray(state.control.modules)
  )
    throw new PortabilityError(
      'INVALID_BUNDLE',
      'wallet control state is invalid',
    );
  assertKeys(
    state.control as unknown as Record<string, unknown>,
    ['recoveryAvailable', 'signers', 'modules'],
    'control',
  );
  for (const signer of state.control.signers) {
    assertKeys(
      signer as unknown as Record<string, unknown>,
      ['id', 'kind', 'publicKey'],
      'signer',
    );
    assertId(signer.id, 'signer id');
    if (!['passkey', 'recovery', 'operational'].includes(signer.kind))
      throw new PortabilityError('INVALID_BUNDLE', 'signer kind is invalid');
    if (signer.publicKey !== undefined)
      assertHex(signer.publicKey, 'signer public key');
  }
  for (const module of state.control.modules) {
    assertKeys(
      module as unknown as Record<string, unknown>,
      ['address', 'type', 'version', 'codeHash'],
      'module',
    );
    assertAddress(module.address, 'module address');
    assertString(module.type, 'module type', 64);
    assertString(module.version, 'module version', 128);
    assertHex(module.codeHash, 'module code hash');
  }
  if (!Array.isArray(state.assets))
    throw new PortabilityError('INVALID_BUNDLE', 'asset inventory is invalid');
  for (const asset of state.assets) {
    assertKeys(
      asset as unknown as Record<string, unknown>,
      ['kind', 'address', 'tokenId', 'balance'],
      'asset',
    );
    if (!['native', 'erc20', 'erc721', 'erc1155'].includes(asset.kind))
      throw new PortabilityError('INVALID_BUNDLE', 'asset kind is invalid');
    if (asset.kind !== 'native') assertAddress(asset.address, 'asset address');
    if (asset.tokenId !== undefined)
      assertString(asset.tokenId, 'asset token id', 128);
    if (asset.balance !== undefined)
      assertString(asset.balance, 'asset balance', 80);
  }
  if (state.history !== undefined) {
    assertKeys(
      state.history as unknown as Record<string, unknown>,
      ['cursor', 'digest'],
      'history',
    );
    if (state.history.cursor !== undefined)
      assertString(state.history.cursor, 'history cursor', 256);
    if (state.history.digest !== undefined)
      assertHex(state.history.digest, 'history digest');
  }
  return clone(state);
}

const unsignedBytes = (
  bundle: Omit<MigrationBundle, 'signature'>,
): Uint8Array => toBytes(serializeCanonical(bundle));

function parseBundle(value: unknown): MigrationBundle {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new PortabilityError('INVALID_BUNDLE', 'bundle must be an object');
  const input = value as Record<string, unknown>;
  const required = [
    'format',
    'version',
    'bundleId',
    'keyId',
    'issuedAt',
    'expiresAt',
    'walletAddress',
    'chainId',
    'encryption',
    'envelope',
    'signature',
  ];
  for (const key of Object.keys(input))
    if (!required.includes(key))
      throw new PortabilityError(
        'INVALID_BUNDLE',
        `unknown bundle field: ${key}`,
      );
  if (input.format !== PORTABILITY_FORMAT)
    throw new PortabilityError('INVALID_BUNDLE', 'unknown portability format');
  if (input.version !== PORTABILITY_VERSION)
    throw new PortabilityError(
      'UNSUPPORTED_VERSION',
      'unsupported mandatory portability version',
    );
  const encryption = input.encryption as Record<string, unknown>;
  if (
    !encryption ||
    encryption.algorithm !== PORTABILITY_ALGORITHM ||
    !['prf', 'passphrase'].includes(String(encryption.strategy))
  )
    throw new PortabilityError(
      'INVALID_BUNDLE',
      'unsupported encryption parameters',
    );
  const envelope = input.envelope as VaultEnvelope;
  if (
    !envelope ||
    envelope.version !== 1 ||
    envelope.algorithm !== PORTABILITY_ALGORITHM
  )
    throw new PortabilityError(
      'UNSUPPORTED_VERSION',
      'unsupported encrypted envelope version',
    );
  if (envelope.strategy !== encryption.strategy)
    throw new PortabilityError(
      'INVALID_BUNDLE',
      'envelope strategy does not match bundle header',
    );
  return {
    format: PORTABILITY_FORMAT,
    version: PORTABILITY_VERSION,
    bundleId: assertId(input.bundleId, 'bundle id'),
    keyId: assertId(input.keyId, 'key id'),
    issuedAt: assertDate(input.issuedAt, 'issued at'),
    expiresAt: assertDate(input.expiresAt, 'expires at'),
    walletAddress: assertAddress(input.walletAddress, 'wallet address'),
    chainId:
      Number.isSafeInteger(input.chainId) && (input.chainId as number) > 0
        ? (input.chainId as number)
        : (() => {
            throw new PortabilityError('INVALID_BUNDLE', 'chain id is invalid');
          })(),
    encryption: {
      algorithm: PORTABILITY_ALGORITHM,
      strategy: encryption.strategy as EnvelopeOptions['strategy'],
    },
    envelope: clone(envelope),
    signature: assertHex(input.signature, 'signature'),
  };
}

export function inspectMigrationBundle(input: unknown): BundleHeader {
  const bundle = parseBundle(input);
  return {
    format: bundle.format,
    version: bundle.version,
    bundleId: bundle.bundleId,
    keyId: bundle.keyId,
    issuedAt: bundle.issuedAt,
    expiresAt: bundle.expiresAt,
    walletAddress: bundle.walletAddress,
    chainId: bundle.chainId,
    encryption: bundle.encryption,
  };
}

export async function exportMigrationBundle(input: {
  readonly state: PortableWalletState;
  readonly authorization: UserAuthorizationPort;
  readonly signer: SignaturePort;
  readonly encryption: EnvelopeOptions;
  readonly bundleId: string;
  readonly expiresAt: string;
  readonly now?: () => Date;
}): Promise<MigrationBundle> {
  try {
    await input.authorization.authorize('wallet-export');
  } catch (error) {
    throw new PortabilityError(
      'AUTHORIZATION_REQUIRED',
      'wallet export was not authorized',
      { cause: error },
    );
  }
  const state = validateState(input.state);
  const now = (input.now ?? (() => new Date()))().toISOString();
  const expiresAt = assertDate(input.expiresAt, 'expires at');
  if (Date.parse(expiresAt) <= Date.parse(now))
    throw new PortabilityError(
      'BUNDLE_EXPIRED',
      'bundle expiry must be in the future',
    );
  const bundleId = assertId(input.bundleId, 'bundle id');
  const keyId = assertId(input.signer.keyId, 'signer key id');
  const header: BundleHeader = {
    format: PORTABILITY_FORMAT,
    version: PORTABILITY_VERSION,
    bundleId,
    keyId,
    issuedAt: now,
    expiresAt,
    walletAddress: state.wallet.address,
    chainId: state.wallet.chainId,
    encryption: {
      algorithm: PORTABILITY_ALGORITHM,
      strategy: input.encryption.strategy,
    },
  };
  const aad = toBytes(serializeCanonical(header));
  const envelope = await createVaultEnvelope(
    toBytes(serializeCanonical(state)),
    { ...input.encryption, associatedData: aad },
  );
  const unsigned = { ...header, envelope };
  const signature = await input.signer.sign(unsignedBytes(unsigned));
  if (!(signature instanceof Uint8Array) || signature.length === 0)
    throw new PortabilityError('INVALID_BUNDLE', 'empty bundle signature');
  const result: MigrationBundle = {
    ...unsigned,
    signature: assertHex(`0x${hex(signature)}`, 'signature'),
  };
  if (
    new TextEncoder().encode(serializeCanonical(result)).length >
    MAX_BUNDLE_BYTES
  )
    throw new PortabilityError('INVALID_BUNDLE', 'bundle exceeds size limit');
  return result;
}

export async function openMigrationBundle(input: {
  readonly bundle: unknown;
  readonly authorization: UserAuthorizationPort;
  readonly signer: SignaturePort;
  readonly secret: Uint8Array | string;
  readonly now?: () => Date;
}): Promise<PortableWalletState> {
  const bundle = parseBundle(input.bundle);
  const now = (input.now ?? (() => new Date()))().getTime();
  if (Date.parse(bundle.expiresAt) <= now)
    throw new PortabilityError(
      'BUNDLE_EXPIRED',
      'migration bundle has expired',
    );
  const { signature, ...unsigned } = bundle;
  const valid = await input.signer.verify(
    unsignedBytes(unsigned),
    fromHex(signature),
    bundle.keyId,
  );
  if (!valid)
    throw new PortabilityError(
      'SIGNATURE_INVALID',
      'migration bundle signature is invalid',
    );
  try {
    await input.authorization.authorize('wallet-import');
  } catch (error) {
    throw new PortabilityError(
      'AUTHORIZATION_REQUIRED',
      'wallet import was not authorized',
      { cause: error },
    );
  }
  try {
    const header: BundleHeader = {
      format: bundle.format,
      version: bundle.version,
      bundleId: bundle.bundleId,
      keyId: bundle.keyId,
      issuedAt: bundle.issuedAt,
      expiresAt: bundle.expiresAt,
      walletAddress: bundle.walletAddress,
      chainId: bundle.chainId,
      encryption: bundle.encryption,
    };
    const bytes = await openVaultEnvelope(bundle.envelope, input.secret);
    if (bundle.envelope.aad !== b64(toBytes(serializeCanonical(header))))
      throw new PortabilityError(
        'DECRYPTION_FAILED',
        'bundle authenticated metadata mismatch',
      );
    const state = validateState(JSON.parse(decoder.decode(bytes)));
    if (
      state.wallet.address !== bundle.walletAddress ||
      state.wallet.chainId !== bundle.chainId
    )
      throw new PortabilityError(
        'INVALID_BUNDLE',
        'bundle account binding mismatch',
      );
    return state;
  } catch (error) {
    if (error instanceof PortabilityError) throw error;
    throw new PortabilityError(
      'DECRYPTION_FAILED',
      'migration bundle could not be decrypted',
      { cause: error },
    );
  }
}

export async function importMigrationBundle(input: {
  readonly bundle: unknown;
  readonly authorization: UserAuthorizationPort;
  readonly signer: SignaturePort;
  readonly secret: Uint8Array | string;
  readonly target: ImportPort;
  readonly now?: () => Date;
}): Promise<void> {
  const state = await openMigrationBundle({
    ...input,
    authorization: input.authorization,
    signer: input.signer,
    secret: input.secret,
    now: input.now,
  });
  let handle: unknown;
  try {
    handle = await input.target.prepare(state);
    await input.target.commit(handle);
    if (!(await input.target.verify(handle, state)))
      throw new Error('import verification failed');
  } catch (error) {
    if (handle !== undefined) {
      try {
        await input.target.rollback(handle);
      } catch (rollbackError) {
        throw new PortabilityError(
          'ROLLBACK_FAILED',
          'import failed and rollback failed',
          { cause: rollbackError },
        );
      }
    }
    throw new PortabilityError(
      'IMPORT_FAILED',
      'migration import failed; target was rolled back',
      { cause: error },
    );
  }
}

export async function rotateVendor(input: {
  readonly authorization: UserAuthorizationPort;
  readonly rotation: RotationPort;
}): Promise<RotationResult> {
  try {
    await input.authorization.authorize('vendor-rotation');
  } catch (error) {
    throw new PortabilityError(
      'AUTHORIZATION_REQUIRED',
      'vendor rotation was not authorized',
      { cause: error },
    );
  }
  const capability = await input.rotation.inspect();
  if (!capability.portable || !capability.recoveryAvailable)
    throw new PortabilityError(
      'ROTATION_UNSUPPORTED',
      capability.reason ?? 'account modules do not support safe rotation',
    );
  let installed = false;
  try {
    await input.rotation.installNextControl();
    installed = true;
    if (!(await input.rotation.verifyNextControl()))
      throw new Error('new control path did not verify');
    const after = await input.rotation.snapshot();
    if (
      after.wallet.address !== capability.account ||
      after.wallet.chainId !== capability.chainId ||
      after.wallet.did !== capability.did
    )
      throw new Error('rotation changed stable account identity');
    await input.rotation.removeOldControl();
    return {
      status: 'rotated',
      account: capability.account,
      ...(capability.did ? { did: capability.did } : {}),
      oldControlRemoved: true,
    };
  } catch (error) {
    if (installed) {
      try {
        await input.rotation.rollbackNextControl();
      } catch (rollbackError) {
        throw new PortabilityError(
          'ROLLBACK_FAILED',
          'rotation failed and recovery rollback failed; old control remains authoritative',
          { cause: rollbackError },
        );
      }
    }
    throw new PortabilityError(
      'ROTATION_FAILED',
      'vendor rotation failed; old control remains authoritative',
      { cause: error },
    );
  }
}
