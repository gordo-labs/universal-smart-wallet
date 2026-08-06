import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type SafeError = { readonly code: string; readonly message: string };
export type AuthSession = { readonly subject: string; readonly method: string; readonly expiresAt?: string; readonly requiresStepUp?: boolean };
export interface AuthModule { readonly id: string; signIn(options?: unknown): Promise<AuthSession>; signOut?(): Promise<void>; stepUp?(reason: string): Promise<void>; }
export interface Wallet { readonly walletId: string; readonly locator?: string; readonly tenantId?: string; readonly chainId: number; readonly address: `0x${string}`; readonly status?: string; }
export interface Balance { readonly asset: string; readonly amount: string; readonly symbol?: string; readonly decimals?: number; }
export interface Did { readonly walletId: string; readonly did: string; }
export interface Signers { readonly walletId: string; readonly signers: readonly { readonly id: string; readonly type: string; readonly status?: string }[]; }
export interface Portability { readonly wallet: Wallet; readonly portable: boolean; }
export interface TransactionInput { readonly walletId: string; readonly chainId?: number; readonly action?: unknown; readonly [key: string]: unknown; }
export interface TransactionResult { readonly transactionId?: string; readonly status?: string; readonly [key: string]: unknown; }
export interface WalletApi {
  get(walletId: string, options?: { signal?: AbortSignal }): Promise<Wallet>;
  create(input?: { chainId?: number; walletId?: string }, options?: { signal?: AbortSignal; idempotencyKey?: string }): Promise<Wallet>;
  balances(walletId: string, options?: { signal?: AbortSignal }): Promise<Balance[] | { balances: Balance[] }>;
  send(input: TransactionInput, options: { signal?: AbortSignal; idempotencyKey: string }): Promise<TransactionResult>;
  signer?(walletId: string, options?: { signal?: AbortSignal }): Promise<Signers>;
  did?(walletId: string, options?: { signal?: AbortSignal }): Promise<Did>;
  migration?(walletId: string, options?: { signal?: AbortSignal }): Promise<Portability>;
}
export interface WalletProviderProps { readonly client: WalletApi; readonly auth?: AuthModule; readonly walletId?: string; readonly children: React.ReactNode; }
interface ContextValue { client: WalletApi; auth?: AuthModule; session?: AuthSession; setSession: (s?: AuthSession) => void; walletId?: string; setWalletId: (id?: string) => void; }
const Context = createContext<ContextValue | null>(null);
export const normalizeWalletError = (error: unknown): SafeError => {
  if (error && typeof error === 'object' && 'code' in error && typeof (error as { code?: unknown }).code === 'string') return { code: (error as { code: string }).code, message: 'Wallet operation failed' };
  return { code: 'UNKNOWN', message: 'Wallet operation failed' };
};
export function WalletProvider({ client, auth, walletId: initialWalletId, children }: WalletProviderProps) {
  const [session, setSession] = useState<AuthSession>();
  const [walletId, setWalletId] = useState(initialWalletId);
  useEffect(() => { setSession(undefined); setWalletId(initialWalletId); }, [client, auth, initialWalletId]);
  const value = useMemo(() => ({ client, auth, session, setSession, walletId, setWalletId }), [client, auth, session, walletId]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
function useRequiredContext() { const value = useContext(Context); if (!value) throw new Error('WalletProvider is required'); return value; }
function useOperation<T>(operation: (signal: AbortSignal) => Promise<T>, deps: React.DependencyList) {
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: SafeError }>({ loading: false });
  const mounted = useRef(true); const sequence = useRef(0); const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  const run = useCallback(async () => {
    controller.current?.abort(); const current = ++sequence.current; const next = new AbortController(); controller.current = next;
    setState({ loading: true });
    try { const data = await operation(next.signal); if (mounted.current && current === sequence.current) setState({ data, loading: false }); return data; }
    catch (error) { if (mounted.current && current === sequence.current && (error as { name?: string })?.name !== 'AbortError') setState({ loading: false, error: normalizeWalletError(error) }); return undefined; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  const cancel = useCallback(() => { sequence.current++; controller.current?.abort(); if (mounted.current) setState(s => ({ ...s, loading: false })); }, []);
  return { ...state, run, cancel };
}
export function useAuth() {
  const { auth, session, setSession } = useRequiredContext();
  const signIn = useCallback(async (options?: unknown) => { if (!auth) throw new Error('No auth module configured'); const next = await auth.signIn(options); setSession(next); return next; }, [auth, setSession]);
  const signOut = useCallback(async () => { await auth?.signOut?.(); setSession(undefined); }, [auth, setSession]);
  const stepUp = useCallback(async (reason: string) => { if (!auth?.stepUp) throw new Error('Step-up authentication is required'); await auth.stepUp(reason); }, [auth]);
  return { session, authenticated: Boolean(session), module: auth?.id, signIn, signOut, stepUp };
}
export function useWallet() {
  const { client, walletId, setWalletId } = useRequiredContext();
  const op = useOperation(signal => walletId ? client.get(walletId, { signal }) : Promise.resolve(undefined), [client, walletId]);
  const switchWallet = useCallback((id: string) => { setWalletId(id); }, [setWalletId]);
  const create = useCallback(async (input?: { chainId?: number; walletId?: string }, idempotencyKey = `react-${Date.now()}`) => { const wallet = await client.create(input, { idempotencyKey }); setWalletId(wallet.walletId); return wallet; }, [client, setWalletId]);
  return { ...op, walletId, switchWallet, create };
}
function requireWalletId(walletId?: string): string { if (!walletId) throw new Error('Select a wallet first'); return walletId; }
export function useBalances() { const { client, walletId } = useRequiredContext(); return useOperation(async signal => client.balances(requireWalletId(walletId), { signal }), [client, walletId]); }
export function useTransaction() {
  const { client, walletId, auth } = useRequiredContext(); const [stepUpRequired, setStepUpRequired] = useState(false);
  const [state, setState] = useState<{ data?: TransactionResult; loading: boolean; error?: SafeError }>({ loading: false }); const mounted = useRef(true); const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  const send = useCallback(async (input: Omit<TransactionInput, 'walletId'>, idempotencyKey: string, options: { requiresStepUp?: boolean } = {}) => {
    if (options.requiresStepUp) { setStepUpRequired(true); if (!auth?.stepUp) throw new Error('Step-up authentication is required'); await auth.stepUp('transaction'); setStepUpRequired(false); }
    const current = new AbortController(); controller.current?.abort(); controller.current = current; setState({ loading: true });
    try { const data = await client.send({ ...input, walletId: requireWalletId(walletId) }, { signal: current.signal, idempotencyKey }); if (mounted.current) setState({ data, loading: false }); return data; }
    catch (error) { if (mounted.current && (error as { name?: string })?.name !== 'AbortError') setState({ loading: false, error: normalizeWalletError(error) }); return undefined; }
  }, [auth, client, walletId]);
  const cancel = useCallback(() => { controller.current?.abort(); if (mounted.current) setState(s => ({ ...s, loading: false })); }, []);
  return { ...state, send, cancel, stepUpRequired };
}
export function useSigners() { const { client, walletId } = useRequiredContext(); return useOperation(async signal => client.signer ? client.signer(requireWalletId(walletId), { signal }) : { walletId: requireWalletId(walletId), signers: [] }, [client, walletId]); }
export function useDid() { const { client, walletId } = useRequiredContext(); return useOperation(async signal => client.did ? client.did(requireWalletId(walletId), { signal }) : undefined, [client, walletId]); }
export function usePortability() { const { client, walletId } = useRequiredContext(); return useOperation(async signal => client.migration ? client.migration(requireWalletId(walletId), { signal }) : { wallet: await client.get(requireWalletId(walletId), { signal }), portable: true }, [client, walletId]); }
export function WalletStatus({ loading, error, stepUpRequired, onCancel }: { readonly loading?: boolean; readonly error?: SafeError; readonly stepUpRequired?: boolean; readonly onCancel?: () => void }) {
  if (stepUpRequired) return <div role="alert" aria-live="assertive">Additional authentication required.</div>;
  if (error) return <div role="alert" aria-live="assertive">{error.message}{onCancel ? <button type="button" onClick={onCancel}>Dismiss</button> : null}</div>;
  if (loading) return <div role="status" aria-live="polite" aria-busy="true">Loading…{onCancel ? <button type="button" onClick={onCancel}>Cancel</button> : null}</div>;
  return null;
}

export * from './identity.js';
