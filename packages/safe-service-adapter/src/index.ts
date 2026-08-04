/** Provider-neutral Safe/ERC-4337 service boundary. No account or crypto is implemented here. */

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

const address = (value: string, field: string): Address => {
  if (!/^0x[0-9a-fA-F]{40}$/u.test(value) || /^0x0+$/u.test(value))
    throw new Error(`${field} must be a non-zero address`);
  return value as Address;
};

const hash = (value: string, field: string): Hex => {
  if (!/^0x[0-9a-fA-F]{64}$/u.test(value) || /^0x0+$/u.test(value))
    throw new Error(`${field} must be a pinned non-zero code hash`);
  return value.toLowerCase() as Hex;
};

const hex = (value: string, field: string): Hex => {
  if (!/^0x(?:[0-9a-fA-F]{2})*$/u.test(value)) throw new Error(`${field} must be even-length hex`);
  return value as Hex;
};

export const ENTRY_POINT_V08 = '0x4337084d9e255ff0702461cf8895ce9e3b5ff108' as Address;
export const ENTRY_POINT_VERSION = '0.8.0' as const;

export type NetworkProfile = 'base-sepolia' | 'scroll-sepolia';
export type DeploymentMetadata = {
  readonly network: NetworkProfile;
  readonly chainId: number;
  readonly entryPoint: { readonly address: Address; readonly version: '0.8.0'; readonly codeHash: Hex };
  readonly safeFactory: { readonly address: Address; readonly version: string; readonly codeHash: Hex };
  readonly safeSingleton: { readonly address: Address; readonly version: string; readonly codeHash: Hex };
};

export type DeploymentInput = Omit<DeploymentMetadata, 'network' | 'chainId'> & { readonly chainId: number };

const NETWORKS: Record<NetworkProfile, { chainId: number }> = {
  'base-sepolia': { chainId: 84532 },
  'scroll-sepolia': { chainId: 534351 },
};

/** Builds an explicitly pinned profile. Addresses/hashes are intentionally not bundled as defaults. */
export function createDeploymentProfile(network: NetworkProfile, input: DeploymentInput): DeploymentMetadata {
  const expected = NETWORKS[network];
  if (!Number.isSafeInteger(input.chainId) || input.chainId !== expected.chainId)
    throw new Error(`${network} chain id mismatch`);
  const entryPointAddress = address(input.entryPoint.address, 'EntryPoint address');
  if (entryPointAddress.toLowerCase() !== ENTRY_POINT_V08) throw new Error('unsupported EntryPoint address');
  if (input.entryPoint.version !== ENTRY_POINT_VERSION) throw new Error('unsupported EntryPoint version');
  const entryPoint = { address: entryPointAddress, version: ENTRY_POINT_VERSION, codeHash: hash(input.entryPoint.codeHash, 'EntryPoint code hash') } as const;
  const safeFactory = { address: address(input.safeFactory.address, 'Safe factory address'), version: nonEmpty(input.safeFactory.version, 'Safe factory version'), codeHash: hash(input.safeFactory.codeHash, 'Safe factory code hash') } as const;
  const safeSingleton = { address: address(input.safeSingleton.address, 'Safe singleton address'), version: nonEmpty(input.safeSingleton.version, 'Safe singleton version'), codeHash: hash(input.safeSingleton.codeHash, 'Safe singleton code hash') } as const;
  return { network, chainId: input.chainId, entryPoint, safeFactory, safeSingleton };
}

function nonEmpty(value: string, field: string): string {
  if (!value || value.length > 128) throw new Error(`${field} is required`);
  return value;
}

export type SafeCall = { readonly to: Address; readonly value: bigint; readonly data: Hex };
export type SafeAccount = { readonly address: Address; readonly chainId: number; readonly owners: readonly Address[]; readonly threshold: number };
export type UserOperation = {
  readonly sender: Address;
  readonly nonce: bigint;
  readonly callData: Hex;
  readonly callGasLimit: bigint;
  readonly verificationGasLimit: bigint;
  readonly preVerificationGas: bigint;
  readonly maxFeePerGas: bigint;
  readonly maxPriorityFeePerGas: bigint;
  readonly paymasterAndData: Hex;
  readonly signature: Hex;
};
export type UserOperationReceipt = { readonly userOpHash: Hex; readonly transactionHash: Hex; readonly success: boolean };
export type SimulationResult = { readonly userOp: UserOperation; readonly valid: true; readonly gas: { readonly call: bigint; readonly verification: bigint } };

export type RpcPort = {
  getChainId(): Promise<number>;
  getCode(address: Address): Promise<Hex>;
  getCodeHash(address: Address): Promise<Hex>;
};
export type SafeLifecyclePort = {
  createSafe(input: { readonly owners: readonly Address[]; readonly threshold: number; readonly saltNonce: bigint }): Promise<SafeAccount>;
  getSafe(address: Address): Promise<SafeAccount | undefined>;
  encodeCall(input: { readonly account: Address; readonly call: SafeCall }): Promise<Hex>;
};
export type BundlerPort = {
  simulateUserOperation(input: UserOperation, entryPoint: Address): Promise<SimulationResult>;
  sendUserOperation(input: UserOperation, entryPoint: Address): Promise<Hex>;
  getUserOperationReceipt(hash: Hex): Promise<UserOperationReceipt | undefined>;
};
export type PaymasterPort = { sponsorUserOperation(input: UserOperation, entryPoint: Address): Promise<Pick<UserOperation, 'paymasterAndData'>> };
export type SignerPort = { signUserOperation(input: UserOperation): Promise<Hex> };

export type PreparedCall = { readonly account: Address; readonly call: SafeCall; readonly callData: Hex; readonly chainId: number };

function positive(value: bigint, field: string): void { if (value < 0n) throw new Error(`${field} must be non-negative`); }
function assertUserOperation(value: UserOperation): void {
  address(value.sender, 'UserOperation sender');
  for (const [name, number] of Object.entries({ nonce: value.nonce, callGasLimit: value.callGasLimit, verificationGasLimit: value.verificationGasLimit, preVerificationGas: value.preVerificationGas, maxFeePerGas: value.maxFeePerGas, maxPriorityFeePerGas: value.maxPriorityFeePerGas })) positive(number as bigint, name);
  hex(value.callData, 'UserOperation callData'); hex(value.paymasterAndData, 'UserOperation paymasterAndData'); hex(value.signature, 'UserOperation signature');
}

/** Service orchestrator with fail-closed deployment verification and no blind resend. */
export class SafeServiceAdapter {
  private verified = false;
  private readonly simulations = new Map<string, SimulationResult>();
  private readonly submitted = new Set<string>();

  constructor(
    private readonly profile: DeploymentMetadata,
    private readonly rpc: RpcPort,
    private readonly lifecycle: SafeLifecyclePort,
    private readonly bundler: BundlerPort,
    private readonly signer: SignerPort,
    private readonly paymaster?: PaymasterPort,
  ) {}

  async verifyDeployment(): Promise<void> {
    const chainId = await this.rpc.getChainId();
    if (chainId !== this.profile.chainId) throw new Error('provider chain id does not match deployment profile');
    for (const [label, item] of [['EntryPoint', this.profile.entryPoint], ['Safe factory', this.profile.safeFactory], ['Safe singleton', this.profile.safeSingleton]] as const) {
      const runtime = await this.rpc.getCode(item.address);
      if (runtime === '0x' || runtime.length < 4) throw new Error(`${label} has no runtime bytecode`);
      const runtimeHash = await this.rpc.getCodeHash(item.address);
      if (runtimeHash.toLowerCase() !== item.codeHash.toLowerCase()) throw new Error(`${label} runtime code hash mismatch`);
    }
    this.verified = true;
  }

  private ensureVerified(): void { if (!this.verified) throw new Error('deployment must be verified before use'); }

  async createSafe(input: Parameters<SafeLifecyclePort['createSafe']>[0]): Promise<SafeAccount> { this.ensureVerified(); return this.lifecycle.createSafe(input); }
  async getSafe(account: Address): Promise<SafeAccount | undefined> { this.ensureVerified(); return this.lifecycle.getSafe(account); }
  async prepareCall(input: { readonly account: Address; readonly call: SafeCall }): Promise<PreparedCall> {
    this.ensureVerified(); address(input.account, 'Safe account'); address(input.call.to, 'call target'); positive(input.call.value, 'call value'); hex(input.call.data, 'call data');
    return { ...input, callData: await this.lifecycle.encodeCall(input), chainId: this.profile.chainId };
  }
  async simulate(userOperation: UserOperation): Promise<SimulationResult> {
    this.ensureVerified(); assertUserOperation(userOperation);
    const result = await this.bundler.simulateUserOperation(userOperation, this.profile.entryPoint.address);
    if (!result.valid) throw new Error('UserOperation simulation failed');
    this.simulations.set(operationKey(userOperation), result); return result;
  }
  async sponsor(userOperation: UserOperation): Promise<UserOperation> {
    this.ensureVerified(); assertUserOperation(userOperation);
    if (!this.paymaster) throw new Error('paymaster is not configured');
    const result = await this.paymaster.sponsorUserOperation(userOperation, this.profile.entryPoint.address);
    return { ...userOperation, paymasterAndData: hex(result.paymasterAndData, 'paymasterAndData') };
  }
  async authorize(userOperation: UserOperation): Promise<UserOperation> { this.ensureVerified(); assertUserOperation(userOperation); return { ...userOperation, signature: await this.signer.signUserOperation(userOperation) }; }
  async submit(userOperation: UserOperation): Promise<Hex> {
    this.ensureVerified(); assertUserOperation(userOperation);
    const key = operationKey(userOperation); if (this.submitted.has(key)) throw new Error('UserOperation may already have been submitted; inspect receipt instead of retrying');
    if (!this.simulations.has(key)) throw new Error('UserOperation must pass simulation before submission');
    const result = await this.bundler.sendUserOperation(userOperation, this.profile.entryPoint.address);
    const hashValue = hex(result, 'UserOperation hash'); this.submitted.add(key); return hashValue;
  }
  async receipt(userOperationHash: Hex): Promise<UserOperationReceipt | undefined> { this.ensureVerified(); return this.bundler.getUserOperationReceipt(hex(userOperationHash, 'UserOperation hash')); }
}

function operationKey(operation: UserOperation): string { return [operation.sender.toLowerCase(), operation.nonce.toString(), operation.callData.toLowerCase(), operation.paymasterAndData.toLowerCase(), operation.signature.toLowerCase()].join('|'); }
