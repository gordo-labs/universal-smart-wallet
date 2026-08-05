import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IssuerLifecycleController,
  IssuerLifecycleError,
  authorizeIssuerAdmin,
} from '../dist/issuer/lifecycle.js';

const reviewer = {
  tenantId: 'uni-a',
  principalId: 'reviewer-1',
  role: 'issuer-reviewer',
};
const operator = {
  tenantId: 'uni-a',
  principalId: 'operator-1',
  role: 'issuer-operator',
  reauthenticated: true,
};
const input = (sessionId) => ({
  sessionId,
  issuerId: 'issuer-a',
  templateId: 'enrollment-card',
  templateVersion: 1,
  format: 'sd-jwt-vc',
  reviewerPolicyId: 'two-person',
  claims: { student_id: 'synthetic' },
  subjectBinding: {
    schemaVersion: 1,
    bindingId: `binding-${sessionId}`,
    method: 'jwk-thumbprint',
    value: 'write-only-test-value',
  },
  evidence: [{
    evidenceId: `evidence-${sessionId}`,
    kind: 'enrollment-proof',
    digest: `sha256:${'a'.repeat(64)}`,
    source: 'synthetic://fixture',
  }],
  expiresAt: Date.now() + 60_000,
});

function fakeApi() {
  const sessions = new Map();
  const calls = [];
  return {
    calls,
    async createIssuanceRequest(tenantId, request, options) {
      calls.push(['create', tenantId, options.idempotencyKey]);
      if (request.sessionId === 'bad-row') throw new Error('provider secret=must-redact');
      const session = {
        schemaVersion: 1, tenantId, sessionId: request.sessionId, kind: 'issue',
        issuerId: request.issuerId, templateId: request.templateId,
        templateVersion: request.templateVersion, format: request.format,
        reviewerPolicyId: request.reviewerPolicyId, state: 'pending_review',
        evidence: request.evidence, reviews: [], expiresAt: request.expiresAt,
      };
      sessions.set(request.sessionId, session);
      return session;
    },
    async getIssuanceSession(tenantId, sessionId) {
      const session = sessions.get(sessionId);
      if (!session || session.tenantId !== tenantId) throw new Error('not found');
      return session;
    },
    async reviewIssuance(tenantId, sessionId, review, options) {
      calls.push(['review', tenantId, options.idempotencyKey]);
      const session = sessions.get(sessionId);
      session.reviews = [...session.reviews, { reviewerId: reviewer.principalId, decision: review.decision }];
      session.state = review.decision === 'approved' ? 'approved' : 'rejected';
      return session;
    },
    async createOffer(tenantId, sessionId, _input, options) {
      calls.push(['offer', tenantId, options.idempotencyKey]);
      return { credential_issuer: 'https://issuer.example', expires_in: 300 };
    },
    async getCredential() { return { status: 'valid' }; },
    async reissueCredential(tenantId, credentialId, _request, options) {
      calls.push(['reissue', tenantId, credentialId, options.idempotencyKey]);
      return { ...sessions.values().next().value, sessionId: 'reissue-1', kind: 'reissue', replacesCredentialId: credentialId };
    },
    async suspendCredential(tenantId, credentialId, options) {
      calls.push(['suspend', tenantId, credentialId, options.idempotencyKey]);
      return { schemaVersion: 1, tenantId, credentialId, status: 'suspended' };
    },
    async revokeCredential(tenantId, credentialId, options) {
      calls.push(['revoke', tenantId, credentialId, options.idempotencyKey]);
      return { schemaVersion: 1, tenantId, credentialId, status: 'revoked' };
    },
  };
}

test('review queue and two-person separation are enforced', async () => {
  const api = fakeApi();
  const controller = new IssuerLifecycleController(api);
  await controller.bulkCreate(operator, [input('session-1')], 'bulk-key-1');
  const queue = await controller.reviewQueue(reviewer, ['session-1']);
  assert.equal(queue.length, 1);
  await controller.review(reviewer, 'session-1', 'approved', 'review-key-1');
  await assert.rejects(
    controller.issueApproved({ ...reviewer, role: 'issuer-operator' }, 'session-1', 'offer-key-1'),
    (error) => error instanceof IssuerLifecycleError && error.code === 'ROLE_SEPARATION',
  );
  const offer = await controller.issueApproved(operator, 'session-1', 'offer-key-1');
  assert.equal(offer.credential_issuer, 'https://issuer.example');
});

test('bulk rows have independent outcomes and derived idempotency keys', async () => {
  const api = fakeApi();
  const controller = new IssuerLifecycleController(api);
  const result = await controller.bulkCreate(operator, [input('good-row'), input('bad-row'), input('good-row-2')], 'bulk-key-2');
  assert.deepEqual(result.map((row) => row.status), ['fulfilled', 'rejected', 'fulfilled']);
  assert.deepEqual(api.calls.filter((call) => call[0] === 'create').map((call) => call[2]), ['bulk-key-2:0', 'bulk-key-2:1', 'bulk-key-2:2']);
  assert.equal(result[1].error.message, 'Issuer service request failed');
});

test('dangerous lifecycle actions require step-up and explicit confirmation', async () => {
  const api = fakeApi();
  const controller = new IssuerLifecycleController(api);
  await assert.rejects(
    controller.suspend({ ...operator, reauthenticated: false }, 'credential-1', { reauthenticated: true, confirmed: true }, 'suspend-key-1'),
    (error) => error.code === 'STEP_UP_REQUIRED',
  );
  await assert.rejects(
    controller.suspend(operator, 'credential-1', { reauthenticated: true, confirmed: false }, 'suspend-key-2'),
    (error) => error.code === 'CONFIRMATION_REQUIRED',
  );
  const suspended = await controller.suspend(operator, 'credential-1', { reauthenticated: true, confirmed: true }, 'suspend-key-3');
  assert.equal(suspended.status, 'suspended');
  const revoked = await controller.revoke(operator, 'credential-1', { reauthenticated: true, confirmed: true }, 'revoke-key-1');
  assert.equal(revoked.status, 'revoked');
});

test('tenant and role boundaries fail closed', () => {
  assert.throws(
    () => authorizeIssuerAdmin({ tenantId: 'uni-b', principalId: 'viewer-1', role: 'issuer-viewer' }, 'issuer:review:read', 'uni-a'),
    (error) => error.code === 'TENANT_MISMATCH',
  );
  assert.throws(
    () => authorizeIssuerAdmin({ tenantId: 'uni-a', principalId: 'viewer-1', role: 'issuer-viewer' }, 'issuer:review:write', 'uni-a'),
    (error) => error.code === 'FORBIDDEN',
  );
});
