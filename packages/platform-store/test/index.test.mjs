import { describe, expect, it } from 'vitest';
import {
  InMemoryPlatformStore,
  StoreError,
  AuditRedactionError,
  redactAuditEvent,
  MIGRATIONS,
  migrate,
  rollbackLatest,
} from '../dist/index.js';
import { createWalletLocator } from '../../platform-types/dist/index.js';

const address = '0x1111111111111111111111111111111111111111';
const at = '2026-08-04T10:00:00.000Z';
const base = { tenantId: 'tenant-a', walletId: 'wallet-a' };
const wallet = async (tenantId = base.tenantId, walletId = base.walletId) => ({
  schemaVersion: 1,
  walletId,
  tenantId,
  locator: await createWalletLocator({ tenantId, walletId }),
  chainId: 84532,
  address,
  status: 'active',
});

describe('@ssw/platform-store', () => {
  it('strictly scopes reads, writes and listings to a tenant', async () => {
    const store = new InMemoryPlatformStore();
    await store.put({ tenantId: 'tenant-a' }, 'wallet', await wallet());
    await store.put(
      { tenantId: 'tenant-b' },
      'wallet',
      await wallet('tenant-b', 'wallet-b'),
    );
    await expect(
      store.get({ tenantId: 'tenant-b' }, 'wallet', 'wallet-a'),
    ).resolves.toBeUndefined();
    await expect(
      store.list({ tenantId: 'tenant-a' }, 'wallet'),
    ).resolves.toHaveLength(1);
    await expect(
      store.put({ tenantId: 'tenant-b' }, 'wallet', await wallet()),
    ).rejects.toMatchObject({ code: 'TENANT_INVALID' });
  });

  it('prevents locator tenant escape for locator-backed records', async () => {
    const store = new InMemoryPlatformStore();
    const value = await wallet();
    await expect(
      store.put({ tenantId: 'tenant-b' }, 'wallet', value),
    ).rejects.toMatchObject({ code: 'TENANT_INVALID' });
    await expect(
      store.put({ tenantId: 'tenant-a' }, 'signer', {
        schemaVersion: 1,
        signerId: 's1',
        walletLocator: value.locator,
        kind: 'operational',
        status: 'active',
      }),
    ).resolves.toMatchObject({ signerId: 's1' });
  });

  it('collapses concurrent idempotent operations into one result', async () => {
    const store = new InMemoryPlatformStore();
    let runs = 0;
    const operation = async () => {
      runs += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { accepted: true };
    };
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        store.runIdempotent(
          { tenantId: 'tenant-a' },
          'request-1',
          'hash-1',
          operation,
        ),
      ),
    );
    expect(runs).toBe(1);
    expect(results.filter((item) => !item.replayed)).toHaveLength(1);
    expect(results.every((item) => item.value.accepted)).toBe(true);
    await expect(
      store.runIdempotent(
        { tenantId: 'tenant-a' },
        'request-1',
        'hash-2',
        operation,
      ),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });

  it('does not retain a failed idempotent operation', async () => {
    const store = new InMemoryPlatformStore();
    let failures = 0;
    await expect(
      store.runIdempotent(
        { tenantId: 'tenant-a' },
        'request-2',
        'hash-2',
        async () => {
          failures += 1;
          throw new Error('storage unavailable');
        },
      ),
    ).rejects.toThrow('storage unavailable');
    await expect(
      store.runIdempotent(
        { tenantId: 'tenant-a' },
        'request-2',
        'hash-2',
        async () => {
          failures += 1;
          return 'retry';
        },
      ),
    ).resolves.toMatchObject({ value: 'retry', replayed: false });
    expect(failures).toBe(2);
  });

  it('redacts and rejects sensitive audit data before persistence', async () => {
    expect(() =>
      redactAuditEvent({
        eventId: 'e1',
        tenantId: 'tenant-a',
        eventType: 'wallet.created',
        actorKind: 'system',
        outcome: 'accepted',
        resource: 'wlt_v1_opaque',
        createdAt: at,
        metadata: { policyVersion: 'p1', chainId: 84532 },
      }),
    ).not.toThrow();
    expect(() =>
      redactAuditEvent({
        eventId: 'e2',
        tenantId: 'tenant-a',
        eventType: 'wallet.created',
        actorKind: 'system',
        outcome: 'accepted',
        resource: 'wlt_v1_opaque',
        createdAt: at,
        metadata: { email: 'person@example.test' },
      }),
    ).toThrow(AuditRedactionError);
    expect(() =>
      redactAuditEvent({
        eventId: 'e2b',
        tenantId: 'tenant-a',
        eventType: 'wallet.created',
        actorKind: 'system',
        outcome: 'accepted',
        resource: 'wlt_v1_opaque',
        createdAt: at,
        metadata: { details: { email: 'person@example.test' } },
      }),
    ).toThrow(AuditRedactionError);
    const store = new InMemoryPlatformStore();
    await expect(
      store.appendAudit(
        { tenantId: 'tenant-a' },
        {
          eventId: 'e3',
          tenantId: 'tenant-a',
          eventType: 'wallet.created',
          actorKind: 'system',
          outcome: 'accepted',
          resource: 'wlt_v1_opaque',
          createdAt: at,
          metadata: { otp: '123456' },
        },
      ),
    ).rejects.toThrow(AuditRedactionError);
    await expect(
      store.listAudit({ tenantId: 'tenant-a' }),
    ).resolves.toHaveLength(0);
  });

  it('keeps audit append-only and tenant isolated', async () => {
    const store = new InMemoryPlatformStore();
    await store.appendAudit(
      { tenantId: 'tenant-a' },
      {
        eventId: 'e1',
        tenantId: 'tenant-a',
        eventType: 'wallet.created',
        actorKind: 'system',
        outcome: 'accepted',
        resource: 'wlt_v1_opaque',
        createdAt: at,
      },
    );
    await expect(
      store.appendAudit(
        { tenantId: 'tenant-a' },
        {
          eventId: 'e1',
          tenantId: 'tenant-a',
          eventType: 'wallet.created',
          actorKind: 'system',
          outcome: 'accepted',
          resource: 'wlt_v1_opaque',
          createdAt: at,
        },
      ),
    ).rejects.toMatchObject({ code: 'STORAGE_FAILURE' });
    await expect(
      store.listAudit({ tenantId: 'tenant-b' }),
    ).resolves.toHaveLength(0);
  });

  it('uses atomic, reversible PostgreSQL migration statements', async () => {
    const calls = [];
    const db = {
      query: async (sql) => {
        calls.push(sql);
        return { rows: [] };
      },
    };
    await migrate(db);
    expect(calls).toEqual(['BEGIN', MIGRATIONS[0].up, 'COMMIT']);
    calls.length = 0;
    await rollbackLatest(db);
    expect(calls).toEqual(['BEGIN', MIGRATIONS[0].down, 'COMMIT']);
    expect(MIGRATIONS[0].up).toContain(
      'PRIMARY KEY (tenant_id, idempotency_key)',
    );
  });
});
