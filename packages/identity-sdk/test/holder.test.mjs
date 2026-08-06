import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HolderClientError,
  HolderCredentialClient,
  InMemoryHolderStore,
} from '../dist/holder/index.js';

const artifact = {
  format: 'sd-jwt-vc',
  profile: 'dc+sd-jwt',
  version: '16',
  mediaType: 'application/vc+sd-jwt',
  kind: 'credential',
  value: 'synthetic-credential',
};

const credential = (credentialId = 'cred-1', issuer = 'https://issuer.example') => ({
  credentialId,
  format: 'sd-jwt-vc',
  artifact,
  issuer,
  assurance: 'institutional',
  status: 'active',
  createdAt: 1,
});

test('holder list returns metadata summaries without credential values', async () => {
  const store = new InMemoryHolderStore();
  await store.put(credential());
  const client = new HolderCredentialClient({ store, trustedIssuers: ['https://issuer.example'] });
  const result = await client.list();
  assert.equal(result.length, 1);
  assert.equal(result[0].hasArtifact, true);
  assert.equal('artifact' in result[0], false);
});

test('acceptOffer requires explicit acknowledgement for an unknown issuer', async () => {
  const store = new InMemoryHolderStore();
  const client = new HolderCredentialClient({
    store,
    issuance: {
      metadata: async () => ({}),
      token: async () => ({ access_token: 'access-secret' }),
      credential: async () => ({ credential: 'issued-value', credential_id: 'cred-2' }),
    },
    proofFactory: async () => 'proof-secret',
  });
  await assert.rejects(
    client.acceptOffer({ credential_issuer: 'https://unknown.example' }),
    (error) => error instanceof HolderClientError && error.code === 'UNKNOWN_ISSUER',
  );
  const accepted = await client.acceptOffer(
    { credential_issuer: 'https://unknown.example' },
    { acknowledgeUnknownIssuer: true },
  );
  assert.equal(accepted.credentialId, 'cred-2');
});

test('self-attested creation is permanently labelled self_attested', async () => {
  const store = new InMemoryHolderStore();
  const client = new HolderCredentialClient({
    store,
    selfAttestedCreator: async () => ({ credentialId: 'self-1', format: 'sd-jwt-vc', artifact }),
  });
  const created = await client.createSelfAttested({ claims: { displayName: 'Synthetic' } });
  assert.equal(created.assurance, 'self_attested');
  assert.equal((await client.list())[0].assurance, 'self_attested');
});

test('presentation requires exact claim-specific consent and issuer acknowledgement', async () => {
  const store = new InMemoryHolderStore();
  await store.put(credential());
  let presented;
  const client = new HolderCredentialClient({
    store,
    presenter: async (input) => {
      presented = input;
      return { vp: 'synthetic' };
    },
  });
  await assert.rejects(
    client.present({
      credentialId: 'cred-1',
      claims: ['name'],
      audience: 'https://verifier.example',
      nonce: 'nonce-1',
      consent: { accepted: true, claims: ['age'] },
    }),
    (error) => error instanceof HolderClientError && error.code === 'CLAIM_CONSENT_MISMATCH',
  );
  await assert.rejects(
    client.present({
      credentialId: 'cred-1',
      claims: ['name'],
      audience: 'https://verifier.example',
      nonce: 'nonce-1',
      consent: { accepted: true, claims: ['name'] },
    }),
    (error) => error instanceof HolderClientError && error.code === 'UNKNOWN_ISSUER',
  );
  await client.present({
    credentialId: 'cred-1',
    claims: ['name'],
    audience: 'https://verifier.example',
    nonce: 'nonce-1',
    acknowledgeUnknownIssuer: true,
    consent: { accepted: true, claims: ['name'], reason: 'synthetic test' },
  });
  assert.deepEqual(presented.claims, ['name']);
});

test('export requires explicit confirmation and errors never contain secrets', async () => {
  const store = new InMemoryHolderStore();
  await store.put(credential());
  const client = new HolderCredentialClient({ store });
  await assert.rejects(
    client.export({ confirmExport: false }),
    (error) => error instanceof HolderClientError && error.code === 'EXPORT_CONSENT_REQUIRED',
  );
  const bytes = await client.export({ confirmExport: true });
  assert.match(new TextDecoder().decode(bytes), /synthetic-credential/);
  try {
    await client.inspect('missing');
  } catch (error) {
    assert.equal(error.message, 'Holder operation failed');
    assert.doesNotMatch(error.message, /synthetic-credential/);
  }
});

test('abort signal cancels holder operations before vault access', async () => {
  const store = new InMemoryHolderStore();
  const client = new HolderCredentialClient({ store });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    client.list({ signal: controller.signal }),
    (error) => error instanceof HolderClientError && error.code === 'ABORTED',
  );
});
