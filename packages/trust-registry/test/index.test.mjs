import { describe, expect, it } from 'vitest';
import {
  RegistrySnapshotError,
  SignedSnapshotCache,
  evaluateTrustSnapshot,
  parseSignedRegistrySnapshot,
  registrySnapshotSigningPayload,
  signRegistrySnapshot,
  verifyRegistrySnapshot,
} from '../dist/index.js';

const scope = { tenantId: 'tenant-a', jurisdiction: 'ES' };

// Unmistakably test-only signature adapters. Production algorithms and key
// custody remain outside this package behind the signer/verifier ports.
const fixtureSignature = ({ scope: signedScope, keyId, payload }) => {
  let checksum = 0;
  for (const character of payload)
    checksum = (checksum + character.codePointAt(0)) % 1_000_003;
  return `fixture.${signedScope.tenantId}.${signedScope.jurisdiction}.${keyId}.${payload.length}.${checksum}`;
};
const signer = {
  sign: async (request) => fixtureSignature(request),
};
const verifier = {
  verify: async (request) =>
    request.keyId === 'registry-key-1' &&
    request.signature === fixtureSignature(request),
};

const unsignedSnapshot = (overrides = {}) => ({
  schemaVersion: 1,
  snapshotId: 'snapshot-1',
  tenantId: scope.tenantId,
  jurisdiction: scope.jurisdiction,
  sequence: 1,
  issuedAt: 3_000,
  expiresAt: 5_000,
  signingKeyId: 'registry-key-1',
  issuers: [
    {
      issuerId: 'https://university.example/issuers/registrar',
      status: 'active',
      schemas: [
        { schemaId: 'urn:example:schema:diploma:v1', status: 'active' },
        { schemaId: 'urn:example:schema:legacy:v1', status: 'revoked' },
      ],
      keys: [
        {
          keyId: 'issuer-key-old',
          status: 'retired',
          authorizedFrom: 1_000,
          authorizedUntil: 2_000,
        },
        {
          keyId: 'issuer-key-current',
          status: 'active',
          authorizedFrom: 2_000,
        },
        {
          keyId: 'issuer-key-compromised',
          status: 'revoked',
          authorizedFrom: 1_500,
        },
      ],
      trustMarks: ['synthetic-institutional'],
    },
    {
      issuerId: 'https://suspended.example/issuer',
      status: 'suspended',
      schemas: [
        { schemaId: 'urn:example:schema:diploma:v1', status: 'active' },
      ],
      keys: [
        {
          keyId: 'issuer-key-suspended',
          status: 'active',
          authorizedFrom: 1_000,
        },
      ],
      trustMarks: [],
    },
  ],
  rotations: [
    {
      issuerId: 'https://university.example/issuers/registrar',
      previousKeyId: 'issuer-key-old',
      newKeyId: 'issuer-key-current',
      rotatedAt: 2_000,
    },
  ],
  statuses: [
    {
      issuerId: 'https://university.example/issuers/registrar',
      statusId: 'status-0001',
      status: 'valid',
      updatedAt: 2_900,
    },
    {
      issuerId: 'https://university.example/issuers/registrar',
      statusId: 'status-0002',
      status: 'revoked',
      updatedAt: 2_900,
    },
    {
      issuerId: 'https://university.example/issuers/registrar',
      statusId: 'status-0003',
      status: 'suspended',
      updatedAt: 2_900,
    },
  ],
  ...overrides,
});

const signedSnapshot = (overrides = {}) =>
  signRegistrySnapshot(unsignedSnapshot(overrides), signer);

const trustRequest = (overrides = {}) => ({
  ...scope,
  issuerId: 'https://university.example/issuers/registrar',
  schemaId: 'urn:example:schema:diploma:v1',
  keyId: 'issuer-key-current',
  issuedAt: 2_500,
  now: 3_500,
  ...overrides,
});

describe('signed registry snapshots', () => {
  it('signs a canonical payload and verifies only the pinned scope/key', async () => {
    const signed = await signedSnapshot();
    await expect(
      verifyRegistrySnapshot(signed, scope, verifier),
    ).resolves.toEqual(signed);

    const reordered = {
      statuses: unsignedSnapshot().statuses,
      ...unsignedSnapshot(),
    };
    expect(registrySnapshotSigningPayload(reordered)).toBe(
      registrySnapshotSigningPayload(unsignedSnapshot()),
    );

    await expect(
      verifyRegistrySnapshot(
        { ...signed, expiresAt: signed.expiresAt + 1 },
        scope,
        verifier,
      ),
    ).rejects.toMatchObject({ code: 'SNAPSHOT_SIGNATURE_INVALID' });
  });

  it('rejects unsigned, malformed and cross-scope snapshots', async () => {
    expect(() => parseSignedRegistrySnapshot(unsignedSnapshot())).toThrowError(
      expect.objectContaining({ code: 'SNAPSHOT_UNSIGNED' }),
    );
    await expect(
      verifyRegistrySnapshot(
        await signedSnapshot(),
        { tenantId: 'tenant-b', jurisdiction: 'ES' },
        verifier,
      ),
    ).rejects.toMatchObject({ code: 'SNAPSHOT_SCOPE_MISMATCH' });
    expect(() =>
      parseSignedRegistrySnapshot({
        ...awaitablePlaceholder(),
        unexpected: true,
      }),
    ).toThrow(RegistrySnapshotError);
  });

  it('validates rotation evidence against preserved key intervals', async () => {
    const invalid = unsignedSnapshot({
      rotations: [
        {
          issuerId: 'https://university.example/issuers/registrar',
          previousKeyId: 'issuer-key-old',
          newKeyId: 'issuer-key-current',
          rotatedAt: 2_001,
        },
      ],
    });
    await expect(signRegistrySnapshot(invalid, signer)).rejects.toMatchObject({
      code: 'SNAPSHOT_INVALID',
    });
  });
});

// Keeps the malformed-object assertion synchronous without creating a promise.
const awaitablePlaceholder = () => ({
  ...unsignedSnapshot(),
  signature: 'fixture.invalid',
});

describe('tenant and jurisdiction scoped authorization', () => {
  it('isolates tenants and jurisdictions even when a source returns the wrong scope', async () => {
    const signed = await signedSnapshot();
    const cache = new SignedSnapshotCache(
      { load: async () => signed },
      verifier,
      { clock: () => 3_500 },
    );
    await expect(cache.evaluateTrust(trustRequest())).resolves.toMatchObject({
      decision: 'verified',
      code: 'TRUST_VERIFIED',
    });
    await expect(
      cache.evaluateTrust(trustRequest({ tenantId: 'tenant-b' })),
    ).resolves.toMatchObject({
      decision: 'indeterminate',
      code: 'SNAPSHOT_INVALID',
    });
    await expect(
      cache.evaluateTrust(trustRequest({ jurisdiction: 'FR' })),
    ).resolves.toMatchObject({
      decision: 'indeterminate',
      code: 'SNAPSHOT_INVALID',
    });
    expect(
      evaluateTrustSnapshot(signed, trustRequest({ tenantId: 'tenant-b' })),
    ).toEqual({ decision: 'indeterminate', code: 'SNAPSHOT_INVALID' });
  });

  it('returns indeterminate for unknown issuer, schema, key and status', async () => {
    const signed = await signedSnapshot();
    const cache = new SignedSnapshotCache(
      { load: async () => undefined },
      verifier,
      { clock: () => 3_500 },
    );
    await cache.prime(signed);
    const cases = [
      ['issuerId', 'https://unknown.example', 'ISSUER_UNKNOWN'],
      ['schemaId', 'urn:example:schema:unknown', 'SCHEMA_UNKNOWN'],
      ['keyId', 'issuer-key-unknown', 'KEY_UNKNOWN'],
    ];
    for (const [field, value, code] of cases) {
      await expect(
        cache.evaluateTrust(trustRequest({ [field]: value })),
      ).resolves.toMatchObject({ decision: 'indeterminate', code });
    }
    await expect(
      cache.evaluateStatus({
        ...scope,
        issuerId: trustRequest().issuerId,
        statusId: 'status-unknown',
        now: 3_500,
      }),
    ).resolves.toMatchObject({
      decision: 'indeterminate',
      code: 'STATUS_UNKNOWN',
    });
  });
});

describe('authorization, rotation and status decisions', () => {
  it('preserves old-key auditability only for credentials issued before rotation', async () => {
    const cache = new SignedSnapshotCache(
      { load: async () => undefined },
      verifier,
      { clock: () => 3_500 },
    );
    await cache.prime(await signedSnapshot());
    await expect(
      cache.evaluateTrust(
        trustRequest({ keyId: 'issuer-key-old', issuedAt: 1_999 }),
      ),
    ).resolves.toMatchObject({ decision: 'verified' });
    await expect(
      cache.evaluateTrust(
        trustRequest({ keyId: 'issuer-key-old', issuedAt: 2_000 }),
      ),
    ).resolves.toMatchObject({
      decision: 'rejected',
      code: 'KEY_NOT_AUTHORIZED_AT_ISSUANCE',
    });
    await expect(
      cache.evaluateTrust(
        trustRequest({ keyId: 'issuer-key-current', issuedAt: 2_000 }),
      ),
    ).resolves.toMatchObject({ decision: 'verified' });
  });

  it('rejects explicit issuer, schema and key revocation or suspension', async () => {
    const cache = new SignedSnapshotCache(
      { load: async () => undefined },
      verifier,
      { clock: () => 3_500 },
    );
    await cache.prime(await signedSnapshot());
    await expect(
      cache.evaluateTrust(
        trustRequest({
          issuerId: 'https://suspended.example/issuer',
          keyId: 'issuer-key-suspended',
        }),
      ),
    ).resolves.toMatchObject({
      decision: 'rejected',
      code: 'ISSUER_SUSPENDED',
    });
    await expect(
      cache.evaluateTrust(
        trustRequest({ schemaId: 'urn:example:schema:legacy:v1' }),
      ),
    ).resolves.toMatchObject({
      decision: 'rejected',
      code: 'SCHEMA_REVOKED',
    });
    await expect(
      cache.evaluateTrust(trustRequest({ keyId: 'issuer-key-compromised' })),
    ).resolves.toMatchObject({
      decision: 'rejected',
      code: 'KEY_REVOKED',
    });
  });

  it('combines trust and status without upgrading revoked or suspended credentials', async () => {
    const cache = new SignedSnapshotCache(
      { load: async () => undefined },
      verifier,
      { clock: () => 3_500 },
    );
    await cache.prime(await signedSnapshot());
    await expect(
      cache.evaluateCredential({ ...trustRequest(), statusId: 'status-0001' }),
    ).resolves.toMatchObject({
      decision: 'verified',
      code: 'CREDENTIAL_VERIFIED',
    });
    await expect(
      cache.evaluateCredential({ ...trustRequest(), statusId: 'status-0002' }),
    ).resolves.toMatchObject({
      decision: 'rejected',
      code: 'CREDENTIAL_REVOKED',
    });
    await expect(
      cache.evaluateCredential({ ...trustRequest(), statusId: 'status-0003' }),
    ).resolves.toMatchObject({
      decision: 'rejected',
      code: 'CREDENTIAL_SUSPENDED',
    });
  });
});

describe('offline freshness and rollback protection', () => {
  it('uses a fresh signed cache offline but never verifies stale/outage state', async () => {
    let now = 3_500;
    let sourceCalls = 0;
    const cache = new SignedSnapshotCache(
      {
        load: async () => {
          sourceCalls += 1;
          throw new Error('registry offline');
        },
      },
      verifier,
      { clock: () => now },
    );
    await cache.prime(await signedSnapshot());
    await expect(
      cache.evaluateTrust(trustRequest({ now: undefined })),
    ).resolves.toMatchObject({
      decision: 'verified',
    });
    expect(sourceCalls).toBe(0);

    now = 5_000;
    await expect(
      cache.evaluateTrust(trustRequest({ now: undefined })),
    ).resolves.toMatchObject({
      decision: 'indeterminate',
      code: 'REGISTRY_UNAVAILABLE',
    });
    expect(sourceCalls).toBe(1);
    expect(
      evaluateTrustSnapshot(
        await signedSnapshot(),
        trustRequest({ now: 5_000 }),
      ),
    ).toMatchObject({
      decision: 'indeterminate',
      code: 'SNAPSHOT_STALE',
    });
  });

  it('never caches or verifies unsigned and expired source responses', async () => {
    let current = unsignedSnapshot();
    const cache = new SignedSnapshotCache(
      { load: async () => current },
      verifier,
      { clock: () => 3_500 },
    );
    await expect(cache.evaluateTrust(trustRequest())).resolves.toMatchObject({
      decision: 'indeterminate',
      code: 'SNAPSHOT_INVALID',
    });

    current = await signedSnapshot({ expiresAt: 3_500 });
    await expect(cache.evaluateTrust(trustRequest())).resolves.toMatchObject({
      decision: 'indeterminate',
      code: 'SNAPSHOT_STALE',
    });
  });

  it('rejects sequence rollback and same-sequence conflicts', async () => {
    const cache = new SignedSnapshotCache(
      { load: async () => undefined },
      verifier,
      { clock: () => 3_500 },
    );
    await cache.prime(
      await signedSnapshot({ sequence: 2, snapshotId: 'snapshot-2' }),
    );
    await expect(cache.prime(await signedSnapshot())).rejects.toMatchObject({
      code: 'SNAPSHOT_ROLLBACK',
    });
    await expect(
      cache.prime(
        await signedSnapshot({ sequence: 2, snapshotId: 'snapshot-conflict' }),
      ),
    ).rejects.toMatchObject({ code: 'SNAPSHOT_ROLLBACK' });
  });
});
