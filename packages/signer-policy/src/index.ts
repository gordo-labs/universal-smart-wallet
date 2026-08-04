/**
 * Fail-closed, provider-neutral policies for operational signers.
 * This package evaluates authorization; it does not authenticate a user or
 * implement cryptography. Authentication adapters provide step-up evidence.
 */

export const POLICY_SCHEMA_VERSION = 1 as const;
export type Address = `0x${string}`;
export type Selector = `0x${string}`;
export type Operation =
  | 'transaction'
  | 'rotate-owner'
  | 'export'
  | 'migrate'
  | 'install-module';
export type SessionKind = 'email' | 'oidc' | 'passkey' | 'recovery';

export type PolicyReasonCode =
  | 'ALLOW'
  | 'INVALID_REQUEST'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_REVOKED'
  | 'SESSION_EXPIRED'
  | 'POLICY_NOT_FOUND'
  | 'POLICY_REVOKED'
  | 'POLICY_NOT_YET_ACTIVE'
  | 'POLICY_EXPIRED'
  | 'SIGNER_MISMATCH'
  | 'CHAIN_NOT_ALLOWED'
  | 'CONTRACT_NOT_ALLOWED'
  | 'SELECTOR_NOT_ALLOWED'
  | 'OPERATION_NOT_ALLOWED'
  | 'ASSET_NOT_ALLOWED'
  | 'AMOUNT_EXCEEDED'
  | 'FREQUENCY_EXCEEDED'
  | 'STEP_UP_REQUIRED'
  | 'STEP_UP_INVALID'
  | 'REPLAY_DETECTED'
  | 'POLICY_STORE_UNAVAILABLE';

const denyText = 'authorization denied';

export class SignerPolicyError extends Error {
  readonly code: PolicyReasonCode;
  constructor(code: PolicyReasonCode, message = denyText) {
    super(message);
    this.name = 'SignerPolicyError';
    this.code = code;
  }
}

const fail = (code: PolicyReasonCode): never => {
  throw new SignerPolicyError(code);
};
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const address = (value: unknown): Address => {
  if (
    typeof value !== 'string' ||
    !/^0x[0-9a-fA-F]{40}$/u.test(value) ||
    /^0x0+$/u.test(value)
  )
    fail('INVALID_REQUEST');
  return (value as string).toLowerCase() as Address;
};
const selector = (value: unknown): Selector => {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{8}$/u.test(value))
    fail('INVALID_REQUEST');
  return (value as string).toLowerCase() as Selector;
};
const positive = (
  value: bigint | undefined,
  code: PolicyReasonCode = 'INVALID_REQUEST',
): bigint => {
  if (value === undefined) return 0n;
  if (typeof value !== 'bigint' || value < 0n) fail(code);
  return value;
};
const timestamp = (value: unknown): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    fail('INVALID_REQUEST');
  return value as number;
};

export interface AssetPolicy {
  readonly kind: 'native' | 'erc20' | 'erc721' | 'erc1155';
  readonly address?: Address;
  readonly maxAmount?: bigint;
}
export interface ContractPolicy {
  readonly target: Address;
  /** Explicit selectors are required. There is intentionally no wildcard. */
  readonly selectors: readonly Selector[];
  readonly operations?: readonly Operation[];
  readonly assets?: readonly AssetPolicy[];
  readonly maxValue?: bigint;
  readonly maxAmount?: bigint;
}
export interface FrequencyPolicy {
  readonly windowSeconds: number;
  readonly maxOperations: number;
  readonly maxTotalAmount?: bigint;
}
export interface OperationalSignerPolicy {
  readonly schemaVersion: typeof POLICY_SCHEMA_VERSION;
  readonly policyId: string;
  readonly signerId: string;
  readonly chainId: number;
  readonly validFrom: number;
  readonly expiresAt: number;
  readonly contracts: readonly ContractPolicy[];
  readonly allowedOperations?: readonly Operation[];
  readonly frequency?: FrequencyPolicy;
}
export interface SignerSession {
  readonly sessionId: string;
  readonly signerId: string;
  readonly policyId: string;
  readonly kind: SessionKind;
  readonly issuedAt: number;
  readonly expiresAt: number;
}
export interface StepUpEvidence {
  readonly method: 'passkey' | 'recovery';
  readonly challengeId: string;
  readonly requestId: string;
  readonly verifiedAt: number;
  readonly expiresAt: number;
}
export interface AuthorizationRequest {
  readonly requestId: string;
  readonly sessionId: string;
  readonly signerId: string;
  readonly policyId: string;
  readonly chainId: number;
  readonly target: Address;
  readonly selector: Selector;
  readonly operation: Operation;
  readonly value?: bigint;
  readonly asset?: {
    readonly kind: AssetPolicy['kind'];
    readonly address?: Address;
  };
  readonly amount?: bigint;
  readonly at: number;
  readonly stepUp?: StepUpEvidence;
}
export interface PolicyDecision {
  readonly allowed: boolean;
  readonly reasonCode: PolicyReasonCode;
}
export interface StepUpPort {
  verify(input: {
    readonly request: AuthorizationRequest;
    readonly evidence: StepUpEvidence;
  }): Promise<boolean>;
}

export interface PolicyStore {
  getPolicy(policyId: string): Promise<OperationalSignerPolicy | undefined>;
  getSession(sessionId: string): Promise<SignerSession | undefined>;
  isPolicyRevoked(policyId: string): Promise<boolean>;
  isSessionRevoked(sessionId: string): Promise<boolean>;
  /** Atomic replay/frequency reservation. It consumes nothing when denied. */
  reserve(input: {
    readonly requestId: string;
    readonly frequencyKey: string;
    readonly at: number;
    readonly amount: bigint;
    readonly frequency?: FrequencyPolicy;
  }): Promise<'reserved' | 'replay' | 'frequency'>;
}

type Usage = {
  readonly requestIds: Set<string>;
  count: number;
  amount: bigint;
  windowStart: number;
};

/** Local deterministic store for tests and self-hosted development. */
export class InMemoryPolicyStore implements PolicyStore {
  private readonly policies = new Map<string, OperationalSignerPolicy>();
  private readonly sessions = new Map<string, SignerSession>();
  private readonly revokedPolicies = new Set<string>();
  private readonly revokedSessions = new Set<string>();
  private readonly usage = new Map<string, Usage>();
  private readonly consumedRequestIds = new Set<string>();
  putPolicy(policy: OperationalSignerPolicy): void {
    validatePolicy(policy);
    this.policies.set(policy.policyId, policy);
  }
  putSession(session: SignerSession): void {
    if (
      !session.sessionId ||
      !session.signerId ||
      !session.policyId ||
      session.expiresAt <= session.issuedAt
    )
      fail('INVALID_REQUEST');
    this.sessions.set(session.sessionId, session);
  }
  revokePolicy(policyId: string): void {
    this.revokedPolicies.add(policyId);
  }
  revokeSession(sessionId: string): void {
    this.revokedSessions.add(sessionId);
  }
  getPolicy(policyId: string): Promise<OperationalSignerPolicy | undefined> {
    return Promise.resolve(this.policies.get(policyId));
  }
  getSession(sessionId: string): Promise<SignerSession | undefined> {
    return Promise.resolve(this.sessions.get(sessionId));
  }
  isPolicyRevoked(policyId: string): Promise<boolean> {
    return Promise.resolve(this.revokedPolicies.has(policyId));
  }
  isSessionRevoked(sessionId: string): Promise<boolean> {
    return Promise.resolve(this.revokedSessions.has(sessionId));
  }
  async reserve(input: {
    readonly requestId: string;
    readonly frequencyKey: string;
    readonly at: number;
    readonly amount: bigint;
    readonly frequency?: FrequencyPolicy;
  }): Promise<'reserved' | 'replay' | 'frequency'> {
    const prior = this.usage.get(input.frequencyKey);
    // Request IDs are global replay keys, not scoped to a target or selector.
    // Otherwise a captured authorization could be replayed against another
    // policy bucket before the caller notices the mismatch.
    if (this.consumedRequestIds.has(input.requestId)) return 'replay';
    const window = input.frequency;
    const start = window
      ? Math.floor(input.at / window.windowSeconds) * window.windowSeconds
      : input.at;
    const usage: Usage =
      prior && prior.windowStart === start
        ? prior
        : {
            requestIds: new Set<string>(),
            count: 0,
            amount: 0n,
            windowStart: start,
          };
    if (
      window &&
      (usage.count >= window.maxOperations ||
        (window.maxTotalAmount !== undefined &&
          usage.amount + input.amount > window.maxTotalAmount))
    )
      return 'frequency';
    usage.requestIds.add(input.requestId);
    usage.count += 1;
    usage.amount += input.amount;
    this.usage.set(input.frequencyKey, usage);
    this.consumedRequestIds.add(input.requestId);
    return 'reserved';
  }
}

export function validatePolicy(policy: OperationalSignerPolicy): void {
  if (
    !isObject(policy) ||
    policy.schemaVersion !== 1 ||
    !policy.policyId ||
    !policy.signerId ||
    !Number.isSafeInteger(policy.chainId) ||
    policy.chainId < 1 ||
    !Number.isSafeInteger(policy.validFrom) ||
    !Number.isSafeInteger(policy.expiresAt) ||
    policy.expiresAt <= policy.validFrom ||
    policy.contracts.length === 0
  )
    fail('INVALID_REQUEST');
  const seen = new Set<string>();
  for (const contract of policy.contracts) {
    address(contract.target);
    if (!Array.isArray(contract.selectors) || contract.selectors.length === 0)
      fail('INVALID_REQUEST');
    for (const value of contract.selectors) {
      const key = selector(value);
      if (seen.has(`${contract.target.toLowerCase()}:${key}`))
        fail('INVALID_REQUEST');
      seen.add(`${contract.target.toLowerCase()}:${key}`);
    }
    for (const amount of [contract.maxAmount, contract.maxValue])
      positive(amount);
    for (const asset of contract.assets ?? []) {
      if (!['native', 'erc20', 'erc721', 'erc1155'].includes(asset.kind))
        fail('INVALID_REQUEST');
      if (asset.kind === 'native' && asset.address !== undefined)
        fail('INVALID_REQUEST');
      if (asset.kind !== 'native' && asset.address === undefined)
        fail('INVALID_REQUEST');
      if (asset.address) address(asset.address);
      positive(asset.maxAmount);
    }
  }
  if (policy.frequency) {
    if (
      !Number.isSafeInteger(policy.frequency.windowSeconds) ||
      policy.frequency.windowSeconds < 1 ||
      !Number.isSafeInteger(policy.frequency.maxOperations) ||
      policy.frequency.maxOperations < 1
    )
      fail('INVALID_REQUEST');
    positive(policy.frequency.maxTotalAmount);
  }
}

const sensitive = new Set<Operation>([
  'rotate-owner',
  'export',
  'migrate',
  'install-module',
]);

export class SignerPolicyEvaluator {
  constructor(
    private readonly store: PolicyStore,
    private readonly stepUp?: StepUpPort,
  ) {}

  async authorize(request: AuthorizationRequest): Promise<PolicyDecision> {
    try {
      const basic = validateRequest(request);
      if (basic) return deny(basic);
      const session = await this.store.getSession(request.sessionId);
      if (!session) return deny('SESSION_NOT_FOUND');
      if (await this.store.isSessionRevoked(session.sessionId))
        return deny('SESSION_REVOKED');
      if (request.at < session.issuedAt || request.at >= session.expiresAt)
        return deny('SESSION_EXPIRED');
      if (
        session.signerId !== request.signerId ||
        session.policyId !== request.policyId
      )
        return deny('SIGNER_MISMATCH');
      const policy = await this.store.getPolicy(request.policyId);
      if (!policy) return deny('POLICY_NOT_FOUND');
      if (await this.store.isPolicyRevoked(policy.policyId))
        return deny('POLICY_REVOKED');
      if (request.at < policy.validFrom) return deny('POLICY_NOT_YET_ACTIVE');
      if (request.at >= policy.expiresAt) return deny('POLICY_EXPIRED');
      if (policy.chainId !== request.chainId) return deny('CHAIN_NOT_ALLOWED');
      if (
        policy.allowedOperations &&
        !policy.allowedOperations.includes(request.operation)
      )
        return deny('OPERATION_NOT_ALLOWED');
      const rule = policy.contracts.find(
        (candidate) =>
          candidate.target.toLowerCase() === request.target.toLowerCase(),
      );
      if (!rule) return deny('CONTRACT_NOT_ALLOWED');
      if (
        !rule.selectors.some(
          (value) => value.toLowerCase() === request.selector.toLowerCase(),
        )
      )
        return deny('SELECTOR_NOT_ALLOWED');
      if (rule.operations && !rule.operations.includes(request.operation))
        return deny('OPERATION_NOT_ALLOWED');
      const amount = positive(request.amount);
      const value = positive(request.value);
      if (rule.maxValue !== undefined && value > rule.maxValue)
        return deny('AMOUNT_EXCEEDED');
      if (rule.maxAmount !== undefined && amount > rule.maxAmount)
        return deny('AMOUNT_EXCEEDED');
      const requestedAsset = request.asset ?? { kind: 'native' as const };
      if (rule.assets) {
        const asset = rule.assets.find(
          (candidate) =>
            candidate.kind === requestedAsset.kind &&
            (candidate.kind === 'native' ||
              candidate.address?.toLowerCase() ===
                requestedAsset.address?.toLowerCase()),
        );
        if (!asset) return deny('ASSET_NOT_ALLOWED');
        if (asset.maxAmount !== undefined && amount > asset.maxAmount)
          return deny('AMOUNT_EXCEEDED');
      }
      if (sensitive.has(request.operation)) {
        if (
          !request.stepUp ||
          !['passkey', 'recovery'].includes(request.stepUp.method) ||
          request.stepUp.requestId !== request.requestId ||
          request.at < request.stepUp.verifiedAt ||
          request.at >= request.stepUp.expiresAt ||
          !this.stepUp ||
          !(await this.stepUp.verify({ request, evidence: request.stepUp }))
        )
          return deny(request.stepUp ? 'STEP_UP_INVALID' : 'STEP_UP_REQUIRED');
      }
      const reserved = await this.store.reserve({
        requestId: request.requestId,
        frequencyKey: `${request.signerId}:${request.policyId}:${request.target.toLowerCase()}:${request.selector.toLowerCase()}`,
        at: request.at,
        amount,
        frequency: policy.frequency,
      });
      if (reserved !== 'reserved')
        return deny(
          reserved === 'replay' ? 'REPLAY_DETECTED' : 'FREQUENCY_EXCEEDED',
        );
      return { allowed: true, reasonCode: 'ALLOW' };
    } catch (error) {
      if (
        error instanceof SignerPolicyError &&
        error.code === 'INVALID_REQUEST'
      )
        return deny('INVALID_REQUEST');
      return deny('POLICY_STORE_UNAVAILABLE');
    }
  }
}

function validateRequest(
  request: AuthorizationRequest,
): PolicyReasonCode | undefined {
  if (
    !isObject(request) ||
    !request.requestId ||
    !request.sessionId ||
    !request.signerId ||
    !request.policyId ||
    !Number.isSafeInteger(request.chainId) ||
    request.chainId < 1
  )
    return 'INVALID_REQUEST';
  try {
    address(request.target);
    selector(request.selector);
    timestamp(request.at);
    positive(request.amount);
    positive(request.value);
  } catch {
    return 'INVALID_REQUEST';
  }
  return undefined;
}
const deny = (reasonCode: PolicyReasonCode): PolicyDecision => ({
  allowed: false,
  reasonCode,
});
