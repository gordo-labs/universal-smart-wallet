import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createBrowserIssuerClient } from '../dist/issuer/browser.js';
import { IdentitySdkError } from '../dist/browser.js';
import { createServerIssuerClient as createServer } from '../dist/issuer/server.js';

const response = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const template = {
  schemaVersion: 1,
  tenantId: 'tenant-1',
  templateId: 'degree',
  version: 1,
  type: 'UniversityDegree',
  assurance: 'institutional',
  formats: ['sd-jwt-vc'],
  claims: [
    {
      name: 'name',
      type: 'string',
      required: true,
      selectivelyDisclosable: true,
    },
  ],
  status: 'published',
};
const issuance = {
  sessionId: 'session-1',
  issuerId: 'issuer-1',
  templateId: 'degree',
  templateVersion: 1,
  format: 'sd-jwt-vc',
  reviewerPolicyId: 'policy-1',
  claims: { name: 'Synthetic Holder' },
  subjectBinding: {
    schemaVersion: 1,
    bindingId: 'binding-1',
    method: 'jwk-thumbprint',
    value: 'synthetic-thumbprint',
  },
  evidence: [
    {
      evidenceId: 'evidence-1',
      kind: 'transcript',
      digest: `sha256:${'a'.repeat(64)}`,
      source: 'synthetic://evidence/1',
    },
  ],
  expiresAt: 2_000_000_000_000,
};

test('issuer client exposes every issuer operation with tenant boundaries', async () => {
  const calls = [];
  const client = createBrowserIssuerClient({
    baseUrl: 'https://issuer.example',
    token: 'synthetic-token',
    fetch: async (url, init) => {
      calls.push([url, init]);
      return response({ ok: true, version: 'v1' });
    },
  });

  await client.registerTemplate('tenant-1', template);
  await client.registerIssuer('tenant-1', {
    schemaVersion: 1,
    tenantId: 'tenant-1',
    issuerId: 'issuer-1',
    issuerUri: 'https://issuer.example',
    assurance: 'institutional',
    keyRef: 'kms-key-1',
    authorizedTemplateIds: ['degree'],
  });
  await client.registerReviewerPolicy('tenant-1', {
    schemaVersion: 1,
    tenantId: 'tenant-1',
    policyId: 'policy-1',
    templateId: 'degree',
    requiredApprovals: 1,
    authorizedReviewerIds: ['reviewer-1'],
  });
  await client.createIssuanceRequest('tenant-1', issuance);
  await client.getIssuanceSession('tenant-1', 'session-1');
  await client.reviewIssuance('tenant-1', 'session-1', {
    decision: 'approved',
  });
  await client.createOffer('tenant-1', 'session-1', {
    flow: 'pre-authorized_code',
  });
  await client.authorize('tenant-1', {
    issuer_state: 'synthetic-state',
    client_id: 'wallet-1',
    redirect_uri: 'https://wallet.example/callback',
    state: 'state-1',
  });
  await client.exchangeToken('tenant-1', {
    grant_type: 'authorization_code',
    code: 'synthetic-code',
  });
  await client.issueCredential('tenant-1', 'synthetic-access-token', {
    credential_configuration_id: 'degree.v1.sd-jwt-vc',
    proof: { proof_type: 'jwt', jwt: 'synthetic-proof' },
  });
  await client.getCredential('tenant-1', 'credential-1');
  await client.reissueCredential('tenant-1', 'credential-1', issuance);
  await client.suspendCredential('tenant-1', 'credential-1');
  await client.revokeCredential('tenant-1', 'credential-1');

  assert.equal(calls.length, 14);
  const tenantCalls = calls.filter(([url]) => !url.includes('/oid4vci/'));
  for (const [, init] of tenantCalls)
    assert.equal(init.headers['x-tenant-id'], 'tenant-1');
  assert.equal(calls[0][1].headers.authorization, 'Bearer synthetic-token');
  const credentialCall = calls.find(([url]) => url.endsWith('/credential'));
  assert.equal(
    credentialCall[1].headers.authorization,
    'Bearer synthetic-access-token',
  );
  assert.equal(calls.at(-1)[1].method, 'POST');
});

test('only explicitly idempotent administrative mutations retry', async () => {
  let calls = 0;
  const client = createBrowserIssuerClient({
    baseUrl: 'https://issuer.example',
    retry: { retries: 2, baseDelayMs: 1 },
    fetch: async (_url, init) => {
      calls += 1;
      assert.equal(init.headers['idempotency-key'], 'issue-1');
      return calls < 3
        ? response({ error: { message: 'do not expose this' } }, 503)
        : response({ ok: true });
    },
  });
  await client.registerTemplate('tenant-1', template, {
    idempotencyKey: 'issue-1',
  });
  assert.equal(calls, 3);

  let ambiguousCalls = 0;
  const ambiguous = createBrowserIssuerClient({
    baseUrl: 'https://issuer.example',
    retry: { retries: 5, baseDelayMs: 1 },
    fetch: async (_url, init) => {
      ambiguousCalls += 1;
      assert.equal(init.headers.authorization, 'Bearer synthetic-access');
      return response({ error: { message: 'signing detail' } }, 503);
    },
  });
  await assert.rejects(
    ambiguous.issueCredential(
      'tenant-1',
      'synthetic-access',
      {
        credential_configuration_id: 'degree.v1.sd-jwt-vc',
        proof: { proof_type: 'jwt', jwt: 'synthetic-proof' },
      },
      { idempotencyKey: 'ignored-for-ambiguous-issue' },
    ),
    (error) => error instanceof IdentitySdkError && error.code === 'HTTP_ERROR',
  );
  assert.equal(ambiguousCalls, 1);
});

test('authentication errors are redacted and server issuer client owns API key', async () => {
  const rejected = createBrowserIssuerClient({
    baseUrl: 'https://issuer.example',
    fetch: async () =>
      response(
        { error: { code: 'AUTH_INVALID', message: 'secret-value' } },
        401,
      ),
  });
  await assert.rejects(
    rejected.getCredential('tenant-1', 'credential-1'),
    (error) =>
      error instanceof IdentitySdkError &&
      error.message === 'Authentication failed' &&
      !error.message.includes('secret-value'),
  );

  const server = createServer({
    baseUrl: 'https://issuer.example',
    apiKey: 'synthetic-api-key',
    fetch: async (_url, init) => {
      assert.equal(init.headers.authorization, 'ApiKey synthetic-api-key');
      return response({ ok: true });
    },
  });
  await server.health();
  const browser = await import('../dist/issuer/browser.js');
  assert.equal(Object.hasOwn(browser, 'createServerIssuerClient'), false);
});

test('issuer SDK path and operation map stays in OpenAPI lockstep', async () => {
  const schema = JSON.parse(
    await readFile(
      new URL('../../../apps/issuer-service/openapi.json', import.meta.url),
      'utf8',
    ),
  );
  const expected = {
    '/v1/health': ['get'],
    '/.well-known/openid-credential-issuer': ['get'],
    '/v1/templates': ['post'],
    '/v1/issuers': ['post'],
    '/v1/reviewer-policies': ['post'],
    '/v1/issuance-requests': ['post'],
    '/v1/issuance-requests/{sessionId}': ['get'],
    '/v1/issuance-requests/{sessionId}/reviews': ['post'],
    '/v1/issuance-requests/{sessionId}/offers': ['post'],
    '/v1/oid4vci/{tenantId}/authorize': ['post'],
    '/v1/oid4vci/{tenantId}/token': ['post'],
    '/v1/oid4vci/{tenantId}/credential': ['post'],
    '/v1/credentials/{credentialId}': ['get'],
    '/v1/credentials/{credentialId}/reissue': ['post'],
    '/v1/credentials/{credentialId}/suspend': ['post'],
    '/v1/credentials/{credentialId}/revoke': ['post'],
  };
  assert.deepEqual(
    Object.keys(schema.paths).sort(),
    Object.keys(expected).sort(),
  );
  for (const [path, methods] of Object.entries(expected))
    assert.deepEqual(Object.keys(schema.paths[path]).sort(), methods.sort());
});
