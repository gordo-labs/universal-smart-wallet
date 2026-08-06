import { describe, expect, it } from 'vitest';
import {
  PlatformSchemaError,
  assertWalletLocatorTenant,
  createWalletLocator,
  parseAuthIdentity,
  parseAuditEvent,
  parseMigrationBundle,
  parseTransactionIntent,
  parseWallet,
  parseWalletLocator,
  serializeCanonical,
} from '../dist/index.js';

const base = {
  schemaVersion: 1,
  tenantId: 'tenant-demo',
  walletId: 'wallet-1',
};
const address = '0x1111111111111111111111111111111111111111';

describe('@ssw/platform-types', () => {
  it('creates opaque, tenant-scoped locators without leaking identifiers', async () => {
    const locator = await createWalletLocator(base);
    expect(locator).toMatch(/^wlt_v1_/u);
    expect(locator).not.toContain(base.tenantId);
    expect(locator).not.toContain(base.walletId);
    expect(parseWalletLocator(locator)).toBe(locator);
    await expect(assertWalletLocatorTenant({ locator, tenantId: base.tenantId, walletId: base.walletId })).resolves.toBe(locator);
    await expect(assertWalletLocatorTenant({ locator, tenantId: 'other-tenant', walletId: base.walletId })).rejects.toMatchObject({ code: 'LOCATOR_TENANT_MISMATCH' });
  });

  it('round-trips a bounded property set of locator inputs', async () => {
    for (let index = 0; index < 40; index += 1) {
      const tenantId = `tenant-${index}-opaque`;
      const walletId = `wallet-${index}-opaque`;
      const locator = await createWalletLocator({ tenantId, walletId });
      expect(parseWalletLocator(locator)).toBe(locator);
      await expect(assertWalletLocatorTenant({ locator, tenantId, walletId })).resolves.toBe(locator);
      await expect(assertWalletLocatorTenant({ locator, tenantId: `${tenantId}-other`, walletId })).rejects.toMatchObject({ code: 'LOCATOR_TENANT_MISMATCH' });
    }
  });

  it('rejects malformed locators and unknown fields', async () => {
    expect(() => parseWalletLocator('wlt_v1_email_subject')).toThrow(PlatformSchemaError);
    expect(() => parseWallet({
      schemaVersion: 1, walletId: 'w1', tenantId: 't1', locator: 'wlt_v1_bad', chainId: 84532,
      address, status: 'active', extra: true,
    })).toThrow(/unknown field/u);
    const locator = await createWalletLocator({ tenantId: 't1', walletId: 'w1' });
    expect(() => parseTransactionIntent({
      schemaVersion: 1, intentId: 'i1', walletLocator: locator, chainId: 84532, target: address,
      value: 1, data: '0x', expiresAt: '2026-08-04T00:00:00.000Z',
    })).toThrow(PlatformSchemaError);
  });

  it('fails closed for unsafe integers, bad hex, oversized fields, and missing versions', async () => {
    const locator = await createWalletLocator({ tenantId: 't1', walletId: 'w1' });
    expect(() => parseTransactionIntent({ schemaVersion: 1, intentId: 'i1', walletLocator: locator, chainId: Number.MAX_SAFE_INTEGER + 1, target: address, value: '0', data: '0x', expiresAt: '2026-08-04T00:00:00.000Z' })).toThrow(PlatformSchemaError);
    expect(() => parseAuthIdentity({ schemaVersion: 1, identityId: 'i1', principalId: 'p1', provider: 'email', subjectHash: '0x1', verifiedAt: '2026-08-04T00:00:00.000Z' })).toThrow(PlatformSchemaError);
    expect(() => parseAuditEvent({ schemaVersion: 1, eventId: 'e1', tenantId: 't1', eventType: 'x'.repeat(257), actorKind: 'system', outcome: 'accepted', resource: 'wallet', createdAt: '2026-08-04T00:00:00.000Z' })).toThrow(PlatformSchemaError);
    expect(() => parseMigrationBundle({ bundleId: 'b1' })).toThrow(PlatformSchemaError);
  });

  it('canonicalizes keys deterministically and rejects unsafe values/depth', () => {
    expect(serializeCanonical({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(serializeCanonical({ a: [true, null, 'x'] })).toBe('{"a":[true,null,"x"]}');
    expect(() => serializeCanonical(Number.MAX_SAFE_INTEGER + 1)).toThrow(/unsafe number/u);
    expect(() => serializeCanonical(Array.from({ length: 33 }, () => 1))).toThrow(/array exceeds/u);
    let value = 0;
    for (let index = 0; index < 10; index += 1) value = { nested: value };
    expect(() => serializeCanonical(value)).toThrow(/nesting/u);
  });
});
