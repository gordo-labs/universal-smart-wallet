import { describe, expect, it } from 'vitest';
import {
  CLOCK_SKEW_MS,
  InMemoryReplayStore,
  createChallenge,
  decodeChallenge,
  encodeChallenge,
  verifyChallenge,
  evaluateIssuerTrust,
  StatusCache,
} from '../dist/index.js';

const random = {
  randomBytes: (length) => Uint8Array.from({ length }, (_, i) => i + 1),
};
const clock = { now: () => 1_000_000 };

describe('challenge and replay domain', () => {
  it('creates >=128-bit challenges and round-trips safe encoding', () => {
    const challenge = createChallenge('verifier.example', {
      random,
      clock,
      ttlMs: 1_000,
    });
    expect(challenge.value.length).toBeGreaterThanOrEqual(22);
    expect(decodeChallenge(encodeChallenge(challenge))).toEqual(challenge);
  });

  it('consumes a challenge once, including concurrent-style reuse', () => {
    const challenge = createChallenge('aud', { random, clock });
    const store = new InMemoryReplayStore();
    store.issue(challenge);
    expect(
      verifyChallenge(
        store,
        { value: challenge.value, audience: 'aud', now: clock.now() },
        challenge,
      ),
    ).toEqual({ ok: true, challenge });
    expect(
      verifyChallenge(
        store,
        { value: challenge.value, audience: 'aud', now: clock.now() },
        challenge,
      ),
    ).toEqual({ ok: false, code: 'CHALLENGE_REUSED' });
  });

  it('distinguishes unknown, wrong audience, and expiry', () => {
    const unknown = createChallenge('aud', { random, clock });
    const store = new InMemoryReplayStore();
    store.issue(unknown);
    expect(
      store.consume({ value: 'not-known', audience: 'aud', now: clock.now() }),
    ).toBe('CHALLENGE_UNKNOWN');
    const wrong = createChallenge('aud', {
      random: {
        randomBytes: (n) => Uint8Array.from({ length: n }, (_, i) => i + 2),
      },
      clock,
      ttlMs: 1_000,
    });
    store.issue(wrong);
    expect(
      store.consume({
        value: wrong.value,
        audience: 'other',
        now: clock.now(),
      }),
    ).toBe('CHALLENGE_WRONG_AUDIENCE');
    const expired = createChallenge('aud', {
      random: {
        randomBytes: (n) => Uint8Array.from({ length: n }, (_, i) => i + 3),
      },
      clock,
      ttlMs: 1_000,
    });
    store.issue(expired);
    expect(
      store.consume({
        value: expired.value,
        audience: 'aud',
        now: expired.expiresAt + CLOCK_SKEW_MS + 1,
      }),
    ).toBe('CHALLENGE_EXPIRED');
  });

  it('fails closed when the replay store throws', () => {
    const challenge = createChallenge('aud', { random, clock });
    const broken = {
      consume() {
        throw new Error('backend unavailable');
      },
      issue() {},
    };
    expect(
      verifyChallenge(
        broken,
        { value: challenge.value, audience: 'aud' },
        challenge,
      ),
    ).toEqual({ ok: false, code: 'REPLAY_STORE_FAILURE' });
  });
});

describe('issuer trust and status cache', () => {
  const bundle = {
    version: 1,
    generatedAt: 0,
    expiresAt: 10_000,
    issuers: [{ issuer: 'https://issuer.example', keyIds: ['k1'] }],
  };
  it('accepts pinned keys and rejects unknown or rotated keys', () => {
    expect(
      evaluateIssuerTrust(bundle, 'https://issuer.example', 'k1', {
        now: () => 1_000,
      }).ok,
    ).toBe(true);
    expect(
      evaluateIssuerTrust(bundle, 'https://issuer.example', 'rotated', {
        now: () => 1_000,
      }).code,
    ).toBe('untrusted_key');
    expect(
      evaluateIssuerTrust(bundle, 'https://other.example', 'k1', {
        now: () => 1_000,
      }).code,
    ).toBe('unknown_issuer');
  });
  it('fails closed for revoked/suspended, stale, unavailable, and SSRF responses', async () => {
    let now = 1_000;
    const transport = async (url) => {
      if (now > 1_100) throw new Error('offline');
      if (url.endsWith('/revoked'))
        return {
          status: 200,
          body: JSON.stringify({ status: 'revoked', expiresAt: now + 100 }),
        };
      if (url.endsWith('/suspended'))
        return {
          status: 200,
          body: JSON.stringify({ status: 'suspended', expiresAt: now + 100 }),
        };
      throw new Error('offline');
    };
    const cache = new StatusCache(transport, { clock: () => now });
    expect((await cache.lookup('https://issuer.example/revoked')).code).toBe(
      'revoked',
    );
    expect((await cache.lookup('https://issuer.example/suspended')).code).toBe(
      'suspended',
    );
    expect(
      (await cache.lookup('https://issuer.example/unavailable')).code,
    ).toBe('unavailable');
    expect((await cache.lookup('http://127.0.0.1/status')).code).toBe(
      'ssrf_blocked',
    );
    now = 2_000;
    expect((await cache.lookup('https://issuer.example/revoked')).code).toBe(
      'stale',
    );
  });

  it('rejects expired or malformed status responses instead of caching them as valid', async () => {
    let calls = 0;
    const cache = new StatusCache(
      async () => {
        calls += 1;
        return {
          status: 200,
          body: JSON.stringify({ status: 'valid', expiresAt: 999 }),
        };
      },
      { clock: () => 1_000 },
    );
    expect((await cache.lookup('https://issuer.example/expired')).code).toBe(
      'invalid_response',
    );
    expect((await cache.lookup('https://issuer.example/expired')).code).toBe(
      'invalid_response',
    );
    expect(calls).toBe(2);
    const malformed = new StatusCache(
      async () => ({
        status: 200,
        body: JSON.stringify({ status: 'valid', expiresAt: 'never' }),
      }),
      { clock: () => 1_000 },
    );
    expect(
      (await malformed.lookup('https://issuer.example/malformed')).code,
    ).toBe('invalid_response');
  });

  it('blocks cloud metadata, carrier NAT, and credential-bearing status URLs', async () => {
    const transport = async () => {
      throw new Error('must not be called');
    };
    const cache = new StatusCache(transport);
    for (const url of [
      'http://169.254.169.254/latest/meta-data',
      'http://100.100.100.100/status',
      'https://user:password@issuer.example/status',
    ]) {
      expect((await cache.lookup(url)).code).toBe('ssrf_blocked');
    }
  });
});
