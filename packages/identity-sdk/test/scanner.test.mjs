import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CredentialScannerClient,
  ScannerClientError,
} from '../dist/scanner/index.js';

const request = `openid4vp://?request=${encodeURIComponent('a.b-c_d.e')}`;

test('scanner accepts only bounded presentation scans and delegates response', async () => {
  const calls = [];
  const scanner = new CredentialScannerClient({
    now: () => 123,
    verifier: {
      submitResponse: async (...args) => {
        calls.push(args);
        return {
          schemaVersion: 1,
          receiptId: 'receipt-1',
          sessionId: 'session-1',
          tenantId: 'tenant-1',
          policyId: 'policy-1',
          result: 'verified',
          reasonCode: 'VERIFIED',
          verifiedAt: new Date(0).toISOString(),
          checks: ['signature'],
        };
      },
    },
  });
  const accepted = scanner.accept(request, 'presentation');
  assert.equal(accepted.acceptedAt, 123);
  const value = await scanner.respond(accepted, 'session-1', {
    state: 'state-1',
    vp_token: 'opaque-presentation',
  });
  assert.equal(value.result, 'verified');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'session-1');
  assert.deepEqual(calls[0][1], { state: 'state-1', vp_token: 'opaque-presentation' });
});

test('scanner never sends issuance or offline inputs to verifier', async () => {
  const scanner = new CredentialScannerClient({
    verifier: { submitResponse: async () => { throw new Error('must not call'); } },
  });
  const issuance = `openid-credential-offer:?credential_offer=${encodeURIComponent('{}')}`;
  await assert.rejects(
    Promise.resolve().then(() => scanner.accept(issuance, 'presentation')),
    (error) => error instanceof ScannerClientError && error.code === 'UNEXPECTED_SCAN_KIND',
  );
  assert.equal(scanner.classify('not-a-credential-uri').accepted, false);
});

test('scanner requires an explicit verifier and does not expose raw input in errors', async () => {
  const scanner = new CredentialScannerClient();
  const accepted = scanner.accept(request, 'presentation');
  await assert.rejects(
    scanner.respond(accepted, 'session-1', { state: 'state-1', vp_token: 'secret-presentation' }),
    (error) => error instanceof ScannerClientError && error.code === 'VERIFIER_NOT_CONFIGURED' && !error.message.includes('secret-presentation'),
  );
});
