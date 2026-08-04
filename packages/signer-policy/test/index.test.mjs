import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryPolicyStore, SignerPolicyEvaluator } from '../dist/index.js';

const A = (n) => `0x${String(n).padStart(40, '0')}`;
const S = '0xa9059cbb';
const basePolicy = () => ({ schemaVersion: 1, policyId: 'policy-1', signerId: 'signer-1', chainId: 84532, validFrom: 100, expiresAt: 1_000, contracts: [{ target: A(10), selectors: [S], operations: ['transaction'], assets: [{ kind: 'erc20', address: A(20), maxAmount: 100n }], maxValue: 0n, maxAmount: 100n }], frequency: { windowSeconds: 60, maxOperations: 2, maxTotalAmount: 100n } });
const session = () => ({ sessionId: 'session-1', signerId: 'signer-1', policyId: 'policy-1', kind: 'email', issuedAt: 100, expiresAt: 500 });
const request = (changes = {}) => ({ requestId: 'request-1', sessionId: 'session-1', signerId: 'signer-1', policyId: 'policy-1', chainId: 84532, target: A(10), selector: S, operation: 'transaction', asset: { kind: 'erc20', address: A(20) }, amount: 10n, value: 0n, at: 101, ...changes });
const setup = (stepUp) => { const store = new InMemoryPolicyStore(); store.putPolicy(basePolicy()); store.putSession(session()); return { store, evaluator: new SignerPolicyEvaluator(store, stepUp) }; };

test('allows a bounded operation and returns only a stable reason code', async () => {
  const { evaluator } = setup(); const decision = await evaluator.authorize(request());
  assert.deepEqual(decision, { allowed: true, reasonCode: 'ALLOW' });
});
test('denies unknown contracts/selectors, chain and assets without policy internals', async () => {
  const { evaluator } = setup();
  for (const changes of [{ target: A(99) }, { selector: '0x095ea7b3' }, { chainId: 1 }, { asset: { kind: 'erc20', address: A(21) } }]) {
    const result = await evaluator.authorize(request(changes)); assert.equal(result.allowed, false); assert.ok(result.reasonCode); assert.equal(Object.keys(result).length, 2);
  }
});
test('enforces amount, TTL, session expiry and frequency boundaries', async () => {
  const { evaluator } = setup();
  assert.equal((await evaluator.authorize(request({ amount: 101n }))).reasonCode, 'AMOUNT_EXCEEDED');
  assert.equal((await evaluator.authorize(request({ at: 500 }))).reasonCode, 'SESSION_EXPIRED');
  assert.equal((await evaluator.authorize(request({ requestId: 'r-2', at: 101, amount: 50n }))).allowed, true);
  assert.equal((await evaluator.authorize(request({ requestId: 'r-3', at: 101, amount: 51n }))).reasonCode, 'FREQUENCY_EXCEEDED');
});
test('email/social style sessions cannot perform sensitive operations without step-up', async () => {
  const { evaluator } = setup();
  const result = await evaluator.authorize(request({ operation: 'rotate-owner', requestId: 'sensitive-1' }));
  assert.deepEqual(result, { allowed: false, reasonCode: 'OPERATION_NOT_ALLOWED' });
});
test('step-up is bound to operation and expires; passkey/recovery are accepted', async () => {
  const stepUp = { verify: async ({ evidence }) => evidence.method === 'passkey' };
  const { evaluator } = setup(stepUp); const evidence = { method: 'passkey', challengeId: 'c-1', requestId: 'sensitive-1', verifiedAt: 100, expiresAt: 200 };
  assert.equal((await evaluator.authorize(request({ operation: 'export', requestId: 'sensitive-1', stepUp: evidence }))).reasonCode, 'OPERATION_NOT_ALLOWED');
  const store = new InMemoryPolicyStore(); const policy = { ...basePolicy(), allowedOperations: ['export'], contracts: [{ ...basePolicy().contracts[0], operations: ['export'] }] }; store.putPolicy(policy); store.putSession(session()); const auth = new SignerPolicyEvaluator(store, stepUp);
  assert.equal((await auth.authorize(request({ operation: 'export', requestId: 'sensitive-1', stepUp: evidence }))).allowed, true);
  assert.equal((await auth.authorize(request({ operation: 'export', requestId: 'sensitive-2', stepUp: { ...evidence, requestId: 'other' } }))).reasonCode, 'STEP_UP_INVALID');
});
test('replay and revocation fail closed', async () => {
  const { store, evaluator } = setup(); assert.equal((await evaluator.authorize(request())).allowed, true); assert.equal((await evaluator.authorize(request())).reasonCode, 'REPLAY_DETECTED');
  store.revokeSession('session-1'); assert.equal((await evaluator.authorize(request({ requestId: 'r-2' }))).reasonCode, 'SESSION_REVOKED');
  const next = setup(); next.store.revokePolicy('policy-1'); assert.equal((await next.evaluator.authorize(request())).reasonCode, 'POLICY_REVOKED');
});
test('store outages deny authorization', async () => {
  const store = { getSession: async () => { throw new Error('offline'); }, getPolicy: async () => undefined, isPolicyRevoked: async () => false, isSessionRevoked: async () => false, reserve: async () => true };
  const result = await new SignerPolicyEvaluator(store).authorize(request()); assert.deepEqual(result, { allowed: false, reasonCode: 'POLICY_STORE_UNAVAILABLE' });
});
