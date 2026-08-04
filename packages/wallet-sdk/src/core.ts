import type { Activity, ApiErrorBody, Balance, CreateWalletRequest, TransactionRequest, TransactionResponse, Wallet, WalletList } from './generated.js';
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type RetryPolicy = { retries?: number; baseDelayMs?: number };
export type ClientOptions = { baseUrl: string; token?: string; apiKey?: string; fetch?: FetchLike; timeoutMs?: number; retry?: RetryPolicy; headers?: Record<string,string> };
export type RequestOptions = { signal?: AbortSignal; timeoutMs?: number; idempotencyKey?: string; retry?: RetryPolicy };
export type WalletSdkErrorCode = 'AUTH_REQUIRED'|'AUTH_INVALID'|'ABORTED'|'TIMEOUT'|'NETWORK_ERROR'|'HTTP_ERROR'|'INVALID_RESPONSE'|'NOT_FOUND'|'CONFLICT'|'UNKNOWN';
export class WalletSdkError extends Error {
  constructor(readonly code: WalletSdkErrorCode, message: string, readonly status?: number, readonly requestId?: string, readonly retryable = false) { super(message); this.name = 'WalletSdkError'; }
}
const sleep = (ms:number, signal?:AbortSignal) => new Promise<void>((resolve,reject)=>{ const t=setTimeout(resolve,ms); signal?.addEventListener('abort',()=>{clearTimeout(t); reject(new WalletSdkError('ABORTED','Request aborted',undefined,undefined,false));},{once:true}); });
const parse = async (response: Response): Promise<unknown> => { const text=await response.text(); if (!text) return {}; try { return JSON.parse(text); } catch { throw new WalletSdkError('INVALID_RESPONSE','Service returned invalid JSON',response.status,undefined,false); } };
const errorCode = (status:number): WalletSdkErrorCode => status===401?'AUTH_INVALID':status===404?'NOT_FOUND':status===409?'CONFLICT':status>=500?'HTTP_ERROR':'HTTP_ERROR';
export class WalletClient {
  private readonly fetcher: FetchLike;
  constructor(private readonly options: ClientOptions) { this.fetcher=options.fetch ?? globalThis.fetch.bind(globalThis); if (!/^https?:\/\//u.test(options.baseUrl)) throw new TypeError('baseUrl must be an absolute http(s) URL'); }
  private async request<T>(method:string,path:string,body?:unknown, opts:RequestOptions={}): Promise<T> {
    if (opts.signal?.aborted) throw new WalletSdkError('ABORTED','Request aborted',undefined,undefined,false);
    const retry={...this.options.retry,...opts.retry}; const attempts=Math.max(0, retry.retries ?? 0); const canRetry=method==='GET' || Boolean(opts.idempotencyKey); let attempt=0;
    while (true) { const controller=new AbortController(); const timeout=opts.timeoutMs ?? this.options.timeoutMs ?? 15_000; let timed=false; const timer=setTimeout(()=>{timed=true;controller.abort();},timeout); const onAbort=()=>controller.abort(); opts.signal?.addEventListener('abort',onAbort,{once:true});
      try { const headers:Record<string,string>={'accept':'application/json',...this.options.headers}; if(body!==undefined){headers['content-type']='application/json'; headers['idempotency-key']=opts.idempotencyKey ?? headers['idempotency-key'] ?? ''; if (!headers['idempotency-key']) delete headers['idempotency-key'];} if(this.options.token) headers.authorization=`Bearer ${this.options.token}`; else if(this.options.apiKey) headers.authorization=`ApiKey ${this.options.apiKey}`;
        const response=await this.fetcher(new URL(path,this.options.baseUrl).toString(),{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal}); const value=await parse(response); if(!response.ok){ const e=value as ApiErrorBody; const code=errorCode(response.status); const safeMessage= response.status===401?'Authentication failed':(e.error?.message ?? code); throw new WalletSdkError(code,safeMessage,response.status,e.error?.requestId,canRetry && response.status>=500); } return value as T;
      } catch(e) { if(e instanceof WalletSdkError){ if(e.code==='ABORTED') throw e; if(timed) throw new WalletSdkError('TIMEOUT','Request timed out',undefined,undefined,false); if(!e.retryable || !canRetry || attempt>=attempts) throw e; } else { if(timed) throw new WalletSdkError('TIMEOUT','Request timed out'); if(opts.signal?.aborted) throw new WalletSdkError('ABORTED','Request aborted'); if(!canRetry || attempt>=attempts) throw new WalletSdkError('NETWORK_ERROR','Network request failed',undefined,undefined,canRetry); }
        attempt++; await sleep((retry.baseDelayMs ?? 100) * 2 ** (attempt-1),opts.signal);
      } finally { clearTimeout(timer); opts.signal?.removeEventListener('abort',onAbort); }
    }
  }
  health(opts?:RequestOptions) { return this.request<{ok:boolean;version:string}>('GET','/v1/health',undefined,opts); }
  list(opts?:RequestOptions) { return this.request<WalletList>('GET','/v1/wallets',undefined,opts); }
  create(input:CreateWalletRequest={},opts:RequestOptions={}) { if(!opts.idempotencyKey) throw new WalletSdkError('CONFLICT','idempotencyKey is required for create'); return this.request<Wallet>('POST','/v1/wallets',input,opts); }
  get(walletId:string,opts?:RequestOptions) { return this.request<Wallet>('GET',`/v1/wallets/${encodeURIComponent(walletId)}`,undefined,opts); }
  getOrCreate(input:CreateWalletRequest={},opts:RequestOptions={}) { return this.create(input,opts).catch(e=>e instanceof WalletSdkError && e.status===409 ? this.get(input.walletId ?? '',opts) : Promise.reject(e)); }
  balances(walletId:string,opts?:RequestOptions) { return this.request<Balance[]|{balances:Balance[]}>('GET',`/v1/wallets/${encodeURIComponent(walletId)}/balances`,undefined,opts); }
  activity(walletId:string,opts?:RequestOptions) { return this.request<Activity[]|{activity:Activity[]}>('GET',`/v1/wallets/${encodeURIComponent(walletId)}/activity`,undefined,opts); }
  prepare(input:TransactionRequest,opts?:RequestOptions) { return this.request<TransactionResponse>('POST','/v1/transactions',{...input,operation:'prepare'}, {...opts,idempotencyKey:opts?.idempotencyKey}); }
  authorize(input:TransactionRequest,opts?:RequestOptions) { return this.request<TransactionResponse>('POST','/v1/transactions',{...input,operation:'authorize'},opts); }
  send(input:TransactionRequest,opts:RequestOptions) { if(!opts.idempotencyKey) throw new WalletSdkError('CONFLICT','idempotencyKey is required for send'); return this.request<TransactionResponse>('POST','/v1/transactions',{...input,operation:'send'},opts); }
  transaction(input:TransactionRequest,opts:RequestOptions) { return this.send(input,opts); }
  token(walletId:string, token:string,opts?:RequestOptions) { return this.balances(walletId,opts).then(v=>({token,balances:v})); }
  nft(walletId:string, collection:string,opts?:RequestOptions) { return this.activity(walletId,opts).then(v=>({collection,activity:v})); }
  signer(walletId:string,opts?:RequestOptions) { return this.get(walletId,opts).then(v=>({walletId:v.walletId,signers:[]})); }
  did(walletId:string,opts?:RequestOptions) { return this.get(walletId,opts).then(v=>({walletId:v.walletId,did:`did:pkh:eip155:${v.chainId}:${v.address}`})); }
  migration(walletId:string,opts?:RequestOptions) { return this.get(walletId,opts).then(v=>({wallet:v,portable:true})); }
}
export type WalletApi = Pick<WalletClient,'health'|'list'|'create'|'get'|'getOrCreate'|'balances'|'activity'|'prepare'|'authorize'|'send'|'transaction'|'token'|'nft'|'signer'|'did'|'migration'>;
