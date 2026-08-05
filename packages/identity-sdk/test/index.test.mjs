import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createBrowserIdentityClient,
  IdentitySdkError,
  ISSUER_OPENAPI_PATHS,
  VERIFIER_OPENAPI_PATHS,
} from '../dist/browser.js';
import { createServerIdentityClient } from '../dist/server.js';

const response = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

test('format-neutral transport uses typed relative paths and redacts auth errors', async () => {
  const calls = [];
  const client = createBrowserIdentityClient({
    baseUrl: 'https://issuer.example/api',
    token: 'synthetic-token',
    fetch: async (url, init) => {
      calls.push([url, init]);
      return response({ ok: true, version: 'test' });
    },
  });
  assert.deepEqual(await client.health(), { ok: true, version: 'test' });
  assert.equal(calls[0][0], 'https://issuer.example/v1/health');
  assert.equal(calls[0][1].headers.authorization, 'Bearer synthetic-token');

  const rejected = createBrowserIdentityClient({
    baseUrl: 'https://issuer.example',
    fetch: async () =>
      response(
        {
          error: {
            code: 'AUTH_INVALID',
            message: 'secret-value',
            requestId: 'req-1',
          },
        },
        401,
      ),
  });
  await assert.rejects(
    rejected.get('/v1/health'),
    (error) =>
      error instanceof IdentitySdkError &&
      error.code === 'AUTH_INVALID' &&
      error.message === 'Authentication failed' &&
      !error.message.includes('secret-value') &&
      error.requestId === 'req-1',
  );
});

test('timeouts, caller cancellation, and retries are bounded by idempotency', async () => {
  let calls = 0;
  const client = createBrowserIdentityClient({
    baseUrl: 'https://issuer.example',
    timeoutMs: 5,
    retry: { retries: 2, baseDelayMs: 1 },
    fetch: async () => {
      calls += 1;
      return response({ error: { message: 'server detail' } }, 503);
    },
  });
  await assert.rejects(
    client.post('/v1/templates', { schemaVersion: 1 }),
    (error) => error instanceof IdentitySdkError && error.code === 'HTTP_ERROR',
  );
  assert.equal(calls, 1, 'non-idempotent POST must not retry without a key');
  await assert.rejects(
    client.get('/v1/health'),
    (error) => error instanceof IdentitySdkError && error.code === 'HTTP_ERROR',
  );
  assert.equal(calls, 4, 'GET may retry according to policy');

  const slow = createBrowserIdentityClient({
    baseUrl: 'https://issuer.example',
    timeoutMs: 5,
    fetch: async (_url, init) =>
      new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () =>
          reject(new Error('aborted')),
        );
        void resolve;
      }),
  });
  await assert.rejects(
    slow.get('/v1/health'),
    (error) => error instanceof IdentitySdkError && error.code === 'TIMEOUT',
  );

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    client.get('/v1/health', { signal: controller.signal }),
    (error) => error instanceof IdentitySdkError && error.code === 'ABORTED',
  );
});

test('server entrypoint owns API key and browser entrypoint does not export it', async () => {
  const server = createServerIdentityClient({
    baseUrl: 'https://issuer.example',
    apiKey: 'synthetic-key',
    fetch: async (_url, init) => {
      assert.equal(init.headers.authorization, 'ApiKey synthetic-key');
      return response({ ok: true, version: 'server' });
    },
  });
  assert.equal((await server.health()).version, 'server');
  const browser = await import('../dist/browser.js');
  assert.equal(Object.hasOwn(browser, 'createServerIdentityClient'), false);
});

test('generated path sets stay in lockstep with issuer and verifier OpenAPI contracts', async () => {
  for (const [file, generated] of [
    ['apps/issuer-service/openapi.json', ISSUER_OPENAPI_PATHS],
    ['apps/verifier-service/openapi.json', VERIFIER_OPENAPI_PATHS],
  ]) {
    const schema = JSON.parse(
      await readFile(new URL(`../../../${file}`, import.meta.url), 'utf8'),
    );
    assert.equal(schema.openapi, '3.1.0');
    assert.deepEqual(Object.keys(schema.paths).sort(), [...generated].sort());
  }
});
