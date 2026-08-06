import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTHORIZATION_CODE_GRANT,
  InstitutionalIssuerService,
  IssuerServiceError,
} from '../dist/index.js';
import { IssuerSignerError } from '@ssw/issuer-signer';

const PRE_AUTHORIZED = 'urn:ietf:params:oauth:grant-type:pre-authorized_code';
const digest = `sha256:${'a'.repeat(64)}`;
const tenant = 'tenant-a';
const issuerId = 'issuer-a';
const templateId = 'employee-card';
const keyRef = 'synthetic-issuer-key-v1';
const allScopes = [
  'templates:write',
  'issuers:write',
  'reviewer-policies:write',
  'issuance:write',
  'issuance:review',
  'issuance:read',
  'offers:write',
  'oid4vci:authorize',
  'credentials:read',
  'credentials:status',
];

const actor = (
  principalId = 'operator-a',
  tenantId = tenant,
  scopes = allScopes,
) => ({
  tenantId,
  principalId,
  scopes,
});

const template = {
  schemaVersion: 1,
  tenantId: tenant,
  templateId,
  version: 1,
  type: 'EmployeeCredential',
  assurance: 'institutional',
  formats: ['sd-jwt-vc'],
  claims: [
    {
      name: 'employee_id',
      type: 'string',
      required: true,
      selectivelyDisclosable: true,
    },
    {
      name: 'is_active',
      type: 'boolean',
      required: true,
      selectivelyDisclosable: true,
    },
  ],
  status: 'published',
};

const issuer = {
  schemaVersion: 1,
  tenantId: tenant,
  issuerId,
  issuerUri: 'https://issuer.example',
  assurance: 'institutional',
  keyRef,
  authorizedTemplateIds: [templateId],
};

const policy = {
  schemaVersion: 1,
  tenantId: tenant,
  policyId: 'review-policy-a',
  templateId,
  requiredApprovals: 2,
  authorizedReviewerIds: ['reviewer-a', 'reviewer-b'],
};

const request = (sessionId, expiresAt, extra = {}) => ({
  sessionId,
  issuerId,
  templateId,
  templateVersion: 1,
  format: 'sd-jwt-vc',
  reviewerPolicyId: policy.policyId,
  claims: { employee_id: 'synthetic-001', is_active: true },
  subjectBinding: {
    schemaVersion: 1,
    bindingId: `binding-${sessionId}`,
    method: 'jwk-thumbprint',
    value: 'synthetic-jwk-thumbprint',
  },
  evidence: [
    {
      evidenceId: `evidence-${sessionId}`,
      kind: 'synthetic-record-check',
      digest,
      source: 'synthetic-fixture',
    },
  ],
  expiresAt,
  ...extra,
});

const setup = ({ trust = 'verified', keyStatus = 'active', issue } = {}) => {
  let now = 1_000_000;
  let sequence = 0;
  const statusEvents = [];
  const signer = {
    async describeKey(ref) {
      assert.equal(ref, keyRef);
      return {
        keyRef: ref,
        algorithm: 'ES256',
        status: keyStatus,
        version: 'v1',
      };
    },
    sign: async () => assert.fail('format adapter owns signer invocation'),
    rotate: async () => assert.fail('not used'),
    disable: async () => assert.fail('not used'),
  };
  const formatPort = {
    async issue(input) {
      if (issue) return issue(input);
      assert.equal(input.signer, signer);
      return {
        artifact: {
          format: 'sd-jwt-vc',
          profile: 'draft-ietf-oauth-sd-jwt-vc-16',
          version: '16',
          mediaType: 'application/dc+sd-jwt',
          kind: 'credential',
          value: 'synthetic~credential~value',
        },
        signing: {
          requestId: input.requestId,
          keyRef: input.keyRef,
          algorithm: input.algorithm,
          keyVersion: 'v1',
        },
      };
    },
  };
  const service = new InstitutionalIssuerService({
    signer,
    trustRegistry: {
      evaluateTrust: async () => ({
        decision: trust,
        code: trust === 'verified' ? 'TRUST_VERIFIED' : 'ISSUER_UNKNOWN',
      }),
    },
    formatPorts: { 'sd-jwt-vc': formatPort },
    proofVerifier: { verify: async ({ proof }) => proof === 'valid-proof' },
    statusPublisher: {
      async publish(event) {
        statusEvents.push(event);
      },
    },
    jurisdiction: 'eu-test',
    clock: () => now,
    randomToken: () => `synthetic-token-${String(++sequence).padStart(8, '0')}`,
  });
  const operator = actor();
  service.registerTemplate(operator, template);
  service.registerIssuer(operator, issuer);
  service.registerReviewerPolicy(operator, policy);
  return {
    service,
    now: () => now,
    advance: (milliseconds) => {
      now += milliseconds;
    },
    statusEvents,
  };
};

const approve = (service, sessionId) => {
  service.reviewIssuance(actor('reviewer-a'), sessionId, {
    decision: 'approved',
  });
  return service.reviewIssuance(actor('reviewer-b'), sessionId, {
    decision: 'approved',
  });
};

const preAuthorizedToken = async (service, sessionId, expiresAt) => {
  service.createIssuanceRequest(actor(), request(sessionId, expiresAt));
  approve(service, sessionId);
  const offer = await service.createOffer(actor(), sessionId, {
    flow: 'pre-authorized_code',
    ttlMs: 60_000,
  });
  const code = offer.grants[PRE_AUTHORIZED]['pre-authorized_code'];
  return service.exchangeToken(tenant, {
    grant_type: PRE_AUTHORIZED,
    'pre-authorized_code': code,
  });
};

test('pre-authorized issue, reissue, suspend, and revoke lifecycle uses reviewed evidence references', async () => {
  const { service, now, statusEvents } = setup();
  const token = await preAuthorizedToken(
    service,
    'session-preauth',
    now() + 300_000,
  );
  const issued = await service.issueCredential(tenant, token.access_token, {
    credential_configuration_id: `${templateId}.v1.sd-jwt-vc`,
    proof: { proof_type: 'jwt', jwt: 'valid-proof' },
  });
  assert.equal(issued.credential, 'synthetic~credential~value');
  assert.equal(service.getSession(actor(), 'session-preauth').state, 'issued');
  assert.equal(
    'claims' in service.getSession(actor(), 'session-preauth'),
    false,
  );

  const suspended = await service.suspendCredential(
    actor(),
    issued.credential_id,
  );
  assert.equal(suspended.status, 'suspended');
  const revoked = await service.revokeCredential(actor(), issued.credential_id);
  assert.equal(revoked.status, 'revoked');

  const reissueRequest = request('session-reissue', now() + 300_000, {
    replacesCredentialId: issued.credential_id,
  });
  const reissue = service.createIssuanceRequest(actor(), reissueRequest);
  assert.equal(reissue.kind, 'reissue');
  assert.equal(reissue.replacesCredentialId, issued.credential_id);
  assert.deepEqual(
    statusEvents.map((event) => event.status),
    ['valid', 'suspended', 'revoked'],
  );
});

test('authorization-code flow binds client and redirect and every grant is single use', async () => {
  const { service, now } = setup();
  service.createIssuanceRequest(
    actor(),
    request('session-auth', now() + 300_000),
  );
  approve(service, 'session-auth');
  const offer = await service.createOffer(actor(), 'session-auth', {
    flow: AUTHORIZATION_CODE_GRANT,
    ttlMs: 60_000,
    clientId: 'wallet-client',
    redirectUri: 'https://wallet.example/callback',
  });
  const issuerState = offer.grants.authorization_code.issuer_state;
  const authorized = service.authorize(actor(), tenant, {
    issuer_state: issuerState,
    client_id: 'wallet-client',
    redirect_uri: 'https://wallet.example/callback',
    state: 'wallet-state',
  });
  assert.equal(authorized.state, 'wallet-state');
  assert.throws(
    () =>
      service.authorize(actor(), tenant, {
        issuer_state: issuerState,
        client_id: 'wallet-client',
        redirect_uri: 'https://wallet.example/callback',
        state: 'wallet-state',
      }),
    (error) =>
      error instanceof IssuerServiceError && error.code === 'INVALID_GRANT',
  );
  const token = service.exchangeToken(tenant, {
    grant_type: AUTHORIZATION_CODE_GRANT,
    code: authorized.code,
    client_id: 'wallet-client',
    redirect_uri: 'https://wallet.example/callback',
  });
  assert.equal(token.token_type, 'Bearer');
  assert.throws(
    () =>
      service.exchangeToken(tenant, {
        grant_type: AUTHORIZATION_CODE_GRANT,
        code: authorized.code,
        client_id: 'wallet-client',
        redirect_uri: 'https://wallet.example/callback',
      }),
    (error) =>
      error instanceof IssuerServiceError && error.code === 'INVALID_GRANT',
  );
});

test('OID4VCI negative: tenant escape, expiry, grant replay, and access-token replay fail closed', async () => {
  const { service, now, advance } = setup();
  service.createIssuanceRequest(
    actor(),
    request('session-negative', now() + 300_000),
  );
  approve(service, 'session-negative');
  const offer = await service.createOffer(actor(), 'session-negative', {
    flow: 'pre-authorized_code',
    ttlMs: 1_000,
  });
  const code = offer.grants[PRE_AUTHORIZED]['pre-authorized_code'];
  assert.throws(
    () =>
      service.exchangeToken('tenant-b', {
        grant_type: PRE_AUTHORIZED,
        'pre-authorized_code': code,
      }),
    (error) =>
      error instanceof IssuerServiceError && error.code === 'TENANT_MISMATCH',
  );
  advance(1_001);
  assert.throws(
    () =>
      service.exchangeToken(tenant, {
        grant_type: PRE_AUTHORIZED,
        'pre-authorized_code': code,
      }),
    (error) =>
      error instanceof IssuerServiceError && error.code === 'EXPIRED_GRANT',
  );

  const token = await preAuthorizedToken(
    service,
    'session-replay',
    now() + 300_000,
  );
  await service.issueCredential(tenant, token.access_token, {
    credential_configuration_id: `${templateId}.v1.sd-jwt-vc`,
    proof: { proof_type: 'jwt', jwt: 'valid-proof' },
  });
  await assert.rejects(
    () =>
      service.issueCredential(tenant, token.access_token, {
        credential_configuration_id: `${templateId}.v1.sd-jwt-vc`,
        proof: { proof_type: 'jwt', jwt: 'valid-proof' },
      }),
    (error) =>
      error instanceof IssuerServiceError &&
      error.code === 'ACCESS_TOKEN_REPLAY',
  );
  assert.throws(
    () => service.getSession(actor('operator-b', 'tenant-b'), 'session-replay'),
    (error) =>
      error instanceof IssuerServiceError && error.code === 'SESSION_NOT_FOUND',
  );
});

test('issuance requires reviewer policy, active authorized key, and registry trust', async () => {
  const unreviewed = setup();
  unreviewed.service.createIssuanceRequest(
    actor(),
    request('session-unreviewed', unreviewed.now() + 300_000),
  );
  unreviewed.service.reviewIssuance(actor('reviewer-a'), 'session-unreviewed', {
    decision: 'approved',
  });
  await assert.rejects(
    () =>
      unreviewed.service.createOffer(actor(), 'session-unreviewed', {
        flow: 'pre-authorized_code',
      }),
    (error) =>
      error instanceof IssuerServiceError &&
      error.code === 'SESSION_NOT_APPROVED',
  );

  for (const [options, expected] of [
    [{ keyStatus: 'disabled' }, 'KEY_NOT_AUTHORIZED'],
    [{ trust: 'rejected' }, 'TRUST_NOT_AUTHORIZED'],
  ]) {
    const current = setup(options);
    current.service.createIssuanceRequest(
      actor(),
      request(`session-${expected}`, current.now() + 300_000),
    );
    approve(current.service, `session-${expected}`);
    await assert.rejects(
      () =>
        current.service.createOffer(actor(), `session-${expected}`, {
          flow: 'pre-authorized_code',
        }),
      (error) => error instanceof IssuerServiceError && error.code === expected,
    );
  }
});

test('ambiguous signing blocks issuance and records a terminal reconciliation state', async () => {
  const current = setup({
    issue: async () => {
      throw new IssuerSignerError('SIGNING_RESULT_AMBIGUOUS');
    },
  });
  const token = await preAuthorizedToken(
    current.service,
    'session-ambiguous',
    current.now() + 300_000,
  );
  await assert.rejects(
    () =>
      current.service.issueCredential(tenant, token.access_token, {
        credential_configuration_id: `${templateId}.v1.sd-jwt-vc`,
        proof: { proof_type: 'jwt', jwt: 'valid-proof' },
      }),
    (error) =>
      error instanceof IssuerServiceError &&
      error.code === 'SIGNING_RESULT_AMBIGUOUS',
  );
  assert.equal(
    current.service.getSession(actor(), 'session-ambiguous').state,
    'signing_ambiguous',
  );
});
