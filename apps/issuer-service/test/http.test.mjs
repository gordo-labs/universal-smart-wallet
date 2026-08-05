import test from 'node:test';
import assert from 'node:assert/strict';
import { IssuerHttpApi } from '../dist/index.js';

const actor = {
  tenantId: 'tenant-a',
  principalId: 'operator-a',
  scopes: ['issuance:write', 'issuance:read'],
};

test('strict REST adapter routes tenant-scoped issuance and never leaks claims', async () => {
  const calls = [];
  const service = {
    createIssuanceRequest(receivedActor, input) {
      calls.push({ receivedActor, input });
      return {
        schemaVersion: 1,
        tenantId: receivedActor.tenantId,
        sessionId: input.sessionId,
        kind: 'issue',
        issuerId: input.issuerId,
        templateId: input.templateId,
        templateVersion: input.templateVersion,
        format: input.format,
        reviewerPolicyId: input.reviewerPolicyId,
        state: 'pending_review',
        evidence: input.evidence,
        reviews: [],
        expiresAt: input.expiresAt,
      };
    },
  };
  const api = new IssuerHttpApi(service, {
    authenticate: async () => actor,
  });
  const response = await api.handle(
    new Request('https://issuer.example/v1/issuance-requests', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-tenant-id': 'tenant-a',
      },
      body: JSON.stringify({
        sessionId: 'session-a',
        issuerId: 'issuer-a',
        templateId: 'template-a',
        templateVersion: 1,
        format: 'sd-jwt-vc',
        reviewerPolicyId: 'policy-a',
        claims: { employee_id: 'synthetic-1' },
        subjectBinding: {
          schemaVersion: 1,
          bindingId: 'binding-a',
          method: 'jwk-thumbprint',
          value: 'synthetic-thumbprint',
        },
        evidence: [
          {
            evidenceId: 'evidence-a',
            kind: 'synthetic-check',
            digest: `sha256:${'a'.repeat(64)}`,
            source: 'synthetic-fixture',
          },
        ],
        expiresAt: 2_000_000,
      }),
    }),
  );
  assert.equal(response.status, 201);
  const text = await response.text();
  assert.equal(text.includes('synthetic-1'), false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].receivedActor.tenantId, 'tenant-a');
});

test('REST adapter rejects tenant escape, unsupported media types, and unknown routes', async () => {
  const api = new IssuerHttpApi(
    { createIssuanceRequest: () => assert.fail('must not route') },
    { authenticate: async () => actor },
  );
  const tenantEscape = await api.handle(
    new Request('https://issuer.example/v1/issuance-requests', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-tenant-id': 'tenant-b',
      },
      body: '{}',
    }),
  );
  assert.equal(tenantEscape.status, 403);
  assert.deepEqual(await tenantEscape.json(), {
    error: { code: 'TENANT_MISMATCH' },
  });

  const wrongType = await api.handle(
    new Request('https://issuer.example/v1/issuance-requests', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{}',
    }),
  );
  assert.equal(wrongType.status, 415);
  assert.deepEqual(await wrongType.json(), {
    error: { code: 'CONTENT_TYPE_UNSUPPORTED' },
  });

  const missing = await api.handle(
    new Request('https://issuer.example/v1/not-a-route'),
  );
  assert.equal(missing.status, 404);
});

test('OpenAPI contract is 3.1 and marks request objects closed', async () => {
  const contract = JSON.parse(
    await (
      await import('node:fs/promises')
    ).readFile(new URL('../openapi.json', import.meta.url), 'utf8'),
  );
  assert.equal(contract.openapi, '3.1.0');
  assert.equal(
    contract.components.schemas.IssuanceRequest.additionalProperties,
    false,
  );
  assert.ok(contract.paths['/v1/oid4vci/{tenantId}/credential']);
  assert.ok(contract.paths['/v1/credentials/{credentialId}/reissue']);
});
