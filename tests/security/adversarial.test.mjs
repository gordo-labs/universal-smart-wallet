import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPair, exportJWK } from 'jose';

import {
  issue,
  present,
  verify,
  SdJwtVerificationError,
} from '../../packages/sd-jwt-adapter/dist/index.js';
import {
  InMemoryReplayStore,
  createChallenge,
  verifyChallenge,
  evaluateIssuerTrust,
  StatusCache,
} from '../../packages/credential-domain/dist/index.js';
import {
  createVaultEnvelope,
  openVaultEnvelope,
  createVaultBackup,
  openVaultBackup,
} from '../../packages/credential-vault/dist/index.js';
import {
  assertERC7579Policy,
  createERC7579Lifecycle,
  createRecoveryController,
} from '../../packages/account-adapter/dist/index.js';
import {
  WalletController,
  sanitizeRemoteText,
} from '../../apps/wallet-web/dist/index.js';
import {
  createSyntheticVpToken,
  createVerifierDemo,
} from '../../apps/verifier-demo/dist/index.js';

const bytes = (length, seed = 1) =>
  Uint8Array.from({ length }, (_, index) => (seed + index) & 0xff);
const deterministicRandom =
  (seed = 1) =>
  (length) =>
    bytes(length, seed++);

async function credentialFixture() {
  const issuer = await generateKeyPair('ES256');
  const holder = await generateKeyPair('ES256');
  const credential = await issue({
    issuer: 'https://issuer.example/synthetic',
    vct: 'AgeCredential',
    claims: { is_over_18: true, country: 'ES', given_name: 'Synthetic Holder' },
    issuerKey: issuer.privateKey,
    issuerKid: 'issuer-2026-07',
    holderJwk: await exportJWK(holder.publicKey),
    issuedAt: 1_700_000_000,
    expiresAt: 2_000_000_000,
  });
  return { issuer, holder, credential };
}

test('property: replay challenges are single-use for deterministic seeds', () => {
  for (let seed = 1; seed <= 32; seed += 1) {
    const clock = { now: () => 1_000_000 + seed };
    const challenge = createChallenge(`https://verifier-${seed}.example`, {
      clock,
      ttlMs: 1_000,
      random: { randomBytes: (length) => bytes(length, seed) },
    });
    const store = new InMemoryReplayStore();
    store.issue(challenge);
    assert.deepEqual(
      verifyChallenge(
        store,
        {
          value: challenge.value,
          audience: challenge.audience,
          now: clock.now(),
        },
        challenge,
      ),
      { ok: true, challenge },
    );
    assert.deepEqual(
      verifyChallenge(
        store,
        {
          value: challenge.value,
          audience: challenge.audience,
          now: clock.now(),
        },
        challenge,
      ),
      { ok: false, code: 'CHALLENGE_REUSED' },
    );
  }
});

test('JOSE rejects every deterministic mutation of a presentation', async () => {
  const { issuer, holder, credential } = await credentialFixture();
  const disclosure = credential.disclosures[0];
  const presentation = await present({
    token: credential.token,
    disclosures: [disclosure],
    holderKey: holder.privateKey,
    holderKid: 'holder-2026-07',
    audience: 'https://verifier.example',
    nonce: 'nonce-1',
  });
  const parts = presentation.split('~');
  for (const index of [0, parts.length - 1]) {
    const mutated = [...parts];
    const value = mutated[index];
    // Mutate a non-padding character. Changing the final base64url character
    // can leave the decoded bytes unchanged when only unused padding bits
    // differ, which makes this adversarial check flaky.
    const mutationOffset = Math.floor(value.length / 2);
    const mutation = value[mutationOffset] === 'A' ? 'B' : 'A';
    mutated[index] =
      value.slice(0, mutationOffset) +
      mutation +
      value.slice(mutationOffset + 1);
    await assert.rejects(
      verify({
        presentation: mutated.join('~'),
        issuerKey: issuer.publicKey,
        expectedAudience: 'https://verifier.example',
        expectedNonce: 'nonce-1',
        now: 1_800_000_000,
      }),
      (error) => error instanceof Error,
    );
  }
  await assert.rejects(
    verify({
      presentation,
      issuerKey: issuer.publicKey,
      expectedAudience: 'https://verifier.example',
      expectedNonce: 'wrong-nonce',
      now: 1_800_000_000,
    }),
    (error) =>
      error instanceof SdJwtVerificationError && /nonce/i.test(error.message),
  );
});

test('vault authentication never returns partial plaintext under tampering', async () => {
  const secret = bytes(32, 11);
  const plaintext = new TextEncoder().encode('synthetic credential payload');
  const envelope = await createVaultEnvelope(plaintext, {
    strategy: 'prf',
    prfOutput: secret,
    associatedData: new TextEncoder().encode('metadata-id'),
    randomBytes: deterministicRandom(19),
  });
  for (const field of ['wrappedDek', 'payload']) {
    const tampered = structuredClone(envelope);
    tampered[field].ciphertext =
      `${tampered[field].ciphertext.slice(0, -1)}${tampered[field].ciphertext.endsWith('A') ? 'B' : 'A'}`;
    await assert.rejects(() => openVaultEnvelope(tampered, secret));
  }
  await assert.rejects(() => openVaultEnvelope(envelope, bytes(32, 12)));
});

test('encrypted backup is monotonic and contains no plaintext credential values', async () => {
  const entry = {
    id: 'synthetic-1',
    credentialType: 'AgeCredential',
    issuer: 'https://issuer.example',
    envelope: await createVaultEnvelope(
      new TextEncoder().encode(
        JSON.stringify({ is_over_18: true, birthdate: 'never-real' }),
      ),
      {
        strategy: 'prf',
        prfOutput: bytes(32, 3),
        randomBytes: deterministicRandom(7),
      },
    ),
  };
  const backup = await createVaultBackup([entry], {
    strategy: 'passphrase',
    passphrase: 'synthetic recovery factor',
    sequence: 4,
    createdAt: '2026-07-29T00:00:00Z',
    randomBytes: deterministicRandom(13),
  });
  assert.equal(JSON.stringify(backup).includes('birthdate'), false);
  await assert.rejects(
    () =>
      openVaultBackup(backup, 'synthetic recovery factor', {
        minimumSequence: 5,
      }),
    /rollback/i,
  );
  assert.equal(
    (
      await openVaultBackup(backup, 'synthetic recovery factor', {
        minimumSequence: 4,
      })
    ).entries.length,
    1,
  );
});

test('trust and status controls fail closed for unknown issuers, stale data, and SSRF', async () => {
  const trust = evaluateIssuerTrust(
    {
      version: 1,
      generatedAt: 0,
      expiresAt: 100,
      issuers: [{ issuer: 'https://issuer.example', keyIds: ['k1'] }],
    },
    'https://evil.example',
    'k1',
    { now: () => 10 },
  );
  assert.deepEqual(trust, { ok: false, code: 'unknown_issuer' });
  let now = 10;
  const cache = new StatusCache(
    async () => ({
      status: 200,
      body: JSON.stringify({ status: 'valid', expiresAt: 20, index: 1 }),
    }),
    { clock: () => now },
  );
  assert.equal((await cache.lookup('https://issuer.example/status')).ok, true);
  now = 21;
  const unavailable = new StatusCache(
    async () => {
      throw new Error('offline');
    },
    { clock: () => now },
  );
  assert.equal(
    (await unavailable.lookup('https://issuer.example/status')).code,
    'unavailable',
  );
  assert.equal(
    (await cache.lookup('http://127.0.0.1/status')).code,
    'ssrf_blocked',
  );
});

test('account recovery and module policy reject duplicate/unsafe control paths', async () => {
  const guardianA = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const guardianB = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const controller = createRecoveryController(
    {
      account: '0x1111111111111111111111111111111111111111',
      guardians: [guardianA, guardianB],
      threshold: 2,
      timelockBlocks: 3,
    },
    guardianA,
  );
  await controller.propose('0x2222222222222222222222222222222222222222', 10);
  controller.approve(guardianA);
  assert.equal(controller.approve(guardianA).approvals.length, 1);
  assert.throws(() => controller.execute(13), /threshold/i);
  controller.approve(guardianB);
  assert.throws(() => controller.execute(12), /timelock/i);
  assert.equal(
    controller.execute(13),
    '0x2222222222222222222222222222222222222222',
  );
  assert.throws(
    () =>
      assertERC7579Policy({
        draft: 'wrong',
        adapter: 'wrong',
        modules: [],
      }),
    /unsupported|pin/i,
  );
  const lifecycle = createERC7579Lifecycle({
    draft: 'erc-7579-draft-2024-03',
    adapter: 'ssw-erc7579-adapter-v1',
    modules: [],
  });
  assert.throws(
    () => lifecycle.use('0x3333333333333333333333333333333333333333'),
    /not installed/i,
  );
});

test('consent and demo errors are redacted and deterministic', async () => {
  const wallet = new WalletController();
  wallet.setup('synthetic factor that is never logged');
  const sanitized = sanitizeRemoteText(
    '<script>https://evil.example</script>Verifier\u0000',
  );
  assert.doesNotMatch(sanitized, /<|>|[\u0000-\u001f]/u);
  const cancelled = wallet.denyPresentation();
  assert.doesNotMatch(
    cancelled.message,
    /synthetic|birth|is_over_18|token|secret/i,
  );
  const verifier = createVerifierDemo();
  const request = verifier.createRequest();
  const token = createSyntheticVpToken({
    audience: request.client_id,
    nonce: request.nonce,
    fixture: 'claim-mismatch',
  });
  const result = await verifier.callback(
    `state=${request.state}&vp_token=${token}`,
  );
  assert.deepEqual(result, { ok: false, code: 'verification_failed' });
  assert.doesNotMatch(JSON.stringify(result), /is_over_18|birth|synthetic/i);
});
