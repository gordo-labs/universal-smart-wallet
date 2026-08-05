import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CREDENTIAL_FORMAT_PINS,
  PinnedCredentialAdapterRegistry,
  createPortBackedCredentialFormatAdapter,
} from '@ssw/credential-formats';
import {
  CredentialVerifierService,
  InMemoryVerificationSessionStore,
} from '../dist/index.js';

const issuer = 'https://university.example/issuers/registrar';
const nowMs = 3_500_000;

function decode(value) {
  return JSON.parse(
    typeof value === 'string' ? value : new TextDecoder().decode(value),
  );
}

function port(format) {
  return {
    async inspect(value) {
      const parsed = decode(value);
      const pin = CREDENTIAL_FORMAT_PINS[format];
      return {
        format,
        profile: pin.profile,
        version: pin.version,
        mediaType: pin.mediaType,
        kind: 'presentation',
        algorithm: pin.algorithms[0],
        issuer: parsed.issuer,
        credentialTypes: parsed.credentialTypes,
        holderBound: parsed.holderBound,
      };
    },
    async verify(value) {
      const parsed = decode(value);
      return {
        verified: parsed.signature === 'valid',
        algorithm: CREDENTIAL_FORMAT_PINS[format].algorithms[0],
        issuer: parsed.issuer,
        credentialTypes: parsed.credentialTypes,
        disclosedClaims: parsed.claims,
        claims: parsed.claims,
        holderBound: parsed.holderBound,
      };
    },
  };
}

function formats() {
  return new PinnedCredentialAdapterRegistry(
    ['sd-jwt-vc', 'iso-mdoc', 'w3c-vc-di', 'jwt-vc-legacy'].map((format) => {
      if (format === 'sd-jwt-vc') {
        // The verifier only needs the common adapter contract in this fixture;
        // cryptography remains in the real format packages and their suites.
        return {
          descriptor: CREDENTIAL_FORMAT_PINS[format],
          inspect: async ({ artifact }) => port(format).inspect(artifact.value),
          verify: async ({ presentation }) => {
            const inspected = await port(format).inspect(presentation.value);
            const result = await port(format).verify(presentation.value);
            return result.verified
              ? {
                  status: 'verified',
                  format,
                  profile: inspected.profile,
                  version: inspected.version,
                  reasonCode: 'VERIFIED',
                  algorithm: result.algorithm,
                  issuer: result.issuer,
                  credentialTypes: result.credentialTypes,
                  claims: result.claims,
                  disclosedClaims: result.disclosedClaims,
                  holderBound: result.holderBound,
                }
              : {
                  status: 'rejected',
                  format,
                  profile: inspected.profile,
                  version: inspected.version,
                  reasonCode: 'VERIFICATION_FAILED',
                  credentialTypes: [],
                  claims: {},
                  disclosedClaims: {},
                  holderBound: false,
                };
          },
          issue: async () => {
            throw new Error('not used');
          },
          present: async () => {
            throw new Error('not used');
          },
        };
      }
      return createPortBackedCredentialFormatAdapter(format, port(format));
    }),
  );
}

const pin = CREDENTIAL_FORMAT_PINS['w3c-vc-di'];
const policy = {
  schemaVersion: 1,
  policyId: 'synthetic-diploma',
  tenantId: 'tenant-a',
  jurisdiction: 'ES',
  format: 'w3c-vc-di',
  profile: pin.profile,
  version: pin.version,
  schemaId: 'urn:example:schema:diploma:v1',
  credentialTypes: ['SyntheticDiploma'],
  requestedClaims: [{ name: 'degree', equals: 'Synthetic Computing' }],
  requireHolderBinding: true,
  acceptedIssuers: [issuer],
};

const basePresentation = {
  issuer,
  credentialTypes: ['SyntheticDiploma'],
  holderBound: true,
  signature: 'valid',
  claims: { degree: 'Synthetic Computing' },
};

const metadata = {
  issuerId: issuer,
  schemaId: policy.schemaId,
  keyId: 'issuer-key-1',
  statusId: 'status-1',
  issuedAt: 3_000,
  expiresAt: 5_000,
};

function harness({
  presentation = basePresentation,
  resolvedMetadata = metadata,
  disclosures = Object.keys(presentation.claims),
  registryDecision = {
    decision: 'verified',
    code: 'CREDENTIAL_VERIFIED',
    snapshotId: 'snapshot-1',
    snapshotExpiresAt: 5_000,
  },
} = {}) {
  const store = new InMemoryVerificationSessionStore();
  let resolved = 0;
  let ids = 0;
  const service = new CredentialVerifierService({
    policies: [policy],
    formats: formats(),
    registry: {
      evaluateTrust: async () => registryDecision,
      evaluateStatus: async () => registryDecision,
      evaluateCredential: async () => registryDecision,
    },
    presentations: {
      resolve: async (_token, expected) => {
        resolved += 1;
        assert.equal(expected.audience, 'https://verifier.example');
        return {
          artifact: {
            format: policy.format,
            profile: policy.profile,
            version: policy.version,
            mediaType: pin.mediaType,
            kind: 'presentation',
            value: JSON.stringify(presentation),
          },
          verificationInput: {},
          disclosures,
          metadata: resolvedMetadata,
        };
      },
    },
    store,
    clientId: 'https://verifier.example',
    responseUri: 'https://verifier.example/v1/callback',
    now: () => nowMs,
    idFactory: (kind) => `${kind}-${++ids}`,
  });
  return { service, store, resolved: () => resolved };
}

const response = (session, token = 'opaque-presentation') =>
  `state=${encodeURIComponent(session.state)}&vp_token=${encodeURIComponent(token)}`;

test('creates a strict OpenID4VP request and a minimal verified receipt', async () => {
  const { service } = harness();
  const session = service.createSession(policy.policyId);
  assert.equal(session.request.response_mode, 'direct_post');
  assert.deepEqual(session.request.dcql_query.credentials[0].claims, [
    { path: ['degree'], values: ['Synthetic Computing'] },
  ]);
  const receipt = await service.verifyResponse(
    session.sessionId,
    response(session),
  );
  assert.equal(receipt.result, 'verified');
  assert.equal(receipt.reasonCode, 'VERIFIED');
  assert.deepEqual(receipt.checks, [
    'signature',
    'schema',
    'holder_binding',
    'expiry',
    'policy',
    'disclosure',
    'trust',
    'status',
  ]);
  const serialized = JSON.stringify(service.getSession(session.sessionId));
  assert.equal(serialized.includes('opaque-presentation'), false);
  assert.equal(serialized.includes('Synthetic Computing'), true); // DCQL request value only.
  assert.equal(JSON.stringify(receipt).includes('claims'), false);
  assert.equal(JSON.stringify(receipt).includes('vp_token'), false);
});

test('consumes state before verification and rejects replay without resolving twice', async () => {
  const setup = harness();
  const session = setup.service.createSession(policy.policyId);
  assert.equal(
    (await setup.service.verifyResponse(session.sessionId, response(session)))
      .result,
    'verified',
  );
  const replay = await setup.service.verifyResponse(
    session.sessionId,
    response(session),
  );
  assert.equal(replay.result, 'rejected');
  assert.equal(replay.reasonCode, 'REPLAY_DETECTED');
  assert.equal(setup.resolved(), 1);
  assert.equal(setup.service.getSession(session.sessionId).status, 'consumed');
});

test('rejects over-disclosure and never returns claims in the receipt', async () => {
  const setup = harness({
    presentation: {
      ...basePresentation,
      claims: { ...basePresentation.claims, student_id: 'synthetic-secret' },
    },
  });
  const session = setup.service.createSession(policy.policyId);
  const receipt = await setup.service.verifyResponse(
    session.sessionId,
    response(session),
  );
  assert.equal(receipt.result, 'rejected');
  assert.equal(receipt.reasonCode, 'DISCLOSURE_MISMATCH');
  assert.equal(JSON.stringify(receipt).includes('synthetic-secret'), false);
});

test('offline stale trust or status is indeterminate and can never verify', async () => {
  for (const code of ['SNAPSHOT_STALE', 'REGISTRY_UNAVAILABLE']) {
    const setup = harness({
      registryDecision: { decision: 'indeterminate', code },
    });
    const session = setup.service.createSession(policy.policyId);
    const receipt = await setup.service.verifyResponse(
      session.sessionId,
      response(session),
    );
    assert.equal(receipt.result, 'indeterminate');
    assert.equal(receipt.reasonCode, code);
  }
});

test('checks signature, holder binding, schema, expiry and status fail closed', async () => {
  const cases = [
    [
      { presentation: { ...basePresentation, signature: 'invalid' } },
      'rejected',
      'VERIFICATION_FAILED',
    ],
    [
      { presentation: { ...basePresentation, holderBound: false } },
      'rejected',
      'HOLDER_BINDING_REQUIRED',
    ],
    [
      { resolvedMetadata: { ...metadata, schemaId: 'urn:wrong' } },
      'rejected',
      'SCHEMA_MISMATCH',
    ],
    [
      { resolvedMetadata: { ...metadata, expiresAt: 3_500 } },
      'rejected',
      'CREDENTIAL_EXPIRED',
    ],
    [
      {
        registryDecision: { decision: 'rejected', code: 'CREDENTIAL_REVOKED' },
      },
      'rejected',
      'CREDENTIAL_REVOKED',
    ],
  ];
  for (const [options, result, reasonCode] of cases) {
    const setup = harness(options);
    const session = setup.service.createSession(policy.policyId);
    const receipt = await setup.service.verifyResponse(
      session.sessionId,
      response(session),
    );
    assert.equal(receipt.result, result);
    assert.equal(receipt.reasonCode, reasonCode);
  }
});
