import type {
  AuthorizationRequest,
  PolicyDecision,
  SignerPolicyEvaluator,
} from '@ssw/signer-policy';

export type Address = `0x${string}`;
export type AssetKind = 'native' | 'erc20' | 'erc721' | 'erc1155';
export type ActionKind = 'transfer' | 'mint' | 'approve' | 'batch';
export type RiskLevel = 'normal' | 'high';
export type SimulationResult = { readonly ok: boolean; readonly returnData?: string; readonly error?: string };
export interface ActionCall { readonly target: Address; readonly selector: `0x${string}`; readonly data: `0x${string}`; readonly value: bigint; }
export interface WalletAction {
  readonly version: 1;
  readonly id: string;
  readonly chainId: number;
  readonly kind: ActionKind;
  readonly asset: AssetKind;
  readonly target: Address;
  readonly selector: `0x${string}`;
  readonly recipient?: Address;
  readonly tokenId?: bigint;
  readonly amount: bigint;
  readonly value: bigint;
  readonly calls: readonly ActionCall[];
  readonly risk: RiskLevel;
  readonly consent: string;
}

export interface ActionInput { readonly chainId: number; readonly target?: Address; readonly recipient: Address; readonly amount?: bigint; readonly tokenId?: bigint; readonly value?: bigint; readonly metadata?: { readonly name?: string; readonly symbol?: string; readonly decimals?: number }; }
export interface BatchInput { readonly chainId: number; readonly calls: readonly ActionCall[]; readonly amount?: bigint; }
export interface SimulationPort { simulate(action: WalletAction): Promise<SimulationResult>; }
export interface ActionAuthorizer { authorize(request: AuthorizationRequest): Promise<PolicyDecision>; }
export class WalletActionError extends Error { constructor(readonly code: 'INVALID_ACTION'|'SIMULATION_FAILED'|'SIMULATION_MISMATCH'|'POLICY_DENIED'|'METADATA_UNTRUSTED'|'BATCH_NOT_ATOMIC', message: string) { super(message); this.name = 'WalletActionError'; } }

const selectors = {
  native: '0x00000000', transfer20: '0xa9059cbb', approve20: '0x095ea7b3', transfer721: '0x42842e0e', approve721: '0x095ea7b3', transfer1155: '0xf242432a', mint20: '0x40c10f19', mint721: '0x40c10f19', mint1155: '0x731133e9', batch: '0x00000001',
} as const;
export const ACTION_SELECTORS = selectors;
const addr = (x: unknown): Address => { if (typeof x !== 'string' || !/^0x[0-9a-f]{40}$/iu.test(x) || /^0x0+$/iu.test(x)) throw new WalletActionError('INVALID_ACTION','valid non-zero address required'); return x.toLowerCase() as Address; };
const uint = (x: bigint | undefined, fallback = 0n): bigint => { const v = x ?? fallback; if (typeof v !== 'bigint' || v < 0n) throw new WalletActionError('INVALID_ACTION','non-negative bigint required'); return v; };
const chain = (x: number): void => { if (!Number.isSafeInteger(x) || x < 1) throw new WalletActionError('INVALID_ACTION','valid chain id required'); };
const metadata = (input: ActionInput): void => { if (input.metadata?.decimals !== undefined && (!Number.isSafeInteger(input.metadata.decimals) || input.metadata.decimals < 0 || input.metadata.decimals > 255)) throw new WalletActionError('INVALID_ACTION','invalid decimals'); };
const id = (kind: string, chainId: number, target: string, recipient: string, amount: bigint, tokenId?: bigint): string => `ssw-action-v1:${kind}:${chainId}:${target}:${recipient}:${amount.toString()}:${tokenId?.toString() ?? ''}`;
const consent = (a: Pick<WalletAction,'chainId'|'kind'|'asset'|'target'|'amount'|'value'|'recipient'|'tokenId'|'risk'>): string => `${a.kind} ${a.asset} on chain ${a.chainId}; target ${a.target}; recipient ${a.recipient ?? 'n/a'}; amount ${a.amount}; value ${a.value}; tokenId ${a.tokenId?.toString() ?? 'n/a'}; risk ${a.risk}`;
function make(kind: ActionKind, asset: AssetKind, input: ActionInput, selector: `0x${string}`, risk: RiskLevel = 'normal'): WalletAction {
  chain(input.chainId); metadata(input); const target = addr(input.target ?? input.recipient); const recipient = addr(input.recipient); const amount = uint(input.amount, asset === 'erc721' ? 1n : 0n); const value = uint(input.value, asset === 'native' ? amount : 0n); if (asset === 'erc721' && amount !== 1n) throw new WalletActionError('INVALID_ACTION','ERC-721 amount is exactly one');
  const call: ActionCall = {target, selector, data:'0x', value}; const action = {version:1 as const,id:id(kind,input.chainId,target,recipient,amount,input.tokenId),chainId:input.chainId,kind,asset,target,selector,recipient,tokenId:input.tokenId,amount,value,calls:[call],risk,consent:''}; return {...action, consent:consent(action)};
}
export const prepareNativeTransfer = (input: ActionInput): WalletAction => make('transfer','native',input,selectors.native);
export const prepareErc20Transfer = (input: ActionInput): WalletAction => make('transfer','erc20',input,selectors.transfer20);
export const prepareErc721Transfer = (input: ActionInput): WalletAction => make('transfer','erc721',input,selectors.transfer721);
export const prepareErc1155Transfer = (input: ActionInput): WalletAction => make('transfer','erc1155',input,selectors.transfer1155);
export const prepareErc20Mint = (input: ActionInput): WalletAction => make('mint','erc20',input,selectors.mint20);
export const prepareErc721Mint = (input: ActionInput): WalletAction => make('mint','erc721',input,selectors.mint721);
export const prepareErc1155Mint = (input: ActionInput): WalletAction => make('mint','erc1155',input,selectors.mint1155);
export const prepareErc20Approval = (input: ActionInput & { readonly unlimited?: boolean }): WalletAction => make('approve','erc20',input,selectors.approve20,input.unlimited || input.amount === undefined ? 'high' : 'normal');
export const prepareErc721Approval = (input: ActionInput): WalletAction => make('approve','erc721',input,selectors.approve721,'high');
export function prepareBatch(input: BatchInput): WalletAction { chain(input.chainId); if (!Array.isArray(input.calls) || input.calls.length < 1) throw new WalletActionError('INVALID_ACTION','batch requires calls'); const calls = input.calls.map(c => ({...c,target:addr(c.target),value:uint(c.value)})); const target = calls[0].target; const amount = uint(input.amount); const action = {version:1 as const,id:`ssw-action-v1:batch:${input.chainId}:${calls.map(c=>c.target+c.selector+c.data).join('|')}`,chainId:input.chainId,kind:'batch' as const,asset:'native' as const,target,selector:selectors.batch,amount,value:calls.reduce((n,c)=>n+c.value,0n),calls,risk:'normal' as const,consent:''}; return {...action,consent:consent(action)}; }
export const previewAction = (action: WalletAction): string => action.consent;
export async function simulateAction(port: SimulationPort, action: WalletAction): Promise<SimulationResult> { const result = await port.simulate(action); if (!result.ok) throw new WalletActionError('SIMULATION_FAILED', result.error ?? 'simulation failed'); return result; }
export async function authorizeAction(authorizer: ActionAuthorizer, action: WalletAction, request: Omit<AuthorizationRequest,'target'|'selector'|'chainId'|'amount'|'value'|'asset'|'operation'> & { readonly operation?: AuthorizationRequest['operation'] }): Promise<PolicyDecision> { const decision = await authorizer.authorize({...request,chainId:action.chainId,target:action.target,selector:action.selector,amount:action.amount,value:action.value,asset:{kind:action.asset,address:action.asset === 'native' ? undefined : action.target},operation:request.operation ?? 'transaction'}); if (!decision.allowed) throw new WalletActionError('POLICY_DENIED',decision.reasonCode); return decision; }
export async function simulateAndAuthorize(port: SimulationPort, authorizer: ActionAuthorizer, action: WalletAction, request: Parameters<typeof authorizeAction>[2]): Promise<PolicyDecision> { await simulateAction(port, action); return authorizeAction(authorizer, action, request); }
export const createActionEngine = (simulation: SimulationPort, policy: SignerPolicyEvaluator) => ({ prepare: {nativeTransfer:prepareNativeTransfer,erc20Transfer:prepareErc20Transfer,erc721Transfer:prepareErc721Transfer,erc1155Transfer:prepareErc1155Transfer,erc20Mint:prepareErc20Mint,erc721Mint:prepareErc721Mint,erc1155Mint:prepareErc1155Mint,erc20Approval:prepareErc20Approval,erc721Approval:prepareErc721Approval,batch:prepareBatch}, preview: previewAction, simulate: (a: WalletAction) => simulateAction(simulation,a), authorize: (a: WalletAction,r: Parameters<typeof authorizeAction>[2]) => simulateAndAuthorize(simulation,policy,a,r) });
