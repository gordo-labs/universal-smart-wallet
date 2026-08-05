import test from 'node:test';
import assert from 'node:assert/strict';
import { exportJWK, generateKeyPair } from 'jose';
import {
  CREDENTIAL_FORMAT_PINS,
  CredentialFormatError,
  PinnedCredentialAdapterRegistry,
  createPortBackedCredentialFormatAdapter,
  createSdJwtVcCredentialFormatAdapter,
} from '../dist/index.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const syntheticClaims = Object.freeze({
  is_over_18: true,
  cohort: 'synthetic-2026',
});

function encodeFixture(format, value) {
  const serialized = JSON.stringify({
    format,
    profile: CREDENTIAL_FORMAT_PINS[format].profile,
    version: CREDENTIAL_FORMAT_PINS[format].version,
    mediaType: CREDENTIAL_FORMAT_PINS[format].mediaType,
    algorithm: CREDENTIAL_FORMAT_PINS[format].algorithms[0],
    credentialTypes: ['SyntheticCredential'],
    issuer: 'https://issuer.example/synthetic',
    holderBound: format !== 'jwt-vc-legacy',
    signature: 'synthetic-valid',
    ...value,
  });
  return format === 'iso-mdoc' ? textEncoder.encode(serialized) : serialized;
}

function decodeFixture(value) {
  return JSON.parse(
    typeof value === 'string' ? value : textDecoder.decode(value),
  );
}

function syntheticPort(format) {
  return {
    async issue(input) {
      return encodeFixture(format, {
        kind: 'credential',
        claims: input.claims,
      });
    },
    async present(credential, input) {
      const parsed = decodeFixture(credential);
      return encodeFixture(format, {
        kind: 'presentation',
        claims: Object.fromEntries(
          Object.entries(parsed.claims).filter(([name]) =>
            input.claims.includes(name),
          ),
        ),
      });
    },
    async inspect(value) {
      const parsed = decodeFixture(value);
      return {
        format: parsed.format,
        profile: parsed.profile,
        version: parsed.version,
        mediaType: parsed.mediaType,
        kind: parsed.kind,
        algorithm: parsed.algorithm,
        issuer: parsed.issuer,
        credentialTypes: parsed.credentialTypes,
        holderBound: parsed.holderBound,
      };
    },
    async verify(value) {
      const parsed = decodeFixture(value);
      return {
        verified: parsed.signature === 'synthetic-valid',
        algorithm: parsed.algorithm,
        issuer: parsed.issuer,
        credentialTypes: parsed.credentialTypes,
        claims: parsed.claims,
        disclosedClaims: parsed.claims,
        holderBound: parsed.holderBound,
      };
    },
  };
}

function selection(format) {
  const pin = CREDENTIAL_FORMAT_PINS[format];
  return {
    expectedFormat: format,
    expectedProfile: pin.profile,
    expectedVersion: pin.version,
  };
}

function setup() {
  const adapters = {
    'sd-jwt-vc': createSdJwtVcCredentialFormatAdapter(),
    'iso-mdoc': createPortBackedCredentialFormatAdapter(
      'iso-mdoc',
      syntheticPort('iso-mdoc'),
    ),
    'w3c-vc-di': createPortBackedCredentialFormatAdapter(
      'w3c-vc-di',
      syntheticPort('w3c-vc-di'),
    ),
    'jwt-vc-legacy': createPortBackedCredentialFormatAdapter(
      'jwt-vc-legacy',
      syntheticPort('jwt-vc-legacy'),
    ),
  };
  return {
    adapters,
    registry: new PinnedCredentialAdapterRegistry(Object.values(adapters)),
  };
}

test('cross-format fixtures share issue, inspect, present, and neutral verify boundaries', async () => {
  const { adapters, registry } = setup();
  assert.deepEqual(registry.formats(), [
    'sd-jwt-vc',
    'iso-mdoc',
    'w3c-vc-di',
    'jwt-vc-legacy',
  ]);

  for (const format of ['iso-mdoc', 'w3c-vc-di']) {
    const adapter = adapters[format];
    const pinned = selection(format);
    const credential = await adapter.issue({
      ...pinned,
      input: { claims: syntheticClaims },
    });
    const inspected = await registry.inspect({
      ...pinned,
      artifact: credential,
    });
    assert.equal(inspected.format, format);
    const presentation = await adapter.present({
      ...pinned,
      credential,
      input: { claims: ['is_over_18'] },
    });
    const result = await registry.verify({
      ...pinned,
      presentation,
      input: {},
    });
    assert.equal(result.status, 'verified');
    assert.deepEqual(result.disclosedClaims, { is_over_18: true });
  }
});

test('the SD-JWT VC adapter uses the existing reviewed JOSE implementation', async () => {
  const adapter = createSdJwtVcCredentialFormatAdapter();
  const pinned = selection('sd-jwt-vc');
  const issuer = await generateKeyPair('ES256');
  const holder = await generateKeyPair('ES256');
  const credential = await adapter.issue({
    ...pinned,
    input: {
      issuer: 'https://issuer.example/synthetic',
      vct: 'AgeCredential',
      claims: syntheticClaims,
      issuerKey: issuer.privateKey,
      issuerKid: 'synthetic-issuer-key',
      holderJwk: await exportJWK(holder.publicKey),
      issuedAt: 1_700_000_000,
      expiresAt: 2_000_000_000,
    },
  });
  const presentation = await adapter.present({
    ...pinned,
    credential,
    input: {
      disclosures: [credential.value.split('~')[1]],
      holderKey: holder.privateKey,
      holderKid: 'synthetic-holder-key',
      audience: 'https://verifier.example',
      nonce: 'synthetic-nonce',
    },
  });
  const result = await adapter.verify({
    ...pinned,
    presentation,
    input: {
      issuerKey: issuer.publicKey,
      expectedAudience: 'https://verifier.example',
      expectedNonce: 'synthetic-nonce',
      now: 1_800_000_000,
    },
  });
  assert.equal(result.status, 'verified', JSON.stringify(result));
  assert.equal(result.format, 'sd-jwt-vc');
  assert.equal(result.claims.is_over_18, true);
});

test('legacy JWT-VC remains inspectable and verifiable but cannot issue or present', async () => {
  const { adapters, registry } = setup();
  const adapter = adapters['jwt-vc-legacy'];
  const pinned = selection('jwt-vc-legacy');
  const artifact = {
    ...CREDENTIAL_FORMAT_PINS['jwt-vc-legacy'],
    kind: 'credential',
    value: encodeFixture('jwt-vc-legacy', {
      kind: 'credential',
      claims: syntheticClaims,
    }),
  };
  assert.equal(
    (await registry.inspect({ ...pinned, artifact })).format,
    'jwt-vc-legacy',
  );
  assert.equal(
    (await registry.verify({ ...pinned, presentation: artifact, input: {} }))
      .status,
    'verified',
  );
  await assert.rejects(
    () => adapter.issue({ ...pinned, input: { claims: syntheticClaims } }),
    (error) =>
      error instanceof CredentialFormatError &&
      error.code === 'OPERATION_UNSUPPORTED',
  );
  await assert.rejects(
    () => adapter.present({ ...pinned, credential: artifact, input: {} }),
    (error) =>
      error instanceof CredentialFormatError &&
      error.code === 'OPERATION_UNSUPPORTED',
  );
});

test('unsupported versions, algorithm confusion, and format downgrade fail closed', async () => {
  const { adapters, registry } = setup();
  assert.throws(
    () => registry.get({ ...selection('iso-mdoc'), expectedVersion: 'future' }),
    (error) =>
      error instanceof CredentialFormatError &&
      error.code === 'UNSUPPORTED_VERSION',
  );

  const mdoc = CREDENTIAL_FORMAT_PINS['iso-mdoc'];
  const confused = {
    ...mdoc,
    kind: 'presentation',
    value: encodeFixture('iso-mdoc', {
      kind: 'presentation',
      algorithm: 'HS256',
      claims: syntheticClaims,
    }),
  };
  const confusedResult = await adapters['iso-mdoc'].verify({
    ...selection('iso-mdoc'),
    presentation: confused,
    input: {},
  });
  assert.equal(confusedResult.status, 'rejected');
  assert.equal(confusedResult.reasonCode, 'UNSUPPORTED_ALGORITHM');

  const legacy = CREDENTIAL_FORMAT_PINS['jwt-vc-legacy'];
  const downgraded = {
    ...legacy,
    kind: 'presentation',
    value: encodeFixture('w3c-vc-di', {
      kind: 'presentation',
      claims: syntheticClaims,
    }),
  };
  const downgradeResult = await adapters['jwt-vc-legacy'].verify({
    ...selection('jwt-vc-legacy'),
    presentation: downgraded,
    input: {},
  });
  assert.equal(downgradeResult.status, 'rejected');
  assert.equal(downgradeResult.reasonCode, 'FORMAT_MISMATCH');
});
