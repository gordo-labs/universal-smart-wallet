import { describe, expect, it } from 'vitest';
import {
  CLOCK_SKEW_MS,
  InMemoryReplayStore,
  createChallenge,
  decodeChallenge,
  encodeChallenge,
  verifyChallenge,
} from '../dist/index.js';

const random = { randomBytes: (length) => Uint8Array.from({ length }, (_, i) => i + 1) };
const clock = { now: () => 1_000_000 };

describe('challenge and replay domain', () => {
  it('creates >=128-bit challenges and round-trips safe encoding', () => {
    const challenge = createChallenge('verifier.example', { random, clock, ttlMs: 1_000 });
    expect(challenge.value.length).toBeGreaterThanOrEqual(22);
    expect(decodeChallenge(encodeChallenge(challenge))).toEqual(challenge);
  });

  it('consumes a challenge once, including concurrent-style reuse', () => {
    const challenge = createChallenge('aud', { random, clock });
    const store = new InMemoryReplayStore();
    store.issue(challenge);
    expect(verifyChallenge(store, { value: challenge.value, audience: 'aud', now: clock.now() }, challenge)).toEqual({ ok: true, challenge });
    expect(verifyChallenge(store, { value: challenge.value, audience: 'aud', now: clock.now() }, challenge)).toEqual({ ok: false, code: 'CHALLENGE_REUSED' });
  });

  it('distinguishes unknown, wrong audience, and expiry', () => {
    const unknown = createChallenge('aud', { random, clock });
    const store = new InMemoryReplayStore();
    store.issue(unknown);
    expect(store.consume({ value: 'not-known', audience: 'aud', now: clock.now() })).toBe('CHALLENGE_UNKNOWN');
    const wrong = createChallenge('aud', { random: { randomBytes: (n) => Uint8Array.from({ length: n }, (_, i) => i + 2) }, clock, ttlMs: 1_000 });
    store.issue(wrong);
    expect(store.consume({ value: wrong.value, audience: 'other', now: clock.now() })).toBe('CHALLENGE_WRONG_AUDIENCE');
    const expired = createChallenge('aud', { random: { randomBytes: (n) => Uint8Array.from({ length: n }, (_, i) => i + 3) }, clock, ttlMs: 1_000 });
    store.issue(expired);
    expect(store.consume({ value: expired.value, audience: 'aud', now: expired.expiresAt + CLOCK_SKEW_MS + 1 })).toBe('CHALLENGE_EXPIRED');
  });

  it('fails closed when the replay store throws', () => {
    const challenge = createChallenge('aud', { random, clock });
    const broken = { consume() { throw new Error('backend unavailable'); }, issue() {} };
    expect(verifyChallenge(broken, { value: challenge.value, audience: 'aud' }, challenge)).toEqual({ ok: false, code: 'REPLAY_STORE_FAILURE' });
  });
});
