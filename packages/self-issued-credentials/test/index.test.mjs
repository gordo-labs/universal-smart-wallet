import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CREDENTIAL_FORMAT_PINS,
  createPortBackedCredentialFormatAdapter,
} from '@ssw/credential-formats';
import {
  SELF_ATTESTED_ASSURANCE,
  SelfIssuedCredentialError,
  SelfIssuedCredentialService,
  evaluateSelfIssuedPolicy,
} from '../dist/index.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

class SyntheticHolderSigner {
  constructor() {
    this.descriptor = {
      controller: 'did:example:synthetic-holder',
      keyId: 'did:example:synthetic-holder#wallet-key-1',
      algorithm: 'ecdsa-rdfc-2019',
      status: 'active',
    };
    this.nextSignatureKeyId = undefined;
    this.verifyControl = true;
    this.signatures = new Map();
    this.counter = 0;
  }

  async describeKey(keyId) {
    return keyId === this.descriptor.keyId ? this.descriptor : undefined;
  }

  async sign(request) {
    this.counter += 1;
    const signature = Uint8Array.of(this.counter);
    this.signatures.set(this.counter, new Uint8Array(request.payload));
    return {
      keyId: this.nextSignatureKeyId ?? request.keyId,
      algorithm: request.algorithm,
      signature,
    };
  }

  async verify(request) {
    if (!this.verifyControl || request.signature.byteLength !== 1) return false;
    const signed = this.signatures.get(request.signature[0]);
    return signed !== undefined && Buffer.from(signed).equals(request.payload);
  }
}

function syntheticFormatPort(state) {
  return {
    async issue(input) {
      return JSON.stringify({
        payload: input.payload,
        holderProof: {
          keyId: input.holderProof.keyId,
          algorithm: input.holderProof.algorithm,
          signature: [...input.holderProof.signature],
        },
      });
    },
    async inspect(value) {
      const parsed = JSON.parse(
        typeof value === 'string' ? value : decoder.decode(value),
      );
      return {
        format: 'w3c-vc-di',
        profile: CREDENTIAL_FORMAT_PINS['w3c-vc-di'].profile,
        version: CREDENTIAL_FORMAT_PINS['w3c-vc-di'].version,
        mediaType: CREDENTIAL_FORMAT_PINS['w3c-vc-di'].mediaType,
        kind: 'credential',
        algorithm: parsed.holderProof.algorithm,
        issuer: state.issuerOverride ?? parsed.payload.issuer,
        subject: parsed.payload.subject,
        credentialTypes: [parsed.payload.type],
        keyId: state.keyIdOverride ?? parsed.holderProof.keyId,
        holderBound: state.holderBound,
      };
    },
    async verify(value) {
      const parsed = JSON.parse(
        typeof value === 'string' ? value : decoder.decode(value),
      );
      return {
        verified: state.formatVerified,
        algorithm: parsed.holderProof.algorithm,
        issuer: state.issuerOverride ?? parsed.payload.issuer,
        subject: parsed.payload.subject,
        credentialTypes: [parsed.payload.type],
        claims: state.claimsOverride ?? parsed.payload.claims,
        disclosedClaims: state.claimsOverride ?? parsed.payload.claims,
        holderBound: state.holderBound,
      };
    },
  };
}

function setup() {
  const state = {
    formatVerified: true,
    holderBound: true,
    claimsOverride: undefined,
    issuerOverride: undefined,
    keyIdOverride: undefined,
  };
  const signer = new SyntheticHolderSigner();
  const adapter = createPortBackedCredentialFormatAdapter(
    'w3c-vc-di',
    syntheticFormatPort(state),
  );
  const binding = {
    issueInput({ payload, holderProof }) {
      return { payload, holderProof };
    },
    verifyInput({ payload, holderProof }) {
      return { payload, holderProof };
    },
  };
  return {
    signer,
    state,
    service: new SelfIssuedCredentialService(adapter, signer, binding),
  };
}

function request(signer) {
  return {
    credentialId: 'self-credential-1',
    holder: {
      controller: signer.descriptor.controller,
      keyId: signer.descriptor.keyId,
    },
    type: 'SyntheticMembershipClaim',
    format: 'w3c-vc-di',
    claims: { membership: 'synthetic-club', active: true },
    issuedAt: 1_800_000_000,
    expiresAt: 1_900_000_000,
  };
}

test('wallet creates a holder-bound credential with permanent self-attested assurance', async () => {
  const { service, signer } = setup();
  const credential = await service.create(request(signer));

  assert.equal(credential.assurance, SELF_ATTESTED_ASSURANCE);
  assert.equal(credential.issuer, signer.descriptor.controller);
  assert.equal(credential.subject, signer.descriptor.controller);
  assert.equal(credential.holderProof.keyId, signer.descriptor.keyId);
  assert.equal(Object.isFrozen(credential), true);
  assert.equal(Object.isFrozen(credential.claims), true);
  assert.deepEqual(await service.verify(credential), {
    status: 'verified',
    assurance: 'self_attested',
    holderControlled: true,
    formatResult: {
      status: 'verified',
      format: 'w3c-vc-di',
      profile: CREDENTIAL_FORMAT_PINS['w3c-vc-di'].profile,
      version: CREDENTIAL_FORMAT_PINS['w3c-vc-di'].version,
      reasonCode: 'VERIFIED',
      algorithm: 'ecdsa-rdfc-2019',
      issuer: signer.descriptor.controller,
      subject: signer.descriptor.controller,
      credentialTypes: ['SyntheticMembershipClaim'],
      claims: { membership: 'synthetic-club', active: true },
      disclosedClaims: { membership: 'synthetic-club', active: true },
      holderBound: true,
    },
  });
});

test('assurance escalation, issuer substitution, and reserved metadata claims fail before signing', async () => {
  const { service, signer } = setup();

  await assert.rejects(
    () =>
      service.create({
        ...request(signer),
        assurance: 'institutional',
      }),
    (error) =>
      error instanceof SelfIssuedCredentialError &&
      error.code === 'ASSURANCE_ESCALATION',
  );
  await assert.rejects(
    () =>
      service.create({
        ...request(signer),
        issuer: 'https://institution.example/issuer',
      }),
    (error) =>
      error instanceof SelfIssuedCredentialError &&
      error.code === 'ISSUER_SUBSTITUTION',
  );
  await assert.rejects(
    () =>
      service.create({
        ...request(signer),
        claims: { assurance: 'institutional' },
      }),
    (error) =>
      error instanceof SelfIssuedCredentialError &&
      error.code === 'ASSURANCE_ESCALATION',
  );
  assert.equal(signer.counter, 0);
});

test('institutional policy always rejects self-attested credentials', async () => {
  const { service, signer } = setup();
  const credential = await service.create(request(signer));
  const verification = await service.verify(credential);

  assert.deepEqual(
    evaluateSelfIssuedPolicy(verification, {
      kind: 'institutional',
      acceptedAssurance: ['institutional', 'government'],
    }),
    {
      status: 'rejected',
      reasonCode: 'INSTITUTIONAL_ASSURANCE_REQUIRED',
    },
  );
  assert.deepEqual(
    evaluateSelfIssuedPolicy(verification, {
      kind: 'self_attested',
      acceptedAssurance: ['self_attested'],
    }),
    { status: 'accepted', assurance: 'self_attested' },
  );
  assert.deepEqual(
    evaluateSelfIssuedPolicy(
      {
        status: 'rejected',
        reasonCode: 'HOLDER_CONTROL_FAILED',
        assurance: 'self_attested',
        holderControlled: false,
      },
      { kind: 'self_attested', acceptedAssurance: ['self_attested'] },
    ),
    {
      status: 'rejected',
      reasonCode: 'INVALID_SELF_ATTESTED_CREDENTIAL',
    },
  );
});

test('detached, inactive, and unverified holder keys fail closed', async () => {
  {
    const { service, signer } = setup();
    signer.descriptor = {
      ...signer.descriptor,
      controller: 'did:example:other',
    };
    await assert.rejects(
      () =>
        service.create(
          request({
            descriptor: {
              ...signer.descriptor,
              controller: 'did:example:synthetic-holder',
            },
          }),
        ),
      (error) =>
        error instanceof SelfIssuedCredentialError &&
        error.code === 'HOLDER_KEY_DETACHED',
    );
  }
  {
    const { service, signer } = setup();
    signer.descriptor = { ...signer.descriptor, status: 'revoked' };
    await assert.rejects(
      () => service.create(request(signer)),
      (error) =>
        error instanceof SelfIssuedCredentialError &&
        error.code === 'HOLDER_KEY_INACTIVE',
    );
  }
  {
    const { service, signer } = setup();
    signer.nextSignatureKeyId = 'did:example:synthetic-holder#detached';
    await assert.rejects(
      () => service.create(request(signer)),
      (error) =>
        error instanceof SelfIssuedCredentialError &&
        error.code === 'HOLDER_KEY_DETACHED',
    );
  }
  {
    const { service, signer } = setup();
    signer.verifyControl = false;
    await assert.rejects(
      () => service.create(request(signer)),
      (error) =>
        error instanceof SelfIssuedCredentialError &&
        error.code === 'HOLDER_CONTROL_FAILED',
    );
  }
});

test('format-level detached binding and failed proof verification are rejected', async () => {
  {
    const { service, signer, state } = setup();
    state.keyIdOverride = 'did:example:synthetic-holder#detached';
    await assert.rejects(
      () => service.create(request(signer)),
      (error) =>
        error instanceof SelfIssuedCredentialError &&
        error.code === 'FORMAT_BINDING_FAILED',
    );
  }
  {
    const { service, signer, state } = setup();
    const credential = await service.create(request(signer));
    state.formatVerified = false;
    assert.deepEqual(await service.verify(credential), {
      status: 'rejected',
      reasonCode: 'FORMAT_VERIFICATION_FAILED',
      assurance: 'self_attested',
      holderControlled: false,
    });
  }
  {
    const { service, signer, state } = setup();
    const credential = await service.create(request(signer));
    state.claimsOverride = {
      membership: 'institution-substituted',
      active: true,
    };
    assert.equal(
      (await service.verify(credential)).status,
      'rejected',
      'format claims must stay bound to the wallet-signed payload',
    );
  }
});

test('mutating assurance or holder proof cannot upgrade or preserve verification', async () => {
  const { service, signer } = setup();
  const credential = await service.create(request(signer));

  assert.deepEqual(
    await service.verify({ ...credential, assurance: 'institutional' }),
    {
      status: 'rejected',
      reasonCode: 'ASSURANCE_ESCALATION',
      assurance: 'self_attested',
      holderControlled: false,
    },
  );
  assert.deepEqual(
    await service.verify({
      ...credential,
      holderProof: {
        ...credential.holderProof,
        signature: encoder.encode('detached'),
      },
    }),
    {
      status: 'rejected',
      reasonCode: 'HOLDER_CONTROL_FAILED',
      assurance: 'self_attested',
      holderControlled: false,
    },
  );
});
