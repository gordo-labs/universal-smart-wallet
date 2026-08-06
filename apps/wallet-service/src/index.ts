import { createHash, timingSafeEqual } from 'node:crypto';
import { jwtVerify } from 'jose';
import { createWalletLocator, type Wallet } from '@ssw/platform-types';
import type { StorePort } from '@ssw/platform-store';
import type { SignerPolicyEvaluator } from '@ssw/signer-policy';

export type AuthScope = 'browser' | 'server';
export type AuthContext = {
  tenantId: string;
  principalId: string;
  scope: AuthScope;
  scopes: readonly string[];
  sessionId: string;
  signerId: string;
  policyId: string;
};
export type ApiKey = {
  id: string;
  secretHash: string;
  tenantId: string;
  scopes: readonly string[];
  kind: AuthScope;
  revoked?: boolean;
};
export type JwtClaims = {
  tenantId: string;
  sub: string;
  scope?: AuthScope;
  sessionId?: string;
  signerId?: string;
  policyId?: string;
  exp?: number;
};
export type WalletServiceOptions = {
  store: StorePort;
  policy?: SignerPolicyEvaluator;
  jwtKey?: Uint8Array | CryptoKey;
  apiKeys?: readonly ApiKey[];
  now?: () => number;
  maxBodyBytes?: number;
  /** Defaults to Base Sepolia; callers must opt into another chain explicitly. */
  defaultChainId?: number;
};

export class WalletServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message = code,
  ) {
    super(message);
    this.name = 'WalletServiceError';
  }
}
const json = (
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
const fail = (status: number, code: string, message = code): never => {
  throw new WalletServiceError(status, code, message);
};
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const strict = (
  v: unknown,
  allowed: readonly string[],
): Record<string, unknown> => {
  if (!isRecord(v)) fail(400, 'INVALID_BODY');
  for (const k of Object.keys(v))
    if (!allowed.includes(k)) fail(400, 'UNKNOWN_FIELD');
  return v as Record<string, unknown>;
};
const id = (v: unknown, name: string): string => {
  if (typeof v !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/u.test(v))
    fail(400, 'INVALID_' + name.toUpperCase());
  return v as string;
};
const address = (v: unknown) => {
  if (
    typeof v !== 'string' ||
    !/^0x[0-9a-f]{40}$/iu.test(v) ||
    /^0x0+$/u.test(v)
  )
    fail(400, 'INVALID_ADDRESS');
  return (v as string).toLowerCase() as `0x${string}`;
};
const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
const nowSeconds = () => Math.floor(Date.now() / 1000);

export class WalletService {
  private readonly now: () => number;
  private readonly keys: readonly ApiKey[];
  private readonly maxBody: number;
  private readonly defaultChainId: number;
  constructor(private readonly options: WalletServiceOptions) {
    this.now = options.now ?? nowSeconds;
    this.keys = options.apiKeys ?? [];
    this.maxBody = options.maxBodyBytes ?? 64 * 1024;
    this.defaultChainId = options.defaultChainId ?? 84532;
  }

  async handle(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (!url.pathname.startsWith('/v1/'))
        return json({ error: { code: 'UNSUPPORTED_VERSION' } }, 404);
      if (request.method === 'GET' && url.pathname === '/v1/health')
        return json({ ok: true, version: 'v1' });
      const auth = await this.authenticate(request);
      const requestedTenant = request.headers.get('x-tenant-id');
      if (requestedTenant && requestedTenant !== auth.tenantId)
        fail(403, 'TENANT_MISMATCH');
      const parts = url.pathname.split('/').filter(Boolean);
      const walletId =
        parts[1] && parts[1] !== 'wallets' ? parts[1] : undefined;
      if (request.method === 'GET' && parts[1] === 'wallets' && !walletId)
        return await this.listWallets(auth);
      if (request.method === 'POST' && parts[1] === 'wallets' && !walletId)
        return await this.createWallet(request, auth);
      if (
        request.method === 'GET' &&
        parts[1] === 'wallets' &&
        walletId &&
        parts.length === 3 &&
        parts[2] === 'balances'
      )
        return await this.walletResource(auth, 'wallet', walletId);
      if (
        request.method === 'GET' &&
        parts[1] === 'wallets' &&
        walletId &&
        parts.length === 3 &&
        parts[2] === 'activity'
      )
        return await this.walletResource(auth, 'activity', walletId);
      if (request.method === 'GET' && parts[1] === 'wallets' && walletId)
        return await this.walletResource(auth, 'wallet', walletId);
      if (request.method === 'POST' && parts[1] === 'transactions')
        return await this.createTransaction(request, auth);
      if (request.method === 'POST' && parts[1] === 'webhooks') {
        this.requireScope(auth, 'webhooks:write');
        return json({ accepted: true });
      }
      return json({ error: { code: 'NOT_FOUND' } }, 404);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  private async authenticate(request: Request): Promise<AuthContext> {
    const header = request.headers.get('authorization');
    if (!header) fail(401, 'AUTH_REQUIRED');
    if (header.startsWith('ApiKey ')) {
      const raw = header.slice(7);
      const key = this.keys.find(
        (k) => !k.revoked && safeEqual(k.secretHash, sha256(raw)),
      );
      if (!key) fail(401, 'AUTH_INVALID');
      const principalId = `service:${key.id}`;
      return {
        tenantId: key.tenantId,
        principalId,
        scope: key.kind,
        scopes: key.scopes,
        sessionId: principalId,
        signerId: principalId,
        policyId: `policy:${key.id}`,
      };
    }
    if (!header.startsWith('Bearer ') || !this.options.jwtKey)
      fail(401, 'AUTH_INVALID');
    try {
      const { payload } = await jwtVerify(header.slice(7), this.options.jwtKey);
      const claims = payload as unknown as JwtClaims;
      if (!claims.tenantId || !claims.sub) fail(401, 'AUTH_INVALID');
      return {
        tenantId: id(claims.tenantId, 'tenant'),
        principalId: id(claims.sub, 'principal'),
        scope: claims.scope ?? 'browser',
        scopes:
          claims.scope === 'server'
            ? ['wallets:write', 'transactions:write', 'webhooks:write']
            : ['wallets:read'],
        sessionId: claims.sessionId ?? claims.sub,
        signerId: claims.signerId ?? claims.sub,
        policyId: claims.policyId ?? `policy:${claims.sub}`,
      };
    } catch (e) {
      if (e instanceof WalletServiceError) throw e;
      fail(401, 'AUTH_INVALID');
    }
  }
  private requireScope(auth: AuthContext, scope: string) {
    if (!auth.scopes.includes(scope)) fail(403, 'SCOPE_REQUIRED');
  }
  private async readBody(request: Request): Promise<Record<string, unknown>> {
    const length = Number(request.headers.get('content-length') ?? 0);
    if (length > this.maxBody) fail(413, 'BODY_TOO_LARGE');
    const text = await request.text();
    if (text.length > this.maxBody) fail(413, 'BODY_TOO_LARGE');
    try {
      return strict(JSON.parse(text), []);
    } catch (e) {
      if (e instanceof WalletServiceError && e.code === 'UNKNOWN_FIELD')
        throw e;
      fail(400, 'INVALID_JSON');
    }
  }
  private tenant(request: Request, auth: AuthContext) {
    const requested = request.headers.get('x-tenant-id');
    if (requested && requested !== auth.tenantId) fail(403, 'TENANT_MISMATCH');
    return { tenantId: auth.tenantId };
  }
  private async listWallets(auth: AuthContext) {
    return json(
      await this.options.store.list<Wallet>(
        { tenantId: auth.tenantId },
        'wallet',
      ),
    );
  }
  private async createWallet(request: Request, auth: AuthContext) {
    this.requireScope(auth, 'wallets:write');
    const key = request.headers.get('idempotency-key');
    if (!key) fail(428, 'IDEMPOTENCY_REQUIRED');
    const bodyRaw = await request.text();
    if (bodyRaw.length > this.maxBody) fail(413, 'BODY_TOO_LARGE');
    let body: Record<string, unknown>;
    try {
      body = strict(JSON.parse(bodyRaw), [
        'walletId',
        'chainId',
        'address',
        'did',
      ]);
    } catch (e) {
      if (e instanceof WalletServiceError) throw e;
      fail(400, 'INVALID_JSON');
    }
    const tenant = { tenantId: auth.tenantId };
    const walletId = id(
      body.walletId ??
        `wallet-${sha256(`${auth.tenantId}:${bodyRaw}`).slice(0, 16)}`,
      'walletId',
    );
    const chainId =
      body.chainId === undefined ? this.defaultChainId : body.chainId;
    if (!Number.isSafeInteger(chainId) || (chainId as number) < 1)
      fail(400, 'INVALID_CHAIN');
    const addr =
      body.address === undefined
        ? (`0x${sha256(`${auth.tenantId}:${walletId}`).slice(0, 40)}` as `0x${string}`)
        : address(body.address);
    const locator = await createWalletLocator({
      tenantId: auth.tenantId,
      walletId,
    });
    const wallet: Wallet = {
      schemaVersion: 1,
      walletId,
      tenantId: auth.tenantId,
      locator,
      chainId: chainId as number,
      address: addr,
      status: 'active',
      did:
        typeof body.did === 'string'
          ? body.did
          : `did:pkh:eip155:${chainId}:${addr}`,
    };
    const result = await this.options.store.runIdempotent(
      tenant,
      key,
      sha256(bodyRaw),
      () => this.options.store.put(tenant, 'wallet', wallet),
    );
    await this.audit(auth, 'wallet.create', `wallet:${walletId}`, 'accepted');
    return json(result.value, result.replayed ? 200 : 201, {
      'idempotency-replayed': String(result.replayed),
    });
  }
  private async walletResource(
    auth: AuthContext,
    kind: 'wallet' | 'activity',
    walletId: string,
  ) {
    const value =
      kind === 'wallet'
        ? await this.options.store.get<Wallet>(
            { tenantId: auth.tenantId },
            'wallet',
            id(walletId, 'walletId'),
          )
        : (
            await this.options.store.list({ tenantId: auth.tenantId }, 'intent')
          ).filter(
            (item) => (item as { walletLocator?: string }).walletLocator,
          );
    if (!value || (Array.isArray(value) && value.length === 0))
      fail(404, 'NOT_FOUND');
    return json(value);
  }
  private async createTransaction(request: Request, auth: AuthContext) {
    this.requireScope(auth, 'transactions:write');
    const key = request.headers.get('idempotency-key');
    if (!key) fail(428, 'IDEMPOTENCY_REQUIRED');
    const bodyRaw = await request.text();
    if (bodyRaw.length > this.maxBody) fail(413, 'BODY_TOO_LARGE');
    let body: Record<string, unknown>;
    try {
      body = strict(JSON.parse(bodyRaw), [
        'walletId',
        'chainId',
        'target',
        'value',
        'data',
        'expiresAt',
        'requestId',
        'selector',
        'amount',
        'operation',
      ]);
    } catch (e) {
      if (e instanceof WalletServiceError) throw e;
      fail(400, 'INVALID_JSON');
    }
    const walletId = id(body.walletId, 'walletId');
    const wallet = await this.options.store.get(
      auth as unknown as { tenantId: string },
      'wallet',
      walletId,
    );
    if (!wallet) fail(404, 'NOT_FOUND');
    if (this.options.policy) {
      const required = ['requestId', 'selector', 'operation'];
      for (const k of required)
        if (typeof body[k] !== 'string') fail(400, 'POLICY_INPUT_REQUIRED');
      const decision = await this.options.policy.authorize({
        requestId: body.requestId as string,
        sessionId: auth.sessionId,
        signerId: auth.signerId,
        policyId: auth.policyId,
        chainId: Number(body.chainId ?? (wallet as Wallet).chainId),
        target: address(body.target),
        selector: body.selector as `0x${string}`,
        operation: body.operation as never,
        amount: BigInt(String(body.amount ?? '0')),
        value: BigInt(String(body.value ?? '0')),
        at: this.now(),
      });
      if (!decision.allowed) fail(403, `POLICY_${decision.reasonCode}`);
    }
    const tenant = { tenantId: auth.tenantId };
    const intent: any = {
      schemaVersion: 1,
      intentId: id(body.requestId, 'requestId'),
      walletLocator: (wallet as Wallet).locator,
      chainId: Number(body.chainId ?? (wallet as Wallet).chainId),
      target: address(body.target),
      value: String(body.value ?? '0'),
      data: typeof body.data === 'string' ? body.data : '0x',
      expiresAt:
        typeof body.expiresAt === 'string'
          ? body.expiresAt
          : new Date((this.now() + 600) * 1000).toISOString(),
    };
    const result = await this.options.store.runIdempotent(
      tenant,
      key,
      sha256(bodyRaw),
      () => this.options.store.put(tenant, 'intent', intent),
    );
    await this.audit(
      auth,
      'transaction.create',
      `intent:${intent.intentId}`,
      'accepted',
    );
    return json(result.value, result.replayed ? 200 : 202, {
      'idempotency-replayed': String(result.replayed),
    });
  }
  private async audit(
    auth: AuthContext,
    eventType: string,
    resource: string,
    outcome: 'accepted' | 'rejected',
  ) {
    try {
      await this.options.store.appendAudit(
        { tenantId: auth.tenantId },
        {
          tenantId: auth.tenantId,
          eventId: `evt-${sha256(`${eventType}:${resource}:${this.now()}`).slice(0, 24)}`,
          eventType,
          actorKind: auth.scope === 'server' ? 'service' : 'user',
          outcome,
          resource,
          createdAt: new Date(this.now() * 1000).toISOString(),
        },
      );
    } catch {
      /* audit failures never expose sensitive input */
    }
  }
  private errorResponse(error: unknown): Response {
    if (error instanceof WalletServiceError)
      return json(
        { error: { code: error.code, message: error.message } },
        error.status,
      );
    return json({ error: { code: 'INTERNAL_ERROR' } }, 500);
  }
}
export const createWalletService = (options: WalletServiceOptions) =>
  new WalletService(options);
export const openApi = {
  openapi: '3.1.0',
  info: { title: 'Universal Smart Wallet Service', version: '1.0.0' },
  paths: {
    '/v1/health': { get: { responses: { '200': { description: 'healthy' } } } },
    '/v1/wallets': {
      get: { responses: { '200': { description: 'wallets' } } },
      post: {
        responses: {
          '201': { description: 'created' },
          '428': { description: 'idempotency required' },
        },
      },
    },
    '/v1/transactions': {
      post: {
        responses: {
          '202': { description: 'accepted' },
          '403': { description: 'policy denied' },
        },
      },
    },
  },
} as const;
