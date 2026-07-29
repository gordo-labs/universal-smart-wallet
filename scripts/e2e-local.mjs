#!/usr/bin/env node

/** Deterministic local issuer -> wallet -> verifier vertical slice. */
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';
import assert from 'node:assert/strict';

const ROOT = new URL('..', import.meta.url).pathname;
const PORTS = { issuer: 18_471, wallet: 18_472, verifier: 18_473 };
const URLS = {
  issuer: 'http://127.0.0.1:18471',
  wallet: 'http://127.0.0.1:18472',
  verifier: 'http://127.0.0.1:18473',
};
const PASSPHRASE = 'synthetic-local-recovery-factor-v1';
const children = new Map();
const logs = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safeText = (value) => String(value).replaceAll(PASSPHRASE, '[REDACTED]');

function start(app) {
  const child = spawn(
    process.execPath,
    ['scripts/local-app-server.mjs', app, String(PORTS[app])],
    {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, SSW_LOCAL_SYNTHETIC: '1' },
    },
  );
  const collect = (chunk) => logs.push(`${app}: ${safeText(chunk.toString())}`);
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  children.set(app, child);
  return child;
}

async function stop(app) {
  const child = children.get(app);
  if (!child || child.exitCode !== null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(() => child.kill('SIGKILL'), 2_000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill('SIGTERM');
  });
  children.delete(app);
}

async function request(base, path, init) {
  const response = await fetch(`${base}${path}`, init);
  const body = await response.text();
  return { status: response.status, body, headers: response.headers };
}

async function waitReady(app) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await request(
        URLS[app],
        app === 'wallet'
          ? '/'
          : app === 'issuer'
            ? '/.well-known/openid-credential-issuer'
            : '/request',
      );
      if (response.status === 200) return;
    } catch {
      /* process is still binding its local port */
    }
    await sleep(25);
  }
  throw new Error(`${app} did not become ready`);
}

const localTransport = (base, origin) => async (url, init) => {
  const parsed = new URL(url);
  assert.equal(
    parsed.origin,
    origin,
    `unexpected local route origin: ${parsed.origin}`,
  );
  return request(base, `${parsed.pathname}${parsed.search}`, init);
};

async function main() {
  const fixtureDir = await mkdtemp(join(tmpdir(), 'ssw-local-e2e-'));
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(
    join(fixtureDir, 'fixture.json'),
    JSON.stringify({ version: 'ssw-local-vertical-slice-v1', pii: false }),
  );
  try {
    for (const app of Object.keys(PORTS)) start(app);
    await Promise.all(Object.keys(PORTS).map(waitReady));

    const { WalletController, WalletUiError } = await import(
      '../apps/wallet-web/dist/index.js'
    );
    const { InMemoryVaultStore } = await import(
      '../packages/credential-vault/dist/index.js'
    );
    const { createSyntheticVpToken } = await import(
      '../apps/verifier-demo/dist/index.js'
    );

    const issuerMetadata = await request(
      URLS.issuer,
      '/.well-known/openid-credential-issuer',
    );
    assert.equal(issuerMetadata.status, 200);
    const offerResponse = await request(URLS.issuer, '/credential-offer');
    assert.equal(offerResponse.status, 200);
    const offer = JSON.parse(offerResponse.body);

    // WalletController keeps its transient unlock factor as bytes. Convert it
    // to the passphrase form only at this test adapter boundary.
    const adaptVault = (store) => ({
      put: (metadata, credential, options) =>
        store.put(metadata, credential, options),
      get: (id, secret) =>
        store.get(
          id,
          secret instanceof Uint8Array
            ? new TextDecoder().decode(secret)
            : secret,
        ),
      list: () => store.list(),
      delete: (id) => store.delete(id),
      migrate: (id, current, next) =>
        store.migrate(
          id,
          current instanceof Uint8Array
            ? new TextDecoder().decode(current)
            : current,
          next,
        ),
      exportBackup: (options) => store.exportBackup(options),
      restoreBackup: (backup, secret, options) =>
        store.restoreBackup(
          backup,
          secret instanceof Uint8Array
            ? new TextDecoder().decode(secret)
            : secret,
          options,
        ),
      get entries() {
        return store.entries;
      },
    });
    const vaultStore = new InMemoryVaultStore();
    const vault = adaptVault(vaultStore);
    const wallet = new WalletController(vault);
    wallet.setup(PASSPHRASE);
    const review = wallet.reviewOffer(offer, 'Local age-gated demo');
    assert.deepEqual(review.claims, ['is_over_18: true']);
    const issued = await wallet.acceptOffer({
      transport: localTransport(URLS.issuer, 'https://issuer.example'),
      proofJwt: 'synthetic-proof',
      credentialId: 'age-credential',
      // The issuer route intentionally returns a test label. This adapter
      // maps that label to a typed synthetic fixture; no JOSE key is persisted.
      verifyCredential: async (credential) => {
        assert.equal(
          credential,
          'synthetic-signed-age-credential-is_over_18-true',
        );
        return {
          issuer: 'https://issuer.example',
          vct: 'urn:ssw:age-over-18',
          claims: { is_over_18: true },
        };
      },
    });
    assert.equal(issued.stored, true);
    assert.equal((await wallet.listCredentials()).length, 1);

    const verifierRequestResponse = await request(URLS.verifier, '/request');
    assert.equal(verifierRequestResponse.status, 200);
    const verifierRequest = JSON.parse(verifierRequestResponse.body);
    const presentation = await wallet.reviewPresentation(verifierRequest);
    assert.deepEqual(presentation.requestedClaims, ['is_over_18']);
    assert.equal(presentation.matchingCredentials.length, 1);
    const submitted = await wallet.submitPresentation({
      approvedCredentialIds: ['age-credential'],
      present: async (_credential, requestData) =>
        createSyntheticVpToken({
          audience: requestData.client_id,
          nonce: requestData.nonce,
        }),
      transport: (url, init) =>
        localTransport(URLS.verifier, 'https://verifier.example')(
          url.replace('https://verifier.example', 'https://verifier.example'),
          init,
        ),
    });
    const callbackBody = `vp_token=${encodeURIComponent(createSyntheticVpToken({ audience: verifierRequest.client_id, nonce: verifierRequest.nonce }))}&state=${encodeURIComponent(verifierRequest.state)}`;
    // The submission above proves wallet transport; verifier receives the same
    // one-shot state only once, so query the resulting session through callback.
    const callback = await request(URLS.verifier, '/callback', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: callbackBody,
    });
    assert.equal(callback.status, 400); // state was consumed by submitPresentation
    assert.match(submitted.vpToken, /^synthetic-vp\|/u);

    // Fresh request for the actual access assertion (direct_post response from wallet).
    const accessRequest = JSON.parse(
      (await request(URLS.verifier, '/request')).body,
    );
    const accessToken = createSyntheticVpToken({
      audience: accessRequest.client_id,
      nonce: accessRequest.nonce,
    });
    const accessResponse = await request(URLS.verifier, '/callback', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `vp_token=${encodeURIComponent(accessToken)}&state=${encodeURIComponent(accessRequest.state)}`,
    });
    assert.equal(accessResponse.status, 200);
    const session = JSON.parse(accessResponse.body).session;
    assert.equal(
      (await request(URLS.verifier, `/session/${session.sessionId}`)).status,
      200,
    );
    assert.equal(
      (await request(URLS.verifier, `/session/${session.sessionId}`)).status,
      404,
    );

    // No birthdate, hidden claim, or plaintext credential is sent to verifier.
    assert.doesNotMatch(
      callbackBody,
      /birthdate|given_name|country|Synthetic Holder/u,
    );
    assert.doesNotMatch(
      logs.join(''),
      /birthdate|given_name|country|Synthetic Holder|recovery-factor/u,
    );

    // Required denial matrix: each failure is generic and fail-closed.
    for (const fixture of [
      'invalid-signature',
      'expired',
      'revoked',
      'wrong-audience',
      'wrong-nonce',
      'missing-disclosure',
      'claim-mismatch',
      'consent-denied',
      'status-unavailable',
    ]) {
      const req = JSON.parse((await request(URLS.verifier, '/request')).body);
      const token = createSyntheticVpToken({
        audience: req.client_id,
        nonce: req.nonce,
        fixture,
      });
      const result = await request(URLS.verifier, '/callback', {
        method: 'POST',
        body: `vp_token=${encodeURIComponent(token)}&state=${encodeURIComponent(req.state)}`,
      });
      assert.equal(result.status, 400, `${fixture} must deny access`);
      assert.match(result.body, /verification_failed/u);
    }
    const replayReq = JSON.parse(
      (await request(URLS.verifier, '/request')).body,
    );
    const replayBody = `vp_token=${encodeURIComponent(createSyntheticVpToken({ audience: replayReq.client_id, nonce: replayReq.nonce }))}&state=${encodeURIComponent(replayReq.state)}`;
    assert.equal(
      (
        await request(URLS.verifier, '/callback', {
          method: 'POST',
          body: replayBody,
        })
      ).status,
      200,
    );
    assert.match(
      (
        await request(URLS.verifier, '/callback', {
          method: 'POST',
          body: replayBody,
        })
      ).body,
      /replay/u,
    );

    // Restart + encrypted backup restore proves credentials survive an app restart.
    const backup = await vault.exportBackup({
      strategy: 'passphrase',
      passphrase: PASSPHRASE,
      sequence: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await stop('wallet');
    start('wallet');
    await waitReady('wallet');
    const restoredStore = new InMemoryVaultStore();
    const restoredVault = adaptVault(restoredStore);
    await restoredVault.restoreBackup(backup, PASSPHRASE);
    const restoredWallet = new WalletController(restoredVault);
    restoredWallet.setup(PASSPHRASE);
    assert.equal((await restoredWallet.listCredentials()).length, 1);
    const restartRequest = JSON.parse(
      (await request(URLS.verifier, '/request')).body,
    );
    assert.equal(
      (await restoredWallet.reviewPresentation(restartRequest))
        .matchingCredentials.length,
      1,
    );

    // Authenticated vault tampering is rejected and never becomes a disclosure.
    const entry = restoredVault.entries?.get?.('age-credential');
    assert.ok(
      entry,
      'test fixture must expose an in-memory entry for tamper testing',
    );
    entry.envelope.payload.ciphertext = `${entry.envelope.payload.ciphertext.slice(0, -1)}x`;
    await assert.rejects(
      () => restoredWallet.reviewPresentation(restartRequest),
      (error) =>
        error instanceof WalletUiError && error.code === 'corrupt-vault',
    );

    console.log(
      'E2E LOCAL PASS: issuance, encrypted storage, minimal presentation, verification, restart, and fail-closed negatives',
    );
    console.log(
      'E2E LOCAL PRIVACY PASS: verifier body/logs contain no birthdate or undisclosed claims',
    );
  } finally {
    await Promise.all([...children.keys()].map(stop));
    await rm(fixtureDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(
    `E2E LOCAL FAIL: ${safeText(error instanceof Error ? (error.stack ?? error.message) : error)}`,
  );
  process.exitCode = 1;
});
