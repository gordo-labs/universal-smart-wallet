import test from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryInstitutionalSignerStore,
  InMemoryInstitutionalTemplateStore,
} from '../dist/lib/institutional-issuer-admin.js';

const owner = { tenantId: 'uni-a', principalId: 'owner-1', role: 'institutional-owner' };
const editor = { tenantId: 'uni-a', principalId: 'editor-1', role: 'template-editor' };
const reviewer = { tenantId: 'uni-a', principalId: 'reviewer-1', role: 'template-reviewer' };
const viewer = { tenantId: 'uni-a', principalId: 'viewer-1', role: 'institutional-viewer' };

const input = {
  templateId: 'enrollment-card',
  version: 1,
  type: 'UniversityEnrollmentCredential',
  assurance: 'institutional',
  formats: ['sd-jwt-vc'],
  claims: [
    { name: 'student_id', type: 'string', required: true, selectivelyDisclosable: true },
    { name: 'active', type: 'boolean', required: true, selectivelyDisclosable: false },
  ],
};

test('template lifecycle is tenant scoped and published payload is immutable', () => {
  const store = new InMemoryInstitutionalTemplateStore();
  const draft = store.createDraft(editor, 'uni-a', input, 100);
  assert.equal(draft.status, 'draft');
  assert.throws(() => store.updateDraft(viewer, 'uni-a', input.templateId, 1, { type: 'Changed' }), (error) => error.code === 'FORBIDDEN');
  const review = store.submitForReview(editor, 'uni-a', input.templateId, 1, 110);
  assert.equal(review.status, 'in_review');
  const approved = store.review(reviewer, 'uni-a', input.templateId, 1, { decision: 'approved' }, 120);
  const published = store.publish(reviewer, 'uni-a', input.templateId, 1, 130);
  assert.equal(approved.status, 'approved');
  assert.equal(published.status, 'published');
  assert.throws(() => store.updateDraft(owner, 'uni-a', input.templateId, 1, { type: 'Mutated' }), (error) => error.code === 'IMMUTABLE_TEMPLATE');
  assert.throws(() => store.review(reviewer, 'uni-a', input.templateId, 1, { decision: 'approved' }), (error) => error.code === 'INVALID_STATE');
  assert.equal(store.get(viewer, 'uni-a', input.templateId, 1).type, input.type);
});

test('tenant isolation applies to reads and mutations', () => {
  const store = new InMemoryInstitutionalTemplateStore();
  store.createDraft(owner, 'uni-a', input, 100);
  const foreign = { tenantId: 'uni-b', principalId: 'owner-b', role: 'institutional-owner' };
  assert.throws(() => store.get(foreign, 'uni-a', input.templateId, 1), (error) => error.code === 'TENANT_MISMATCH');
  store.createDraft(foreign, 'uni-b', input, 100);
  assert.equal(store.list(owner, 'uni-a').length, 1);
  assert.equal(store.list(foreign, 'uni-b').length, 1);
});

test('signer configuration exposes opaque metadata and rejects secrets', () => {
  const store = new InMemoryInstitutionalSignerStore();
  const config = store.register(owner, 'uni-a', {
    signerId: 'primary',
    provider: 'aws-kms',
    keyRef: 'arn:aws:kms:eu-west-1:123456789012:key/opaque-ref',
    algorithm: 'ES256',
    keyVersion: 'v1',
  }, 100);
  assert.equal(config.status, 'standby');
  assert.equal(Object.prototype.hasOwnProperty.call(config, 'secret'), false);
  assert.throws(() => store.register(owner, 'uni-a', {
    signerId: 'bad-secret', provider: 'network-hsm', keyRef: 'private-key-material', algorithm: 'ES256', keyVersion: 'v1',
  }), (error) => error.code === 'SECRET_UNAVAILABLE');
  assert.throws(() => store.register(owner, 'uni-a', {
    signerId: 'bad-pem', provider: 'network-hsm', keyRef: '-----BEGIN PRIVATE KEY-----', algorithm: 'ES256', keyVersion: 'v1',
  }), (error) => error.code === 'SECRET_UNAVAILABLE');
  assert.equal(store.setStatus(owner, 'uni-a', 'primary', 'active', 120).status, 'active');
  assert.throws(() => store.get(viewer, 'uni-b', 'primary'), (error) => error.code === 'TENANT_MISMATCH');
});

test('signer RBAC prevents template roles from changing key configuration', () => {
  const store = new InMemoryInstitutionalSignerStore();
  assert.throws(() => store.register(editor, 'uni-a', {
    signerId: 'primary', provider: 'network-hsm', keyRef: 'hsm://tenant-a/key-1', algorithm: 'EdDSA', keyVersion: 'v1',
  }), (error) => error.code === 'FORBIDDEN');
  assert.throws(() => store.register({ ...owner, scopes: ['issuer:signers:read'] }, 'uni-a', {
    signerId: 'primary', provider: 'network-hsm', keyRef: 'hsm://tenant-a/key-1', algorithm: 'EdDSA', keyVersion: 'v1',
  }), (error) => error.code === 'FORBIDDEN');
});
