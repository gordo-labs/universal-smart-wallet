import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assuranceAllowed,
  assertSameTenant,
  parseIssuerProfile,
} from '../../packages/credential-domain/dist/index.js';
import { evaluateSelfIssuedPolicy } from '../../packages/self-issued-credentials/dist/index.js';
import {
  SignedSnapshotCache,
  signRegistrySnapshot,
} from '../../packages/trust-registry/dist/index.js';
import {
  InMemoryIssuerOperationStore,
  InstitutionalIssuerSigner,
  IssuerSignerError,
  opaqueIssuerKeyRef,
} from '../../packages/issuer-signer/dist/index.js';

const scope = { tenantId: 'tenant-a', jurisdiction: 'ES-test' };
const issuerUri = 'https://issuer.synthetic.example';
const issuerId = 'https://issuer.synthetic.example/issuer';
const schemaId = 'urn:ssw:synthetic:identity:v1';

const snapshotInput = (overrides = {}) => ({
  schemaVersion: 1,
  snapshotId: 'snapshot-identity-1',
  ...scope,
  sequence: 1,
  issuedAt: 600,
  expiresAt: 10_000,
  signingKeyId: 'registry-key-1',
  issuers: [
    {
      issuerId,
      status: 'active',
      schemas: [{ schemaId, status: 'active' }],
      keys: [
        {
          keyId: 'issuer-key-old',
          status: 'retired',
          authorizedFrom: 100,
          authorizedUntil: 500,
        },
        { keyId: 'issuer-key-current', status: 'active', authorizedFrom: 500 },
      ],
      trustMarks: ['synthetic-test'],
    },
  ],
  rotations: [
    {
      issuerId,
      previousKeyId: 'issuer-key-old',
      newKeyId: 'issuer-key-current',
      rotatedAt: 500,
    },
  ],
  statuses: [
    { issuerId, statusId: 'status-valid', status: 'valid', updatedAt: 90 },
    {
      issuerId,
      statusId: 'status-suspended',
      status: 'suspended',
      updatedAt: 90,
    },
    { issuerId, statusId: 'status-revoked', status: 'revoked', updatedAt: 90 },
  ],
  ...overrides,
});

const fixtureSignature = ({ scope: signedScope, keyId, payload }) =>
  `fixture.${signedScope.tenantId}.${signedScope.jurisdiction}.${keyId}.${payload.length}`;

const signer = { sign: async (request) => fixtureSignature(request) };
const verifier = {
  verify: async (request) =>
    request.keyId === 'registry-key-1' &&
    request.signature === fixtureSignature(request),
};

test('self-attested credentials cannot escalate assurance or satisfy institutional policy', () => {
  assert.equal(
    assuranceAllowed('self_attested', {
      schemaVersion: 1,
      tenantId: scope.tenantId,
      policyId: 'institutional-policy',
      acceptedTemplateIds: ['synthetic-template'],
      acceptedAssurance: ['institutional'],
      requiredClaims: ['credentialRef'],
      maxStatusAgeSeconds: 300,
    }),
    false,
  );
  assert.deepEqual(
    evaluateSelfIssuedPolicy(
      {
        status: 'verified',
        assurance: 'self_attested',
        holderControlled: true,
      },
      { kind: 'institutional', acceptedAssurance: ['institutional'] },
    ),
    { status: 'rejected', reasonCode: 'INSTITUTIONAL_ASSURANCE_REQUIRED' },
  );
  assert.throws(
    () =>
      parseIssuerProfile({
        schemaVersion: 1,
        tenantId: scope.tenantId,
        issuerId: 'issuer-a',
        issuerUri,
        assurance: 'self_attested',
        keyRef: 'opaque-key-v1',
        authorizedTemplateIds: ['synthetic-template'],
      }),
    /institutional issuer requires institutional assurance/u,
  );
});

test('tenant and jurisdiction escapes are indeterminate and never verified', async () => {
  assert.throws(
    () => assertSameTenant({ tenantId: 'tenant-a' }, { tenantId: 'tenant-b' }),
    /cross-tenant reference rejected/u,
  );
  const signed = await signRegistrySnapshot(snapshotInput(), signer);
  const cache = new SignedSnapshotCache(
    { load: async () => signed },
    verifier,
    { clock: () => 1_000 },
  );
  await cache.prime(signed);
  const base = {
    ...scope,
    issuerId,
    schemaId,
    keyId: 'issuer-key-current',
    issuedAt: 600,
    now: 1_000,
  };
  assert.deepEqual(
    await cache.evaluateTrust({ ...base, tenantId: 'tenant-b' }),
    { decision: 'indeterminate', code: 'SNAPSHOT_INVALID' },
  );
  assert.deepEqual(
    await cache.evaluateTrust({ ...base, jurisdiction: 'FR-test' }),
    { decision: 'indeterminate', code: 'SNAPSHOT_INVALID' },
  );
});

test('key rotation preserves pre-rotation verification and rejects old-key signing', async () => {
  const oldKey = opaqueIssuerKeyRef('kms://synthetic/identity/v1');
  const nextKey = opaqueIssuerKeyRef('kms://synthetic/identity/v2');
  const descriptors = new Map([
    [
      oldKey,
      { keyRef: oldKey, algorithm: 'ES256', status: 'active', version: 'v1' },
    ],
    [
      nextKey,
      { keyRef: nextKey, algorithm: 'ES256', status: 'standby', version: 'v2' },
    ],
  ]);
  const adapter = {
    describeKey: async (keyRef) => descriptors.get(keyRef),
    sign: async ({ keyRef }) => ({
      status: 'signed',
      signature: new Uint8Array([7]),
      algorithm: 'ES256',
      keyVersion: descriptors.get(keyRef).version,
    }),
    rotate: async ({ currentKeyRef, nextKeyRef }) => {
      descriptors.set(currentKeyRef, {
        ...descriptors.get(currentKeyRef),
        status: 'rotated',
      });
      descriptors.set(nextKeyRef, {
        ...descriptors.get(nextKeyRef),
        status: 'active',
      });
      return { status: 'completed' };
    },
    disable: async ({ keyRef }) => {
      descriptors.set(keyRef, {
        ...descriptors.get(keyRef),
        status: 'disabled',
      });
      return { status: 'completed' };
    },
  };
  const approvals = {
    approvalsFor: async (context) =>
      ['reviewer-a', 'reviewer-b'].map((approverId) => ({
        approvalId: `${context.requestId}-${approverId}`,
        approverId,
        ...context,
        approvedAt: context.at - 1,
        expiresAt: context.at + 60,
      })),
  };
  const audit = [];
  const signerPort = new InstitutionalIssuerSigner(
    adapter,
    approvals,
    new InMemoryIssuerOperationStore(),
    { append: async (event) => audit.push(event) },
  );
  await signerPort.rotate({
    requestId: 'rotate-identity-1',
    tenantId: scope.tenantId,
    currentKeyRef: oldKey,
    nextKeyRef: nextKey,
    at: 700,
  });
  await assert.rejects(
    () =>
      signerPort.sign({
        requestId: 'old-key-sign-1',
        tenantId: scope.tenantId,
        keyRef: oldKey,
        algorithm: 'ES256',
        payload: new Uint8Array([1, 2, 3]),
        at: 701,
      }),
    (error) =>
      error instanceof IssuerSignerError && error.code === 'KEY_NOT_ACTIVE',
  );
  const serializedAudit = JSON.stringify(audit);
  assert.doesNotMatch(serializedAudit, /kms:\/\/|private|payload|signature/iu);
});

test('status and trust failures are explicit, fail closed, and never upgraded by stale data', async () => {
  const signed = await signRegistrySnapshot(snapshotInput(), signer);
  const cache = new SignedSnapshotCache(
    { load: async () => undefined },
    verifier,
    { clock: () => 1_000 },
  );
  await cache.prime(signed);
  const request = {
    ...scope,
    issuerId,
    schemaId,
    keyId: 'issuer-key-current',
    issuedAt: 600,
    now: 1_000,
  };
  assert.equal(
    (await cache.evaluateTrust({ ...request, keyId: 'unknown-key' })).decision,
    'indeterminate',
  );
  assert.equal(
    (
      await cache.evaluateTrust({
        ...request,
        keyId: 'issuer-key-old',
        issuedAt: 500,
      })
    ).decision,
    'rejected',
  );
  assert.deepEqual(
    await cache.evaluateStatus({
      ...scope,
      issuerId,
      statusId: 'status-revoked',
      now: 1_000,
    }),
    {
      decision: 'rejected',
      code: 'CREDENTIAL_REVOKED',
      snapshotId: 'snapshot-identity-1',
      snapshotExpiresAt: 10_000,
    },
  );
  const stale = new SignedSnapshotCache(
    { load: async () => signed },
    verifier,
    { clock: () => 10_000 },
  );
  assert.deepEqual(await stale.evaluateTrust({ ...request, now: 10_000 }), {
    decision: 'indeterminate',
    code: 'SNAPSHOT_STALE',
    snapshotId: 'snapshot-identity-1',
    snapshotExpiresAt: 10_000,
  });
});
