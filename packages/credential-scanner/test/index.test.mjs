import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CredentialScannerError,
  InMemoryReplayTokenBoundary,
  classifyCredentialInput,
  classifyUriScheme,
  parseCredentialInput,
} from '../dist/index.js';

const offer = encodeURIComponent(
  JSON.stringify({
    credential_issuer: 'https://issuer.example',
    credential_configuration_ids: ['UniversityDegree'],
  }),
);
const jwt = 'eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJpc3N1ZXIifQ.signature';
const envelope = 'A'.repeat(22);

test('classifies bounded issuance, presentation, and offline inputs', () => {
  assert.equal(
    parseCredentialInput(`openid-credential-offer://?credential_offer=${offer}`)
      .kind,
    'issuance',
  );
  assert.equal(
    parseCredentialInput(`openid4vp://?request=${jwt}`).kind,
    'presentation',
  );
  assert.equal(
    parseCredentialInput(`ssw-offline://v1/${envelope}`).kind,
    'offline',
  );
  assert.equal(classifyUriScheme('javascript:alert(1)'), 'unknown');
});

test('remote URI forms require an explicit trust allow-list and never navigate', () => {
  assert.throws(
    () =>
      parseCredentialInput(
        'openid4vp://?request_uri=https%3A%2F%2Fverifier.example%2Fr',
      ),
    (error) =>
      error instanceof CredentialScannerError &&
      error.code === 'UNTRUSTED_REQUEST_URI',
  );
  const parsed = parseCredentialInput(
    'openid4vp://?request_uri=https%3A%2F%2Fverifier.example%2Fr',
    { allowRequestUri: (url) => url.origin === 'https://verifier.example' },
  );
  assert.equal(parsed.kind, 'presentation');
  assert.equal(parsed.requiresExternalTrust, true);
});

test('malformed, duplicate, oversized, phishing, and ambiguous inputs fail closed', () => {
  const rejected = [
    'openid4vp://?request=a&request=b',
    'openid4vp://evil.example?request=' + jwt,
    'openid4vp://?request=not-a-jwt',
    'openid-credential-offer://?credential_offer=%7B%22x%22%3A1%2C%22x%22%3A2%7D',
    `ssw-offline://v1/${'!'.repeat(22)}`,
    'unknown-scheme://payload',
  ];
  for (const input of rejected)
    assert.equal(classifyCredentialInput(input).accepted, false, input);
  assert.equal(classifyCredentialInput('x'.repeat(16_385)).accepted, false);
});

test('offline replay boundary is one-time and expiry-aware', () => {
  const replay = new InMemoryReplayTokenBoundary();
  replay.issue(envelope, 100);
  assert.equal(
    parseCredentialInput(`ssw-offline://v1/${envelope}`, { replay, now: 99 })
      .kind,
    'offline',
  );
  assert.throws(
    () =>
      parseCredentialInput(`ssw-offline://v1/${envelope}`, { replay, now: 99 }),
    (error) =>
      error instanceof CredentialScannerError &&
      error.code === 'REPLAY_TOKEN_REUSED',
  );
  replay.issue(envelope, 100);
  assert.throws(
    () =>
      parseCredentialInput(`ssw-offline://v1/${envelope}`, {
        replay,
        now: 100,
      }),
    (error) =>
      error instanceof CredentialScannerError &&
      error.code === 'REPLAY_TOKEN_REUSED',
  );
});

test('camera cancellation/fuzz-style arbitrary values are side-effect free and bounded', () => {
  const values = [
    undefined,
    null,
    {},
    0,
    '\u0000',
    ' ',
    'https://evil.example',
    '\uD800',
  ];
  for (const value of values) {
    const result = classifyCredentialInput(value);
    assert.equal(result.accepted, false);
  }
  for (let i = 0; i < 200; i += 1) {
    const random = Array.from({ length: i % 64 }, (_, j) =>
      String.fromCharCode((i * 31 + j) % 128),
    ).join('');
    const result = classifyCredentialInput(random);
    assert.equal(typeof result.accepted, 'boolean');
  }
});
