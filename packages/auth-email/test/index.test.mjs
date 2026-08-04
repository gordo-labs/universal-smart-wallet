import { describe, expect, it } from 'vitest';
import {
  EmailAuthError,
  EmailOtpAuthService,
  MailpitEmailTransport,
  SmtpEmailTransport,
} from '../dist/index.js';

const email = 'alice@example.test';
const setup = (options = {}) => {
  const mailpit = new MailpitEmailTransport();
  const service = new EmailOtpAuthService(mailpit, options);
  return { mailpit, service };
};
const otpFrom = (mailpit, to = email) => {
  const message = mailpit.latest(to);
  expect(message).toBeDefined();
  return /\b([0-9]{6})\b/u.exec(message.text)?.[1];
};
const register = (service, now = 1_000) =>
  service.registerIdentity({
    identityId: 'identity-1',
    principalId: 'principal-1',
    email,
    signerId: 'signer-1',
    policyId: 'policy-1',
    now,
  });

describe('@ssw/auth-email', () => {
  it('hashes random OTPs, expires them, and consumes them once', async () => {
    const { service, mailpit } = setup({ otpTtlSeconds: 60 });
    await register(service);
    const request = await service.requestOtp({ email, now: 1_001 });
    const otp = otpFrom(mailpit);
    expect(otp).toMatch(/^\d{6}$/u);
    const session = await service.verifyOtp({
      challengeId: request.challengeId,
      otp,
      now: 1_002,
    });
    expect(session).toMatchObject({ kind: 'email', requiresStepUp: true });
    await expect(
      service.verifyOtp({ challengeId: request.challengeId, otp, now: 1_003 }),
    ).rejects.toMatchObject({ code: 'OTP_REPLAYED' });
    const expired = await service.requestOtp({ email, now: 1_004 });
    await expect(
      service.verifyOtp({
        challengeId: expired.challengeId,
        otp: otpFrom(mailpit),
        now: 1_065,
      }),
    ).rejects.toMatchObject({ code: 'OTP_EXPIRED' });
  });

  it('does not enumerate accounts and never returns raw email data', async () => {
    const { service, mailpit } = setup();
    await register(service);
    const known = await service.requestOtp({ email, now: 1_000 });
    const unknown = await service.requestOtp({ email: 'nobody@example.test', now: 1_000 });
    expect(known.accepted).toBe(true);
    expect(unknown.accepted).toBe(true);
    expect(Object.keys(known).sort()).toEqual(Object.keys(unknown).sort());
    const verified = await service.verifyOtp({ challengeId: known.challengeId, otp: otpFrom(mailpit), now: 1_001 });
    expect(JSON.stringify(verified).includes(email)).toBe(false);
  });

  it('fails closed on delivery outage and does not mint a session', async () => {
    let deliveredMessage;
    const service = new EmailOtpAuthService({
      send: async (message) => {
        deliveredMessage = message;
        throw new Error('SMTP offline');
      },
    });
    await register(service);
    const request = await service.requestOtp({ email, now: 1_000 });
    await expect(
      service.verifyOtp({ challengeId: request.challengeId, otp: /\b([0-9]{6})\b/u.exec(deliveredMessage.text)[1], now: 1_001 }),
    ).rejects.toMatchObject({ code: 'DELIVERY_FAILED' });
  });

  it('limits requests and attempts without leaking OTP state', async () => {
    const { service, mailpit } = setup({ maxRequests: 2, maxAttempts: 2 });
    await register(service);
    const first = await service.requestOtp({ email, now: 1_000 });
    await service.requestOtp({ email, now: 1_001 });
    const limited = await service.requestOtp({ email, now: 1_002 });
    expect(limited.accepted).toBe(false);
    await expect(
      service.verifyOtp({ challengeId: first.challengeId, otp: '111111', now: 1_003 }),
    ).rejects.toMatchObject({ code: 'INVALID_OTP' });
    await expect(
      service.verifyOtp({ challengeId: first.challengeId, otp: '222222', now: 1_004 }),
    ).rejects.toMatchObject({ code: 'INVALID_OTP' });
    await expect(
      service.verifyOtp({ challengeId: first.challengeId, otp: otpFrom(mailpit), now: 1_005 }),
    ).rejects.toMatchObject({ code: 'OTP_REPLAYED' });
  });

  it('serializes concurrent verification so one OTP mints one session', async () => {
    const { service, mailpit } = setup();
    await register(service);
    const request = await service.requestOtp({ email, now: 1_000 });
    const otp = otpFrom(mailpit);
    const results = await Promise.allSettled([
      service.verifyOtp({ challengeId: request.challengeId, otp, now: 1_001 }),
      service.verifyOtp({ challengeId: request.challengeId, otp, now: 1_001 }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });

  it('supports recovery, revocation and email change with session invalidation', async () => {
    const { service, mailpit } = setup();
    await register(service);
    const login = await service.requestOtp({ email, now: 1_000 });
    const session = await service.verifyOtp({ challengeId: login.challengeId, otp: otpFrom(mailpit), now: 1_001 });
    const change = await service.requestEmailChange({ sessionId: session.sessionId, newEmail: 'new@example.test', now: 1_002 });
    const changed = await service.confirmEmailChange({ sessionId: session.sessionId, challengeId: change.challengeId, otp: otpFrom(mailpit, 'new@example.test'), now: 1_003 });
    expect(changed.subjectHash).toMatch(/^0x[0-9a-f]{64}$/u);
    expect(() => service.requireSession(session.sessionId, 1_004)).toThrow(/email authentication failed/u);
    const recovery = await service.requestRecovery({ email: 'new@example.test', now: 1_005 });
    const recovered = await service.verifyOtp({ challengeId: recovery.challengeId, otp: otpFrom(mailpit, 'new@example.test'), now: 1_006 });
    service.revokeSession(recovered.sessionId);
    expect(() => service.requireSession(recovered.sessionId, 1_007)).toThrow(/email authentication failed/u);
  });

  it('requires passkey/recovery step-up for sensitive operations', async () => {
    const { service, mailpit } = setup();
    await register(service);
    const request = await service.requestOtp({ email, now: 1_000 });
    const session = await service.verifyOtp({ challengeId: request.challengeId, otp: otpFrom(mailpit), now: 1_001 });
    const verifier = { verify: async ({ evidence }) => evidence.method === 'passkey' };
    await expect(service.assertSensitiveOperation({ sessionId: session.sessionId, operation: 'export', verifier, now: 1_002 })).rejects.toMatchObject({ code: 'STEP_UP_REQUIRED' });
    await expect(service.assertSensitiveOperation({ sessionId: session.sessionId, operation: 'export', verifier, now: 1_002, evidence: { method: 'passkey', challengeId: 'c', requestId: 'r', verifiedAt: 1_001, expiresAt: 1_100 } })).resolves.toBeUndefined();
  });

  it('adds a From header in the SMTP adapter and provides a Mailpit fixture', async () => {
    const sent = [];
    const transport = new SmtpEmailTransport({ send: async (message) => sent.push(message) }, { from: 'wallet@example.test' });
    await transport.send({ to: email, subject: 'Code', text: 'synthetic' });
    expect(sent[0].headers.From).toBe('wallet@example.test');
    expect(() => new SmtpEmailTransport({ send: async () => {} }, { from: 'bad' })).toThrowError(EmailAuthError);
  });
});
