import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemorySignerOperations } from './signer-operations';
import { InMemoryTrustStatusStore } from './trust-status';
import { RedactedAuditStore, redactAuditEvent } from './redacted-audit';

const owner = { tenantId: 'uni-a', principalId: 'owner-1', role: 'institutional-owner' as const };
const viewer = { tenantId: 'uni-a', principalId: 'viewer-1', role: 'institutional-viewer' as const };
const editor = { tenantId: 'uni-a', principalId: 'editor-1', role: 'template-editor' as const };

test('signer rotation is opaque, idempotent, and fails closed on ambiguity', async () => {
  const store = new InMemorySignerOperations();
  store.setHealth(owner, {
    tenantId: 'uni-a', signerId: 'primary', provider: 'aws-kms', algorithm: 'ES256',
    keyVersion: 'v1', lifecycle: 'active', health: 'healthy', checkedAt: 100,
  });
  const request = store.requestRotation(owner, {
    tenantId: 'uni-a', rotationId: 'rotation-1', currentSignerId: 'primary',
    currentKeyVersion: 'v1', replacementSignerId: 'standby', replacementKeyVersion: 'v2', requestedAt: 101,
  });
  assert.equal(store.requestRotation(owner, {
    tenantId: 'uni-a', rotationId: 'rotation-1', currentSignerId: 'primary',
    currentKeyVersion: 'v1', replacementSignerId: 'standby', replacementKeyVersion: 'v2', requestedAt: 101,
  }), request);
  assert.throws(() => store.requestRotation(owner, {
    tenantId: 'uni-a', rotationId: 'rotation-1', currentSignerId: 'primary',
    currentKeyVersion: 'v0', replacementSignerId: 'standby', replacementKeyVersion: 'v2',
  }), (error: any) => error.code === 'ROTATION_AMBIGUOUS');
  const result = await store.rotateWithProvider(owner, {
    check: () => 'healthy',
    rotate: () => { throw new Error('provider token=must-not-leak'); },
  }, 'uni-a', 'rotation-1').catch((error) => error);
  assert.equal(result.code, 'PROVIDER_ERROR');
  assert.equal(store.getRotation(owner, 'uni-a', 'rotation-1').state, 'ambiguous');
  assert.equal(Object.keys(store.getHealth(viewer, 'uni-a', 'primary')).includes('secret'), false);
});

test('trust status is tenant scoped and unknown or stale is never active', () => {
  const store = new InMemoryTrustStatusStore();
  const trusted = store.upsert(owner, 'uni-a', {
    authorityId: 'authority-a', profileId: 'profile-1', configured: 'trusted', version: 'v1', observedAt: 100,
  }, 110, 1000);
  assert.equal(trusted.active, true);
  assert.equal(store.resolve(viewer, 'uni-a', 'authority-a', 'missing', 110).active, false);
  assert.equal(store.resolve(viewer, 'uni-a', 'authority-a', 'profile-1', 1200, 1000).effective, 'stale');
  assert.equal(store.resolve(viewer, 'uni-a', 'authority-a', 'profile-1', 1200, 1000).active, false);
  assert.throws(() => store.upsert(editor, 'uni-a', {
    authorityId: 'authority-a', profileId: 'profile-2', configured: 'trusted', version: 'v1', observedAt: 100,
  }), (error: any) => error.code === 'FORBIDDEN');
});

test('audit output filters PII and credential material and isolates tenants', () => {
  const store = new RedactedAuditStore();
  const event = store.append(owner, {
    id: 'audit-1', tenantId: 'uni-a', action: 'issuer.rotate', outcome: 'allowed', actorRef: 'principal-1', at: 100,
    metadata: { safe: 'ok', email: 'person@example.test', credential: { vc: 'secret' }, token: 'abc', count: 2 },
  });
  assert.deepEqual(event.metadata, { safe: 'ok', count: 2 });
  assert.equal(store.list(viewer, 'uni-a').length, 1);
  assert.throws(() => store.list(viewer, 'uni-b'), (error: any) => error.code === 'TENANT_MISMATCH');
  assert.throws(() => redactAuditEvent({
    id: 'audit-2', tenantId: 'uni-a', action: 'issuer.rotate', outcome: 'allowed', actorRef: 'person@example.test', at: 100,
  }), (error: any) => error.code === 'INVALID_REQUEST');
});
