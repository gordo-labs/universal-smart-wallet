import { decodeJwt, decodeProtectedHeader, importJWK, jwtVerify, type JWK } from 'jose';

export const OIDC_SCHEMA_VERSION = 1 as const;
export type OidcProvider = { readonly issuer: string; readonly clientId: string; readonly authorizationEndpoint?: string; readonly scopes?: readonly string[] };
export type OidcDiscovery = { issuer: string; authorization_endpoint: string; token_endpoint: string; jwks_uri: string; response_types_supported?: string[] };
export type OidcFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type OidcFetchPolicy = { readonly maxBytes?: number; readonly allowedHosts?: readonly string[]; readonly timeoutMs?: number };
export type OidcState = { readonly state: string; readonly nonce: string; readonly verifier: string; readonly provider: string; readonly redirectUri: string; readonly expiresAt: number; readonly linking: boolean };
export type OidcIdentity = { readonly issuer: string; readonly subject: string; readonly provider: string; readonly email?: string; readonly emailVerified?: boolean };
export type OidcAccount = { readonly accountId: string; readonly recoveryFactors: number; readonly identities: readonly OidcIdentity[] };
export interface OidcStateStore { put(state: OidcState): Promise<void>; consume(state: string): Promise<OidcState | undefined> }
export interface OidcIdentityStore { find(issuer: string, subject: string): Promise<OidcAccount | undefined>; attach(accountId: string, identity: OidcIdentity): Promise<void>; create(identity: OidcIdentity): Promise<OidcAccount> ; detach(accountId: string, issuer: string, subject: string): Promise<void> }
export interface OidcTokenExchanger { exchange(input: { code: string; verifier: string; redirectUri: string; clientId: string; tokenEndpoint: string }): Promise<{ id_token: string; access_token?: string }> }

export class OidcAuthError extends Error {
  constructor(readonly code: OidcAuthErrorCode, message = code) { super(message); this.name = 'OidcAuthError'; }
}
export type OidcAuthErrorCode = 'INVALID_PROVIDER'|'DISCOVERY_FAILED'|'SSRF_BLOCKED'|'RESPONSE_TOO_LARGE'|'STATE_NOT_FOUND'|'STATE_EXPIRED'|'CALLBACK_ERROR'|'TOKEN_EXCHANGE_FAILED'|'INVALID_TOKEN'|'ISSUER_MISMATCH'|'AUDIENCE_MISMATCH'|'NONCE_MISMATCH'|'TOKEN_EXPIRED'|'SIGNATURE_INVALID'|'IDENTITY_COLLISION'|'LINK_REQUIRES_AUTH'|'RECOVERY_REQUIRED'|'IDENTITY_NOT_FOUND';

const random = (n = 32) => { const b = new Uint8Array(n); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replaceAll('+','-').replaceAll('/','_').replaceAll('=',''); };
const sha256 = async (v: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));
const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
export const pkceChallenge = async (verifier: string) => b64url(await sha256(verifier));
const origin = (issuer: string) => { const u = new URL(issuer); if (u.protocol !== 'https:') throw new OidcAuthError('SSRF_BLOCKED'); return u; };

export async function discover(provider: OidcProvider, fetcher: OidcFetcher = fetch, policy: OidcFetchPolicy = {}): Promise<OidcDiscovery> {
  const issuer = origin(provider.issuer); if (policy.allowedHosts && !policy.allowedHosts.includes(issuer.hostname)) throw new OidcAuthError('SSRF_BLOCKED');
  const url = new URL('.well-known/openid-configuration', issuer); const response = await fetchLimited(fetcher, url, policy); if (!response.ok) throw new OidcAuthError('DISCOVERY_FAILED');
  const value = await response.json() as OidcDiscovery; if (value.issuer.replace(/\/$/,'') !== provider.issuer.replace(/\/$/,'') || !value.jwks_uri.startsWith('https://')) throw new OidcAuthError('DISCOVERY_FAILED');
  return value;
}
async function fetchLimited(fetcher: OidcFetcher, url: URL, policy: OidcFetchPolicy): Promise<Response> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), policy.timeoutMs ?? 5000);
  try { const response = await fetcher(url, { signal: controller.signal }); const max = policy.maxBytes ?? 1_000_000; const len = Number(response.headers.get('content-length') ?? 0); if (len > max) throw new OidcAuthError('RESPONSE_TOO_LARGE'); const bytes = await response.arrayBuffer(); if (bytes.byteLength > max) throw new OidcAuthError('RESPONSE_TOO_LARGE'); return new Response(bytes, { status: response.status, headers: response.headers }); } catch (e) { if (e instanceof OidcAuthError) throw e; throw new OidcAuthError('DISCOVERY_FAILED'); } finally { clearTimeout(timer); }
}

export class InMemoryOidcStateStore implements OidcStateStore { private readonly values = new Map<string, OidcState>(); async put(v: OidcState) { this.values.set(v.state, v); } async consume(k: string) { const v = this.values.get(k); this.values.delete(k); return v; } }
export const googleProvider = (clientId: string): OidcProvider => ({ issuer: 'https://accounts.google.com', clientId, scopes: ['openid','profile','email'] });
export const appleProvider = (clientId: string): OidcProvider => ({ issuer: 'https://appleid.apple.com', clientId, scopes: ['openid','email','name'] });

export async function verifyIdToken(token: string, input: { issuer: string; audience: string; nonce: string; jwks: { keys: JWK[] }; now?: number }): Promise<OidcIdentity> {
  try { const header = decodeProtectedHeader(token); const unverified = decodeJwt(token); if (unverified.iss !== input.issuer) throw new OidcAuthError('ISSUER_MISMATCH'); const audiences = Array.isArray(unverified.aud) ? unverified.aud : [unverified.aud]; if (!audiences.includes(input.audience)) throw new OidcAuthError('AUDIENCE_MISMATCH'); if (typeof unverified.exp !== 'number' || unverified.exp <= (input.now ?? Math.floor(Date.now()/1000)) - 5) throw new OidcAuthError('TOKEN_EXPIRED'); if (unverified.nonce !== input.nonce) throw new OidcAuthError('NONCE_MISMATCH'); const jwk = input.jwks.keys.find(k => k.kid === header.kid && (!k.alg || k.alg === header.alg)); if (!jwk) throw new OidcAuthError('SIGNATURE_INVALID'); const key = await importJWK(jwk, header.alg); const result = await jwtVerify(token, key, { issuer: input.issuer, audience: input.audience, clockTolerance: 5 }); const p = result.payload; if (typeof p.sub !== 'string') throw new OidcAuthError('INVALID_TOKEN'); return { issuer: input.issuer.replace(/\/$/,''), subject: p.sub, provider: input.issuer, email: typeof p.email === 'string' ? p.email : undefined, emailVerified: p.email_verified === true }; } catch (e) { if (e instanceof OidcAuthError) throw e; throw new OidcAuthError('SIGNATURE_INVALID'); }
}

export class OidcAuthService {
  constructor(private readonly states: OidcStateStore, private readonly identities: OidcIdentityStore, private readonly exchange: OidcTokenExchanger, private readonly fetcher: OidcFetcher = fetch, private readonly policy: OidcFetchPolicy = {}) {}
  async startLogin(provider: OidcProvider, redirectUri: string, linking = false, now = Math.floor(Date.now()/1000)): Promise<{ authorizationUrl: string; state: OidcState }> {
    const discovery = await discover(provider, this.fetcher, this.policy); const state: OidcState = { state: random(), nonce: random(24), verifier: random(48), provider: provider.issuer, redirectUri, expiresAt: now + 600, linking }; await this.states.put(state); const url = new URL(provider.authorizationEndpoint ?? discovery.authorization_endpoint); url.searchParams.set('response_type','code'); url.searchParams.set('client_id',provider.clientId); url.searchParams.set('redirect_uri',redirectUri); url.searchParams.set('scope',(provider.scopes ?? ['openid']).join(' ')); url.searchParams.set('state',state.state); url.searchParams.set('nonce',state.nonce); url.searchParams.set('code_challenge',await pkceChallenge(state.verifier)); url.searchParams.set('code_challenge_method','S256'); return { authorizationUrl: url.toString(), state };
  }
  async callback(provider: OidcProvider, params: { code?: string; state?: string; error?: string; authenticatedAccountId?: string }, now = Math.floor(Date.now()/1000)): Promise<{ account: OidcAccount; identity: OidcIdentity }> {
    if (params.error || !params.code || !params.state) throw new OidcAuthError('CALLBACK_ERROR'); const state = await this.states.consume(params.state); if (!state) throw new OidcAuthError('STATE_NOT_FOUND'); if (state.expiresAt <= now) throw new OidcAuthError('STATE_EXPIRED'); if (state.provider.replace(/\/$/,'') !== provider.issuer.replace(/\/$/,'')) throw new OidcAuthError('ISSUER_MISMATCH'); const discovery = await discover(provider, this.fetcher, this.policy); const tokens = await this.exchange.exchange({code: params.code, verifier: state.verifier, redirectUri: state.redirectUri, clientId: provider.clientId, tokenEndpoint: discovery.token_endpoint}); const jwksResponse = await fetchLimited(this.fetcher, new URL(discovery.jwks_uri), this.policy); if (!jwksResponse.ok) throw new OidcAuthError('DISCOVERY_FAILED'); const identity = await verifyIdToken(tokens.id_token, {issuer: discovery.issuer, audience: provider.clientId, nonce: state.nonce, jwks: await jwksResponse.json()}); const existing = await this.identities.find(identity.issuer, identity.subject); if (state.linking) { if (!params.authenticatedAccountId) throw new OidcAuthError('LINK_REQUIRES_AUTH'); if (existing && existing.accountId !== params.authenticatedAccountId) throw new OidcAuthError('IDENTITY_COLLISION'); await this.identities.attach(params.authenticatedAccountId, identity); const account = await this.identities.find(identity.issuer, identity.subject); if (!account) throw new OidcAuthError('IDENTITY_NOT_FOUND'); return { account, identity }; } const account = existing ?? await this.identities.create(identity); return { account, identity };
  }
  async unlink(accountId: string, identity: Pick<OidcIdentity, 'issuer'|'subject'>, authenticatedFactor: boolean): Promise<void> {
    if (!authenticatedFactor) throw new OidcAuthError('LINK_REQUIRES_AUTH'); const account = await this.identities.find(identity.issuer, identity.subject); if (!account || account.accountId !== accountId) throw new OidcAuthError('IDENTITY_NOT_FOUND'); if (account.recoveryFactors < 1) throw new OidcAuthError('RECOVERY_REQUIRED'); await this.identities.detach(accountId, identity.issuer, identity.subject);
  }
}
