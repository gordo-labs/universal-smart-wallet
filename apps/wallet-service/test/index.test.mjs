import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryPlatformStore } from '@ssw/platform-store';
import { createWalletService } from '../dist/index.js';
import { createHash } from 'node:crypto';

const hash = (v) => createHash('sha256').update(v).digest('hex');
const service = () =>
  createWalletService({
    store: new InMemoryPlatformStore(),
    apiKeys: [
      {
        id: 'test',
        secretHash: hash('server-secret'),
        tenantId: 'tenant-a',
        scopes: ['wallets:write', 'transactions:write', 'webhooks:write'],
        kind: 'server',
      },
    ],
  });
const req = (path, init = {}) =>
  new Request(`http://localhost${path}`, {
    ...init,
    headers: { authorization: 'ApiKey server-secret', ...(init.headers ?? {}) },
  });

test('health is public and unknown versions fail closed', async () => {
  const s = service();
  assert.equal(
    (await s.handle(new Request('http://localhost/v1/health'))).status,
    200,
  );
  assert.equal(
    (await s.handle(new Request('http://localhost/v2/health'))).status,
    404,
  );
});
test('wallet mutations require idempotency and create a private DID', async () => {
  const s = service();
  const missing = await s.handle(
    req('/v1/wallets', { method: 'POST', body: '{}' }),
  );
  assert.equal(missing.status, 428);
  const headers = {
    'content-type': 'application/json',
    'idempotency-key': 'wallet-1',
  };
  const first = await s.handle(
    req('/v1/wallets', {
      method: 'POST',
      headers,
      body: JSON.stringify({ walletId: 'w1', chainId: 8453 }),
    }),
  );
  assert.equal(first.status, 201);
  const wallet = await first.json();
  assert.match(wallet.did, /^did:pkh:eip155:8453:0x/);
  const replay = await s.handle(
    req('/v1/wallets', {
      method: 'POST',
      headers,
      body: JSON.stringify({ walletId: 'w1', chainId: 8453 }),
    }),
  );
  assert.equal(replay.status, 200);
  assert.equal(replay.headers.get('idempotency-replayed'), 'true');
});
test('transaction rejects malformed/unknown fields and requires policy inputs', async () => {
  const s = service();
  const response = await s.handle(
    req('/v1/transactions', {
      method: 'POST',
      headers: {
        'idempotency-key': 'tx-1',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ walletId: 'missing', unexpected: true }),
    }),
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'UNKNOWN_FIELD');
});
test('tenant override cannot cross the authenticated tenant', async () => {
  const s = service();
  const response = await s.handle(
    req('/v1/wallets', { headers: { 'x-tenant-id': 'other' } }),
  );
  assert.equal(response.status, 403);
});
