import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VerifierClient,
  VerifierClientError,
} from '../dist/verifier/index.js';

const receipt = (result = 'verified', reasonCode = 'VERIFIED') => ({
  schemaVersion: 1,
  receiptId: `receipt-${result}`,
  sessionId: 'session-1',
  tenantId: 'tenant-1',
  policyId: 'policy-1',
  result,
  reasonCode,
  verifiedAt: new Date(0).toISOString(),
  checks: ['signature', 'policy'],
  // A misconfigured service must not make these values visible via the SDK.
  claims: { synthetic_secret: 'do-not-return' },
});

const session = (status = 'requested') => ({
  schemaVersion: 1,
  sessionId: 'session-1',
  tenantId: 'tenant-1',
  policyId: 'policy-1',
  nonce: 'nonce-1',
  state: 'state-1',
  status,
  createdAt: new Date(0).toISOString(),
  expiresAt: new Date(60_000).toISOString(),
  request: { response_mode: 'direct_post', dcql_query: { credentials: [] } },
});

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

test('creates and reads typed verifier sessions', async () => {
  const calls = [];
  const client = new VerifierClient({
    baseUrl: 'https://verifier.example',
    fetch: async (url, init) => {
      calls.push([url, init]);
      return json(init.method === 'POST' ? session() : session('consumed'), init.method === 'POST' ? 201 : 200);
    },
  });
  const created = await client.createSession('policy-1');
  assert.equal(created.status, 'requested');
  assert.deepEqual(JSON.parse(calls[0][1].body), { policyId: 'policy-1' });
  const fetched = await client.getSession('session-1');
  assert.equal(fetched.status, 'consumed');
});

test('submits direct_post once and preserves verified/rejected/indeterminate outcomes without claims', async () => {
  const results = ['verified', 'rejected', 'indeterminate'];
  for (const result of results) {
    let calls = 0;
    const client = new VerifierClient({
      baseUrl: 'https://verifier.example',
      fetch: async (_url, init) => {
        calls += 1;
        assert.equal(init.headers['content-type'], 'application/x-www-form-urlencoded');
        assert.equal(init.body, 'state=state-1&vp_token=opaque-presentation');
        return json(receipt(result, result === 'rejected' ? 'REPLAY_DETECTED' : result === 'indeterminate' ? 'REGISTRY_UNAVAILABLE' : 'VERIFIED'));
      },
    });
    const value = await client.submitResponse('session-1', {
      state: 'state-1',
      vp_token: 'opaque-presentation',
    });
    assert.equal(value.result, result);
    assert.equal(Object.hasOwn(value, 'claims'), false);
    assert.equal(JSON.stringify(value).includes('do-not-return'), false);
    await assert.rejects(
      client.submitResponse('session-1', { state: 'state-1', vp_token: 'opaque-presentation' }),
      (error) => error instanceof VerifierClientError && error.code === 'RESPONSE_ALREADY_SUBMITTED',
    );
    assert.equal(calls, 1);
  }
});

test('ambiguous submission is terminal and never blindly retried', async () => {
  let calls = 0;
  const client = new VerifierClient({
    baseUrl: 'https://verifier.example',
    retry: { retries: 4 },
    fetch: async () => {
      calls += 1;
      throw new Error('connection dropped');
    },
  });
  await assert.rejects(
    client.submitResponse('session-1', 'state=state-1&vp_token=opaque-presentation'),
    (error) => error instanceof VerifierClientError && error.code === 'AMBIGUOUS_RESPONSE' && !error.message.includes('opaque-presentation'),
  );
  assert.equal(calls, 1);
  await assert.rejects(
    client.submitResponse('session-1', 'state=state-1&vp_token=opaque-presentation'),
    (error) => error instanceof VerifierClientError && error.code === 'RESPONSE_ALREADY_SUBMITTED',
  );
});

test('polls a missing receipt and preserves receipt lookup on timeout', async () => {
  let calls = 0;
  const client = new VerifierClient({
    baseUrl: 'https://verifier.example',
    fetch: async () => {
      calls += 1;
      return calls === 1 ? json({ error: { code: 'RECEIPT_NOT_FOUND' } }, 404) : json(receipt());
    },
  });
  const value = await client.pollReceipt('receipt-verified', { intervalMs: 0, timeoutMs: 100 });
  assert.equal(value.result, 'verified');
  assert.equal(calls, 2);

  const timeoutClient = new VerifierClient({
    baseUrl: 'https://verifier.example',
    fetch: async () => json({ error: { code: 'RECEIPT_NOT_FOUND' } }, 404),
  });
  await assert.rejects(
    timeoutClient.pollReceipt('receipt-pending', { intervalMs: 0, timeoutMs: 0 }),
    (error) => error instanceof VerifierClientError && error.code === 'RECEIPT_POLL_TIMEOUT' && error.receiptId === 'receipt-pending',
  );
});
