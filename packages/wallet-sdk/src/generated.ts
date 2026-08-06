/** Generated from apps/wallet-service/openapi.json. Keep the schema and this file in lockstep. */
export type WalletLocator = string;
export interface Wallet { walletId: string; locator: WalletLocator; tenantId: string; chainId: number; address: `0x${string}`; status: string; createdAt?: string; }
export interface WalletList { wallets: Wallet[]; }
export interface Balance { asset: string; amount: string; symbol?: string; decimals?: number; }
export interface Activity { id: string; status: string; [key: string]: unknown; }
export interface CreateWalletRequest { chainId?: number; walletId?: string; }
export interface TransactionRequest { walletId: string; chainId?: number; action?: unknown; [key: string]: unknown; }
export interface TransactionResponse { transactionId?: string; status?: string; [key: string]: unknown; }
export interface ApiErrorBody { error?: { code?: string; message?: string; requestId?: string }; }
export interface WalletServicePaths {
  '/v1/health': { GET: { response: { ok: boolean; version: string } } };
  '/v1/wallets': { GET: { response: WalletList }; POST: { body: CreateWalletRequest; response: Wallet } };
  '/v1/wallets/{walletId}': { GET: { response: Wallet } };
  '/v1/wallets/{walletId}/balances': { GET: { response: Balance[] | { balances: Balance[] } } };
  '/v1/wallets/{walletId}/activity': { GET: { response: Activity[] | { activity: Activity[] } } };
  '/v1/transactions': { POST: { body: TransactionRequest; response: TransactionResponse } };
  '/v1/webhooks': { POST: { body: unknown; response: { accepted: boolean } } };
}
