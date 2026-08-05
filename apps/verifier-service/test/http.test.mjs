import test from 'node:test';
import assert from 'node:assert/strict';
import { VerifierHttpApi } from '../dist/index.js';

test('exposes session, direct_post response and receipt routes without echoing presentations', async () => {
  const sessions = new Map();
  const receipts = new Map();
  const service = {
    createSession(policyId) {
      const value = {
        schemaVersion: 1,
        sessionId: 'session-1',
        tenantId: 'tenant-a',
        policyId,
        nonce: 'nonce-1',
        state: 'state-1',
        status: 'requested',
        createdAt: new Date(0).toISOString(),
        expiresAt: new Date(60_000).toISOString(),
        request: { response_mode: 'direct_post' },
      };
      sessions.set(value.sessionId, value);
      return value;
    },
    getSession: (id) => sessions.get(id),
    getReceipt: (id) => receipts.get(id),
    async verifyResponse(sessionId, body) {
      assert.equal(body.includes('opaque-secret-presentation'), true);
      const receipt = {
        schemaVersion: 1,
        receiptId: 'receipt-1',
        sessionId,
        tenantId: 'tenant-a',
        policyId: 'policy-1',
        result: 'verified',
        reasonCode: 'VERIFIED',
        verifiedAt: new Date(0).toISOString(),
        checks: ['signature'],
      };
      receipts.set(receipt.receiptId, receipt);
      return receipt;
    },
  };
  const api = new VerifierHttpApi({ service });
  const created = await api.handle(
    new Request('https://verifier.example/v1/verification-sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ policyId: 'policy-1' }),
    }),
  );
  assert.equal(created.status, 201);
  const session = await created.json();
  const result = await api.handle(
    new Request(
      `https://verifier.example/v1/verification-sessions/${session.sessionId}/responses`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'state=state-1&vp_token=opaque-secret-presentation',
      },
    ),
  );
  assert.equal(result.status, 200);
  const text = await result.text();
  assert.equal(text.includes('opaque-secret-presentation'), false);
  assert.equal(JSON.parse(text).result, 'verified');
});

test('rejects unknown JSON fields and unsupported direct_post content types', async () => {
  const api = new VerifierHttpApi({
    service: {
      createSession: () => assert.fail('must not be called'),
      getSession: () => undefined,
      getReceipt: () => undefined,
      verifyResponse: () => assert.fail('must not be called'),
    },
  });
  const unknown = await api.handle(
    new Request('https://verifier.example/v1/verification-sessions', {
      method: 'POST',
      body: JSON.stringify({ policyId: 'p', presentation: 'secret' }),
    }),
  );
  assert.equal(unknown.status, 400);
  assert.deepEqual(await unknown.json(), { error: { code: 'UNKNOWN_FIELD' } });
  const wrongType = await api.handle(
    new Request(
      'https://verifier.example/v1/verification-sessions/session-1/responses',
      { method: 'POST', body: '{}' },
    ),
  );
  assert.equal(wrongType.status, 415);
});
