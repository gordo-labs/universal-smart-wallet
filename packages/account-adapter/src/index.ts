export const adapterName = 'account-adapter';

export const ENTRY_POINT_V08 =
  '0x4337084d9e255ff0702461cf8895ce9e3b5ff108' as const;

export type AccountDeployment = {
  chainId: number;
  account: `0x${string}`;
  accountCodeHash: `0x${string}`;
  entryPoint: `0x${string}`;
  entryPointVersion: '0.8.0';
};

/** Validate deployment metadata before an adapter trusts an address. */
export function assertDeployment(deployment: AccountDeployment): void {
  if (!Number.isSafeInteger(deployment.chainId) || deployment.chainId <= 0) {
    throw new Error('invalid chain id');
  }
  if (
    !/^0x[0-9a-fA-F]{40}$/.test(deployment.account) ||
    /^0x0+$/.test(deployment.account)
  ) {
    throw new Error('account address is required');
  }
  if (
    !/^0x[0-9a-fA-F]{64}$/.test(deployment.accountCodeHash) ||
    /^0x0+$/.test(deployment.accountCodeHash)
  ) {
    throw new Error('account code hash is required');
  }
  if (deployment.entryPoint.toLowerCase() !== ENTRY_POINT_V08) {
    throw new Error('incompatible EntryPoint 0.8 deployment');
  }
  if (deployment.entryPointVersion !== '0.8.0') {
    throw new Error('unsupported EntryPoint version');
  }
}

export const selectedBase = {
  name: 'Safe smart account',
  package: '@safe-global/protocol-kit',
  version: '8.0.4',
  license: 'MIT',
  supports: ['ERC-1271', 'ERC-4337', 'passkey signer path'] as const,
};

export type PasskeyAssertion = {
  /** WebAuthn clientDataJSON supplied by the authenticator/browser. */
  clientDataJSON: Uint8Array;
  /** Authenticator data supplied by the authenticator/browser. */
  authenticatorData: Uint8Array;
  /** P-256 assertion signature supplied by the authenticator/browser. */
  signature: Uint8Array;
  origin: string;
  rpId: string;
  challenge: string;
  account: `0x${string}`;
};

export type P256Verifier = (input: {
  assertion: PasskeyAssertion;
  /** The account digest signed by the passkey. */
  digest: `0x${string}`;
}) => Promise<boolean>;

export function assertPinnedVerifierCodeHash(
  actual: `0x${string}`,
  expected: `0x${string}`,
): void {
  if (!/^0x[0-9a-fA-F]{64}$/.test(actual) || /^0x0+$/.test(actual)) {
    throw new Error('P-256 verifier code hash is required');
  }
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error('P-256 verifier code hash mismatch');
  }
}

export type PasskeySigner = {
  readonly kind: 'webauthn-passkey';
  readonly account: `0x${string}`;
  readonly origin: string;
  readonly rpId: string;
  signDigest(
    digest: `0x${string}`,
    assertion: PasskeyAssertion,
  ): Promise<Uint8Array>;
};

export class PasskeyBoundaryError extends Error {
  constructor(
    readonly code:
      | 'ORIGIN_MISMATCH'
      | 'RP_ID_MISMATCH'
      | 'CHALLENGE_MISMATCH'
      | 'ACCOUNT_MISMATCH'
      | 'EMPTY_SIGNATURE'
      | 'INVALID_SIGNATURE'
      | 'USER_CANCELLED'
      | 'AUTHENTICATOR_UNAVAILABLE',
    message: string,
  ) {
    super(message);
    this.name = 'PasskeyBoundaryError';
  }
}

function assertAssertionContext(
  assertion: PasskeyAssertion,
  expected: Pick<PasskeySigner, 'origin' | 'rpId' | 'account'> & {
    challenge: string;
  },
): void {
  if (assertion.origin !== expected.origin) {
    throw new PasskeyBoundaryError(
      'ORIGIN_MISMATCH',
      'WebAuthn origin does not match the wallet origin',
    );
  }
  if (assertion.rpId !== expected.rpId) {
    throw new PasskeyBoundaryError(
      'RP_ID_MISMATCH',
      'WebAuthn RP ID does not match the configured RP',
    );
  }
  if (assertion.challenge !== expected.challenge) {
    throw new PasskeyBoundaryError(
      'CHALLENGE_MISMATCH',
      'WebAuthn challenge does not match the request',
    );
  }
  if (assertion.account.toLowerCase() !== expected.account.toLowerCase()) {
    throw new PasskeyBoundaryError(
      'ACCOUNT_MISMATCH',
      'WebAuthn assertion targets a different account',
    );
  }
  if (assertion.signature.byteLength === 0) {
    throw new PasskeyBoundaryError(
      'EMPTY_SIGNATURE',
      'WebAuthn assertion did not include a signature',
    );
  }
}

/** Build the narrow boundary used by the account adapter. Private key material is never accepted here. */
export function createPasskeySigner(config: {
  account: `0x${string}`;
  origin: string;
  rpId: string;
  challenge: string;
  verifyP256: P256Verifier;
  verifierCodeHash: `0x${string}`;
  expectedVerifierCodeHash: `0x${string}`;
}): PasskeySigner {
  assertPinnedVerifierCodeHash(
    config.verifierCodeHash,
    config.expectedVerifierCodeHash,
  );
  return {
    kind: 'webauthn-passkey',
    account: config.account,
    origin: config.origin,
    rpId: config.rpId,
    async signDigest(digest, assertion) {
      assertAssertionContext(assertion, config);
      if (!(await config.verifyP256({ assertion, digest }))) {
        throw new PasskeyBoundaryError(
          'INVALID_SIGNATURE',
          'WebAuthn assertion signature was rejected',
        );
      }
      return assertion.signature.slice();
    },
  };
}

/** Convert authenticator cancellation/unavailability to explicit, safe boundary errors. */
export function classifyPasskeyError(error: unknown): PasskeyBoundaryError {
  if (error instanceof PasskeyBoundaryError) return error;
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return new PasskeyBoundaryError(
      'USER_CANCELLED',
      'The user cancelled the passkey ceremony',
    );
  }
  if (error instanceof DOMException && error.name === 'NotSupportedError') {
    return new PasskeyBoundaryError(
      'AUTHENTICATOR_UNAVAILABLE',
      'No compatible passkey authenticator is available',
    );
  }
  return new PasskeyBoundaryError(
    'AUTHENTICATOR_UNAVAILABLE',
    'Passkey authenticator is unavailable',
  );
}

/** Deterministic local account path. Inputs are public metadata only; no credential/private material is persisted. */
export async function deriveDeterministicAccountAddress(input: {
  chainId: number;
  factory: `0x${string}`;
  rpId: string;
  credentialId: string;
}): Promise<`0x${string}`> {
  if (!Number.isSafeInteger(input.chainId) || input.chainId <= 0)
    throw new Error('invalid chain id');
  if (!/^0x[0-9a-fA-F]{40}$/.test(input.factory))
    throw new Error('invalid factory address');
  if (!input.rpId || !input.credentialId)
    throw new Error('rpId and credentialId are required');
  const encoded = new TextEncoder().encode(
    `ssw-local-account-v1|${input.chainId}|${input.factory.toLowerCase()}|${input.rpId}|${input.credentialId}`,
  );
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoded));
  return `0x${Array.from(digest.slice(12), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export type Hex = `0x${string}`;

/** ERC-4337 UserOperation boundary. Bigints stay typed and are serialized by providers. */
export type UserOperation = {
  sender: `0x${string}`;
  nonce: bigint;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  signature: Hex;
  factory?: `0x${string}`;
  factoryData?: Hex;
  paymaster?: `0x${string}`;
  paymasterData?: Hex;
  paymasterVerificationGasLimit?: bigint;
  paymasterPostOpGasLimit?: bigint;
};

export type UserOperationReceipt = {
  userOperationHash: Hex;
  transactionHash: Hex;
  blockNumber: bigint;
  success: boolean;
  entryPoint: `0x${string}`;
  chainId: number;
  sender: `0x${string}`;
};

export type SimulationResult = {
  preVerificationGas?: bigint;
  [key: string]: unknown;
};
export type PaymasterContext = {
  paymaster?: `0x${string}`;
  paymasterData?: Hex;
  [key: string]: unknown;
};

export interface BundlerPort {
  simulateUserOperation(
    operation: UserOperation,
    entryPoint: `0x${string}`,
  ): Promise<SimulationResult>;
  sendUserOperation(
    operation: UserOperation,
    entryPoint: `0x${string}`,
  ): Promise<Hex>;
  getUserOperationReceipt(hash: Hex): Promise<UserOperationReceipt | null>;
}

export interface PaymasterPort {
  sponsorUserOperation(
    operation: UserOperation,
    entryPoint: `0x${string}`,
  ): Promise<PaymasterContext>;
}

export class UserOperationAdapterError extends Error {
  constructor(
    readonly code:
      | 'CONFIG_MISSING'
      | 'CHAIN_MISMATCH'
      | 'ENTRY_POINT_MISMATCH'
      | 'SIMULATION_FAILED'
      | 'PAYMASTER_DENIED'
      | 'BUNDLER_UNAVAILABLE'
      | 'RECEIPT_TIMEOUT',
    message: string,
  ) {
    super(message);
    this.name = 'UserOperationAdapterError';
  }
}

export type Erc4337Config = {
  chainId: number;
  rpcUrl: string;
  bundlerUrl: string;
  entryPoint: `0x${string}`;
  entryPointVersion: '0.8.0';
  account: `0x${string}`;
  accountCodeHash: `0x${string}`;
  paymasterUrl?: string;
};

const requiredEnv = (
  env: Record<string, string | undefined>,
  key: string,
): string => {
  const value = env[key]?.trim();
  if (!value)
    throw new UserOperationAdapterError(
      'CONFIG_MISSING',
      `Missing ${key}; opt-in test skipped`,
    );
  return value;
};

/** Parse only explicitly supplied testnet configuration; no defaults or chain fallback. */
export function parseErc4337Config(
  env: Record<string, string | undefined> = {},
): Erc4337Config | null {
  if (env.SSW_4337_ENABLED !== '1') return null;
  const chainId = Number(requiredEnv(env, 'SSW_4337_CHAIN_ID'));
  const entryPoint = requiredEnv(env, 'SSW_4337_ENTRY_POINT') as `0x${string}`;
  const config: Erc4337Config = {
    chainId,
    rpcUrl: requiredEnv(env, 'SSW_4337_RPC_URL'),
    bundlerUrl: requiredEnv(env, 'SSW_4337_BUNDLER_URL'),
    entryPoint,
    entryPointVersion: '0.8.0',
    account: requiredEnv(env, 'SSW_4337_ACCOUNT') as `0x${string}`,
    accountCodeHash: requiredEnv(
      env,
      'SSW_4337_ACCOUNT_CODE_HASH',
    ) as `0x${string}`,
    ...(env.SSW_4337_PAYMASTER_URL?.trim()
      ? { paymasterUrl: env.SSW_4337_PAYMASTER_URL.trim() }
      : {}),
  };
  if (!Number.isSafeInteger(chainId) || chainId <= 0)
    throw new UserOperationAdapterError(
      'CONFIG_MISSING',
      'SSW_4337_CHAIN_ID must be a positive integer',
    );
  assertDeployment({
    chainId,
    account: config.account,
    accountCodeHash: config.accountCodeHash,
    entryPoint,
    entryPointVersion: '0.8.0',
  });
  return config;
}

export type SubmitOptions = {
  receiptTimeoutMs?: number;
  pollIntervalMs?: number;
};

/** Simulate, optionally sponsor, submit once, and poll a receipt. Submission is never retried. */
export async function submitUserOperation(
  config: Erc4337Config,
  bundler: BundlerPort,
  operation: UserOperation,
  paymaster?: PaymasterPort,
  options: SubmitOptions = {},
): Promise<UserOperationReceipt> {
  assertDeployment({
    chainId: config.chainId,
    account: config.account,
    accountCodeHash: config.accountCodeHash,
    entryPoint: config.entryPoint,
    entryPointVersion: config.entryPointVersion,
  });
  if (operation.sender.toLowerCase() !== config.account.toLowerCase())
    throw new UserOperationAdapterError(
      'CHAIN_MISMATCH',
      'UserOperation sender does not match configured account',
    );
  let simulation: SimulationResult;
  try {
    simulation = await bundler.simulateUserOperation(
      operation,
      config.entryPoint,
    );
  } catch (error) {
    throw new UserOperationAdapterError(
      'SIMULATION_FAILED',
      'UserOperation simulation failed; inspect provider diagnostics without exposing payloads',
    );
  }
  let prepared = operation;
  if (paymaster) {
    try {
      const context = await paymaster.sponsorUserOperation(
        operation,
        config.entryPoint,
      );
      prepared = {
        ...operation,
        ...(context.paymaster ? { paymaster: context.paymaster } : {}),
        ...(context.paymasterData
          ? { paymasterData: context.paymasterData }
          : {}),
      };
    } catch (error) {
      throw new UserOperationAdapterError(
        'PAYMASTER_DENIED',
        'Paymaster declined sponsorship; submit only after explicit user consent',
      );
    }
  }
  if (simulation.preVerificationGas && !prepared.preVerificationGas)
    prepared = {
      ...prepared,
      preVerificationGas: simulation.preVerificationGas,
    };
  let hash: Hex;
  try {
    hash = await bundler.sendUserOperation(prepared, config.entryPoint);
  } catch (error) {
    throw new UserOperationAdapterError(
      'BUNDLER_UNAVAILABLE',
      'Bundler submission failed; operation was not retried to avoid duplicates',
    );
  }
  const timeout = options.receiptTimeoutMs ?? 120_000;
  const interval = options.pollIntervalMs ?? 2_000;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const receipt = await bundler.getUserOperationReceipt(hash);
    if (receipt) {
      if (
        receipt.chainId !== config.chainId ||
        receipt.entryPoint.toLowerCase() !== config.entryPoint.toLowerCase() ||
        receipt.sender.toLowerCase() !== config.account.toLowerCase()
      )
        throw new UserOperationAdapterError(
          'CHAIN_MISMATCH',
          'Receipt does not match configured chain, EntryPoint, or account',
        );
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new UserOperationAdapterError(
    'RECEIPT_TIMEOUT',
    `Timed out waiting for receipt of ${hash}`,
  );
}
