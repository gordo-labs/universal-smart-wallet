import test from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryIssuerOperationStore,
  InstitutionalIssuerSigner,
  IssuerSignerError,
  opaqueIssuerKeyRef,
  UNSAFE_LOCAL_DEVELOPMENT_WARNING,
  UnsafeLocalDevelopmentIssuerSigner,
  UnsafeLocalDevelopmentKmsAdapter,
} from '../dist/index.js';

const keyRef1 = opaqueIssuerKeyRef('kms://synthetic/issuer-key/v1');
const keyRef2 = opaqueIssuerKeyRef('kms://synthetic/issuer-key/v2');
const payload = new TextEncoder().encode('synthetic-credential-payload');

const keyPair = () =>
  crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
    'verify',
  ]);

const approving = {
  approvalsFor: async (context) => [
    {
      approvalId: `${context.requestId}-approval-1`,
      approverId: 'reviewer-a',
      ...context,
      approvedAt: context.at - 1,
      expiresAt: context.at + 60,
    },
    {
      approvalId: `${context.requestId}-approval-2`,
      approverId: 'reviewer-b',
      ...context,
      approvedAt: context.at - 1,
      expiresAt: context.at + 60,
    },
  ],
};

const audit = () => {
  const events = [];
  return { events, port: { append: async (event) => events.push(event) } };
};

const localSetup = async (approvals = approving) => {
  const [pair1, pair2] = await Promise.all([keyPair(), keyPair()]);
  const adapter = new UnsafeLocalDevelopmentKmsAdapter({
    acknowledgeUnsafeLocalDevelopment: true,
    keys: [
      {
        keyRef: keyRef1,
        version: 'v1',
        algorithm: 'ES256',
        status: 'active',
        privateKey: pair1.privateKey,
      },
      {
        keyRef: keyRef2,
        version: 'v2',
        algorithm: 'ES256',
        status: 'standby',
        privateKey: pair2.privateKey,
      },
    ],
  });
  const recorded = audit();
  const signer = new InstitutionalIssuerSigner(
    adapter,
    approvals,
    new InMemoryIssuerOperationStore(),
    recorded.port,
  );
  return { signer, adapter, recorded, pair1, pair2 };
};

const signRequest = (changes = {}) => ({
  requestId: 'sign-1',
  tenantId: 'tenant-a',
  keyRef: keyRef1,
  algorithm: 'ES256',
  payload,
  at: 100,
  ...changes,
});

test('opaque references reject key-shaped material and the issuer port exposes no export operation', async () => {
  assert.throws(
    () => opaqueIssuerKeyRef('-----BEGIN PRIVATE KEY-----'),
    (error) =>
      error instanceof IssuerSignerError && error.code === 'INVALID_REQUEST',
  );
  assert.throws(
    () => opaqueIssuerKeyRef('{"kty":"EC","d":"synthetic"}'),
    (error) =>
      error instanceof IssuerSignerError && error.code === 'INVALID_REQUEST',
  );
  const { signer } = await localSetup();
  assert.equal('exportKey' in signer, false);
  assert.equal('generateKey' in signer, false);
});

test('requires two distinct, current approvals bound to the exact signing request', async () => {
  const oneApproval = {
    approvalsFor: async (context) => [
      {
        approvalId: 'only-approval',
        approverId: 'reviewer-a',
        ...context,
        approvedAt: 99,
        expiresAt: 200,
      },
    ],
  };
  const { signer, recorded } = await localSetup(oneApproval);
  await assert.rejects(
    () => signer.sign(signRequest()),
    (error) =>
      error instanceof IssuerSignerError &&
      error.code === 'DUAL_APPROVAL_REQUIRED',
  );
  assert.equal(recorded.events[0].reasonCode, 'DUAL_APPROVAL_REQUIRED');

  const duplicateActor = {
    approvalsFor: async (context) =>
      approving
        .approvalsFor(context)
        .then((items) =>
          items.map((item) => ({ ...item, approverId: 'same-reviewer' })),
        ),
  };
  const duplicate = await localSetup(duplicateActor);
  await assert.rejects(
    () => duplicate.signer.sign(signRequest()),
    (error) =>
      error instanceof IssuerSignerError &&
      error.code === 'DUAL_APPROVAL_REQUIRED',
  );

  const forgedBinding = {
    approvalsFor: async (context) =>
      approving.approvalsFor(context).then((items) =>
        items.map((item) => ({
          ...item,
          bindingDigest: `sha256:${'0'.repeat(64)}`,
        })),
      ),
  };
  const forged = await localSetup(forgedBinding);
  await assert.rejects(
    () => forged.signer.sign(signRequest()),
    (error) =>
      error instanceof IssuerSignerError && error.code === 'APPROVAL_INVALID',
  );
});

test('unsafe local adapter is explicit, non-extractable, and produces a verifiable development signature', async () => {
  await assert.rejects(
    async () =>
      new UnsafeLocalDevelopmentKmsAdapter({
        acknowledgeUnsafeLocalDevelopment: false,
        keys: [],
      }),
    new RegExp(UNSAFE_LOCAL_DEVELOPMENT_WARNING.split(':')[0]),
  );
  const { signer, adapter, pair1 } = await localSetup();
  assert.match(adapter.safety, /UNSAFE_LOCAL_DEVELOPMENT_ONLY/);
  assert.equal(pair1.privateKey.extractable, false);
  const signed = await signer.sign(signRequest());
  assert.equal(signed.keyRef, keyRef1);
  assert.equal(signed.keyVersion, 'v1');
  assert.equal(
    await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair1.publicKey,
      signed.signature,
      payload,
    ),
    true,
  );

  const recorded = audit();
  const directPort = new UnsafeLocalDevelopmentIssuerSigner({
    acknowledgeUnsafeLocalDevelopment: true,
    keys: [
      {
        keyRef: keyRef1,
        version: 'direct-v1',
        algorithm: 'ES256',
        status: 'active',
        privateKey: pair1.privateKey,
      },
    ],
    approvals: approving,
    audit: recorded.port,
  });
  assert.match(directPort.safety, /UNSAFE_LOCAL_DEVELOPMENT_ONLY/);
  assert.equal((await directPort.describeKey(keyRef1)).version, 'direct-v1');
});

test('rotation retires the old key and disabling the new key fails closed', async () => {
  const { signer } = await localSetup();
  const receipt = await signer.rotate({
    requestId: 'rotate-1',
    tenantId: 'tenant-a',
    currentKeyRef: keyRef1,
    nextKeyRef: keyRef2,
    at: 200,
  });
  assert.equal(receipt.previousKeyRef, keyRef1);
  assert.equal(receipt.activeKeyRef, keyRef2);
  assert.equal((await signer.describeKey(keyRef1)).status, 'rotated');
  assert.equal((await signer.describeKey(keyRef2)).status, 'active');
  await assert.rejects(
    () => signer.sign(signRequest({ requestId: 'old-key', at: 201 })),
    (error) =>
      error instanceof IssuerSignerError && error.code === 'KEY_NOT_ACTIVE',
  );

  await signer.disable({
    requestId: 'disable-1',
    tenantId: 'tenant-a',
    keyRef: keyRef2,
    at: 202,
  });
  await assert.rejects(
    () =>
      signer.sign(
        signRequest({ requestId: 'disabled-key', keyRef: keyRef2, at: 203 }),
      ),
    (error) =>
      error instanceof IssuerSignerError && error.code === 'KEY_DISABLED',
  );
});

test('an ambiguous provider result is never blindly retried, even under a new request id', async () => {
  let attempts = 0;
  const descriptor = {
    keyRef: keyRef1,
    algorithm: 'ES256',
    status: 'active',
    version: 'v1',
  };
  const adapter = {
    describeKey: async () => descriptor,
    sign: async () => {
      attempts += 1;
      throw new Error('provider detail must not escape');
    },
    rotate: async () => ({ status: 'completed' }),
    disable: async () => ({ status: 'completed' }),
  };
  const recorded = audit();
  const signer = new InstitutionalIssuerSigner(
    adapter,
    approving,
    new InMemoryIssuerOperationStore(),
    recorded.port,
  );
  await assert.rejects(
    () => signer.sign(signRequest()),
    (error) =>
      error instanceof IssuerSignerError &&
      error.code === 'SIGNING_RESULT_AMBIGUOUS' &&
      !error.message.includes('provider detail'),
  );
  await assert.rejects(
    () => signer.sign(signRequest()),
    (error) =>
      error instanceof IssuerSignerError &&
      error.code === 'REQUEST_ALREADY_USED',
  );
  await assert.rejects(
    () => signer.sign(signRequest({ requestId: 'sign-2' })),
    (error) =>
      error instanceof IssuerSignerError &&
      error.code === 'REQUEST_ALREADY_USED',
  );
  assert.equal(attempts, 1);
});

test('audit records are secret-safe and exclude provider inputs and outputs', async () => {
  const { signer, recorded } = await localSetup();
  const signed = await signer.sign(signRequest());
  const event = recorded.events[0];
  assert.deepEqual(Object.keys(event).sort(), [
    'createdAt',
    'eventId',
    'operation',
    'outcome',
    'reasonCode',
    'requestId',
    'schemaVersion',
    'tenantId',
  ]);
  const serialized = JSON.stringify(recorded.events);
  assert.equal(serialized.includes(new TextDecoder().decode(payload)), false);
  assert.equal(
    serialized.includes(Buffer.from(signed.signature).toString('hex')),
    false,
  );
  assert.equal(serialized.includes('kms://'), false);
  assert.equal(serialized.includes('privateKey'), false);
});
