/**
 * Provider-neutral email authentication for self-hosted wallet services.
 *
 * Email possession creates a short-lived, revocable operational session. It
 * never becomes a Safe owner and it never returns an email address in a
 * wallet locator, identity record, session, audit event, or on-chain payload.
 */

export const EMAIL_AUTH_SCHEMA_VERSION = 1 as const;
export const DEFAULT_OTP_TTL_SECONDS = 300;
export const DEFAULT_SESSION_TTL_SECONDS = 900;
export const DEFAULT_MAX_ATTEMPTS = 5;
export const DEFAULT_MAX_REQUESTS = 3;
export const DEFAULT_RATE_WINDOW_SECONDS = 900;

export type OtpPurpose = 'login' | 'recovery' | 'email-change';
export type SensitiveOperation =
  | 'rotate-owner'
  | 'export'
  | 'migrate'
  | 'install-module';

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface EmailTransportPort {
  send(message: EmailMessage): Promise<void>;
}

/** A small boundary around any SMTP implementation (nodemailer, smtp-client, etc.). */
export interface SmtpClientPort {
  send(message: EmailMessage): Promise<void>;
}

export interface SmtpEmailTransportOptions {
  readonly from: string;
  readonly subject?: string;
}

/**
 * SMTP remains replaceable: the package does not bundle a hosted provider or
 * a network client. Inject a reviewed SMTP client in production and use the
 * Mailpit fixture below in local development.
 */
export class SmtpEmailTransport implements EmailTransportPort {
  private readonly subject: string;

  constructor(
    private readonly client: SmtpClientPort,
    private readonly options: SmtpEmailTransportOptions,
  ) {
    if (!isEmail(options.from))
      throw new EmailAuthError('INVALID_CONFIGURATION', 'SMTP sender is invalid');
    this.subject = options.subject ?? 'Your wallet verification code';
  }

  send(message: EmailMessage): Promise<void> {
    if (!isEmail(message.to))
      return Promise.reject(
        new EmailAuthError('INVALID_EMAIL', 'recipient is invalid'),
      );
    return this.client.send({
      ...message,
      subject: message.subject || this.subject,
      headers: { ...message.headers, From: this.options.from },
    });
  }
}

export function createSmtpTransport(
  client: SmtpClientPort,
  options: SmtpEmailTransportOptions,
): EmailTransportPort {
  return new SmtpEmailTransport(client, options);
}

/** In-memory Mailpit-compatible fixture. It intentionally exposes messages only to tests. */
export class MailpitEmailTransport implements EmailTransportPort {
  readonly messages: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    if (!isEmail(message.to))
      throw new EmailAuthError('INVALID_EMAIL', 'recipient is invalid');
    this.messages.push(structuredClone(message));
  }

  latest(to?: string): EmailMessage | undefined {
    return [...this.messages]
      .reverse()
      .find((message) => to === undefined || message.to === to);
  }

  clear(): void {
    this.messages.length = 0;
  }
}

export type EmailAuthErrorCode =
  | 'INVALID_EMAIL'
  | 'INVALID_OTP'
  | 'CHALLENGE_NOT_FOUND'
  | 'OTP_EXPIRED'
  | 'OTP_REPLAYED'
  | 'OTP_ATTEMPTS_EXCEEDED'
  | 'RATE_LIMITED'
  | 'DELIVERY_FAILED'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_REVOKED'
  | 'SESSION_EXPIRED'
  | 'STEP_UP_REQUIRED'
  | 'STEP_UP_INVALID'
  | 'IDENTITY_NOT_FOUND'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'INVALID_CONFIGURATION';

export class EmailAuthError extends Error {
  constructor(readonly code: EmailAuthErrorCode, message = 'email authentication failed') {
    super(message);
    this.name = 'EmailAuthError';
  }
}

export interface EmailIdentity {
  readonly identityId: string;
  readonly principalId: string;
  readonly subjectHash: `0x${string}`;
  readonly signerId: string;
  readonly policyId: string;
  readonly createdAt: number;
  readonly changedAt: number;
}

export interface EmailSession {
  readonly sessionId: string;
  readonly principalId: string;
  readonly signerId: string;
  readonly policyId: string;
  readonly kind: 'email';
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly requiresStepUp: true;
}

export interface OtpRequest {
  readonly email: string;
  readonly purpose?: OtpPurpose;
  readonly now?: number;
  readonly rateLimitKey?: string;
}

export interface OtpRequestResult {
  /** Deliberately does not reveal whether the email is registered. */
  readonly accepted: boolean;
  readonly challengeId: string;
  readonly expiresAt: number;
}

export interface OtpVerification {
  readonly challengeId: string;
  readonly otp: string;
  readonly now?: number;
}

export interface StepUpEvidence {
  readonly method: 'passkey' | 'recovery';
  readonly challengeId: string;
  readonly requestId: string;
  readonly verifiedAt: number;
  readonly expiresAt: number;
}

export interface StepUpVerifierPort {
  verify(input: {
    readonly session: EmailSession;
    readonly operation: SensitiveOperation;
    readonly evidence: StepUpEvidence;
  }): Promise<boolean>;
}

interface IdentityRecord extends EmailIdentity {
  readonly normalizedEmail: string;
}

interface ChallengeRecord {
  readonly challengeId: string;
  readonly purpose: OtpPurpose;
  readonly subjectHash: `0x${string}`;
  targetSubjectHash?: `0x${string}`;
  principalId?: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly otpHash: string;
  readonly salt: string;
  readonly rateLimitKey: string;
  attempts: number;
  verifying: boolean;
  consumed: boolean;
  delivered: boolean;
}

interface RateRecord {
  windowStart: number;
  requests: number;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const OTP = /^[0-9]{6}$/u;
const isEmail = (value: string): boolean =>
  value.length <= 320 && EMAIL.test(value);
const normalizeEmail = (value: string): string => {
  if (typeof value !== 'string' || !isEmail(value.trim()))
    throw new EmailAuthError('INVALID_EMAIL', 'email is invalid');
  return value.trim().toLowerCase();
};
const bytesToHex = (bytes: Uint8Array): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const randomHex = (length: number): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
};
const digest = async (value: string): Promise<string> =>
  bytesToHex(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  );
const subjectHash = async (email: string): Promise<`0x${string}`> =>
  (`0x${await digest(`ssw:email-subject:v1:${email}`)}` as `0x${string}`);
const hashOtp = (otp: string, salt: string): Promise<string> =>
  digest(`ssw:email-otp:v1:${salt}:${otp}`);
const constantTimeEqual = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1)
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
};
const currentSeconds = (): number => Math.floor(Date.now() / 1000);
const boundedNow = (value: number | undefined): number => {
  const now = value ?? currentSeconds();
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('invalid timestamp');
  return now;
};
const randomOtp = (): string => {
  // Rejection sampling avoids modulo bias in the six-digit code.
  const limit = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value);
  while (value[0] >= limit);
  return String(value[0] % 1_000_000).padStart(6, '0');
};

export interface EmailOtpOptions {
  readonly otpTtlSeconds?: number;
  readonly sessionTtlSeconds?: number;
  readonly maxAttempts?: number;
  readonly maxRequests?: number;
  readonly rateWindowSeconds?: number;
  readonly now?: () => number;
  readonly subject?: string;
}

/**
 * Self-hosted email OTP state machine. Identity records retain only a
 * subject hash; the raw delivery address exists only for the send call and is
 * never returned or included in a wallet/chain record.
 */
export class EmailOtpAuthService {
  private readonly identities = new Map<string, IdentityRecord>();
  private readonly subjectIndex = new Map<string, string>();
  private readonly challenges = new Map<string, ChallengeRecord>();
  private readonly sessions = new Map<string, EmailSession>();
  private readonly revokedSessions = new Set<string>();
  private readonly rates = new Map<string, RateRecord>();
  private readonly otpTtlSeconds: number;
  private readonly sessionTtlSeconds: number;
  private readonly maxAttempts: number;
  private readonly maxRequests: number;
  private readonly rateWindowSeconds: number;
  private readonly now: () => number;
  private readonly subject: string;

  constructor(
    private readonly transport: EmailTransportPort,
    options: EmailOtpOptions = {},
  ) {
    this.otpTtlSeconds = positiveOption(options.otpTtlSeconds, DEFAULT_OTP_TTL_SECONDS);
    this.sessionTtlSeconds = positiveOption(options.sessionTtlSeconds, DEFAULT_SESSION_TTL_SECONDS);
    this.maxAttempts = positiveOption(options.maxAttempts, DEFAULT_MAX_ATTEMPTS);
    this.maxRequests = positiveOption(options.maxRequests, DEFAULT_MAX_REQUESTS);
    this.rateWindowSeconds = positiveOption(options.rateWindowSeconds, DEFAULT_RATE_WINDOW_SECONDS);
    this.now = options.now ?? currentSeconds;
    this.subject = options.subject ?? 'Your wallet verification code';
  }

  async registerIdentity(input: {
    readonly identityId: string;
    readonly principalId: string;
    readonly email: string;
    readonly signerId: string;
    readonly policyId: string;
    readonly now?: number;
  }): Promise<EmailIdentity> {
    const normalizedEmail = normalizeEmail(input.email);
    const hash = await subjectHash(normalizedEmail);
    if (this.subjectIndex.has(hash))
      throw new EmailAuthError('EMAIL_ALREADY_REGISTERED');
    const now = boundedNow(input.now ?? this.now());
    const record: IdentityRecord = {
      identityId: boundedId(input.identityId, 'identityId'),
      principalId: boundedId(input.principalId, 'principalId'),
      subjectHash: hash,
      signerId: boundedId(input.signerId, 'signerId'),
      policyId: boundedId(input.policyId, 'policyId'),
      createdAt: now,
      changedAt: now,
      normalizedEmail,
    };
    if (this.identities.has(record.identityId))
      throw new EmailAuthError('EMAIL_ALREADY_REGISTERED');
    this.identities.set(record.identityId, record);
    this.subjectIndex.set(hash, record.identityId);
    return publicIdentity(record);
  }

  async requestOtp(
    input: OtpRequest,
    internal?: { readonly principalId?: string; readonly forceDelivery?: boolean },
  ): Promise<OtpRequestResult> {
    const email = normalizeEmail(input.email);
    const now = boundedNow(input.now ?? this.now());
    const purpose = input.purpose ?? 'login';
    const hash = await subjectHash(email);
    const identity = this.identityForHash(hash);
    const challengeId = `otp_${randomHex(16)}`;
    const expiresAt = now + this.otpTtlSeconds;
    const rateLimitKey = input.rateLimitKey?.slice(0, 128) || hash;
    const allowed = this.consumeRate(rateLimitKey, now);
    const salt = randomHex(16);
    const otp = randomOtp();
    const record: ChallengeRecord = {
      challengeId,
      purpose,
      subjectHash: hash,
      ...(purpose === 'email-change' && (identity || internal?.principalId)
        ? { principalId: identity?.principalId ?? internal?.principalId }
        : {}),
      issuedAt: now,
      expiresAt,
      otpHash: await hashOtp(otp, salt),
      salt,
      rateLimitKey,
      attempts: 0,
      verifying: false,
      consumed: false,
      delivered: false,
    };
    this.challenges.set(challengeId, record);
    // Unknown identities and rate-limited requests intentionally use the same
    // outward shape. A transport failure also leaves `delivered` false.
    if (allowed && (identity || internal?.forceDelivery)) {
      try {
        await this.transport.send({
          to: email,
          subject: this.subject,
          text: `Your verification code is ${otp}. It expires in ${this.otpTtlSeconds} seconds.`,
        });
        record.delivered = true;
      } catch {
        record.delivered = false;
      }
    }
    return { accepted: allowed, challengeId, expiresAt };
  }

  async verifyOtp(input: OtpVerification): Promise<EmailSession> {
    if (!OTP.test(input.otp)) throw new EmailAuthError('INVALID_OTP');
    const now = boundedNow(input.now ?? this.now());
    const record = this.challenges.get(input.challengeId);
    if (!record) throw new EmailAuthError('CHALLENGE_NOT_FOUND');
    if (record.consumed || record.verifying) throw new EmailAuthError('OTP_REPLAYED');
    if (now >= record.expiresAt) {
      record.consumed = true;
      throw new EmailAuthError('OTP_EXPIRED');
    }
    if (record.attempts >= this.maxAttempts) {
      record.consumed = true;
      throw new EmailAuthError('OTP_ATTEMPTS_EXCEEDED');
    }
    record.attempts += 1;
    record.verifying = true;
    const actual = await hashOtp(input.otp, record.salt);
    if (!constantTimeEqual(actual, record.otpHash)) {
      record.verifying = false;
      if (record.attempts >= this.maxAttempts) record.consumed = true;
      throw new EmailAuthError('INVALID_OTP');
    }
    // Consume before any state mutation or await: concurrent verification can
    // never mint two sessions from one code.
    record.consumed = true;
    record.verifying = false;
    if (!record.delivered) throw new EmailAuthError('DELIVERY_FAILED');
    const identity = this.identityForHash(record.subjectHash);
    if (!identity) throw new EmailAuthError('IDENTITY_NOT_FOUND');
    if (record.purpose === 'email-change') {
      throw new EmailAuthError('INVALID_OTP', 'email-change requires its dedicated confirmation flow');
    }
    const session = this.createSession(identity, now);
    return session;
  }

  async requestRecovery(input: Omit<OtpRequest, 'purpose'>): Promise<OtpRequestResult> {
    return this.requestOtp({ ...input, purpose: 'recovery' });
  }

  async requestEmailChange(input: {
    readonly sessionId: string;
    readonly newEmail: string;
    readonly now?: number;
    readonly rateLimitKey?: string;
  }): Promise<OtpRequestResult> {
    const session = this.requireSession(input.sessionId, input.now);
    const email = normalizeEmail(input.newEmail);
    const hash = await subjectHash(email);
    if (this.subjectIndex.has(hash))
      throw new EmailAuthError('EMAIL_ALREADY_REGISTERED');
    const result = await this.requestOtp({
      email,
      purpose: 'email-change',
      now: input.now,
      rateLimitKey: input.rateLimitKey ?? session.principalId,
    }, { principalId: session.principalId, forceDelivery: true });
    const record = this.challenges.get(result.challengeId);
    if (record) {
      record.targetSubjectHash = hash;
      record.principalId = session.principalId;
    }
    return result;
  }

  async confirmEmailChange(input: {
    readonly sessionId: string;
    readonly challengeId: string;
    readonly otp: string;
    readonly now?: number;
  }): Promise<EmailIdentity> {
    const session = this.requireSession(input.sessionId, input.now);
    if (!OTP.test(input.otp)) throw new EmailAuthError('INVALID_OTP');
    const now = boundedNow(input.now ?? this.now());
    const record = this.challenges.get(input.challengeId);
    if (!record || record.purpose !== 'email-change')
      throw new EmailAuthError('CHALLENGE_NOT_FOUND');
    if (record.principalId !== session.principalId || record.consumed || record.verifying)
      throw new EmailAuthError('INVALID_OTP');
    if (now >= record.expiresAt) {
      record.consumed = true;
      throw new EmailAuthError('OTP_EXPIRED');
    }
    record.attempts += 1;
    record.verifying = true;
    const actual = await hashOtp(input.otp, record.salt);
    if (!constantTimeEqual(actual, record.otpHash)) {
      record.verifying = false;
      if (record.attempts >= this.maxAttempts) record.consumed = true;
      throw new EmailAuthError('INVALID_OTP');
    }
    record.consumed = true;
    if (!record.delivered || !record.targetSubjectHash)
      throw new EmailAuthError('DELIVERY_FAILED');
    const identity = [...this.identities.values()].find(
      (candidate) => candidate.principalId === session.principalId,
    );
    if (!identity) throw new EmailAuthError('IDENTITY_NOT_FOUND');
    this.subjectIndex.delete(identity.subjectHash);
    const next: IdentityRecord = {
      ...identity,
      subjectHash: record.targetSubjectHash,
      changedAt: now,
      // The delivery address is intentionally not retained after this call.
      normalizedEmail: '',
    };
    this.identities.set(identity.identityId, next);
    this.subjectIndex.set(next.subjectHash, next.identityId);
    this.revokePrincipalSessions(session.principalId);
    return publicIdentity(next);
  }

  revokeSession(sessionId: string): void {
    if (typeof sessionId === 'string' && sessionId.length > 0)
      this.revokedSessions.add(sessionId);
  }

  revokePrincipalSessions(principalId: string): void {
    for (const session of this.sessions.values())
      if (session.principalId === principalId) this.revokedSessions.add(session.sessionId);
  }

  requireSession(sessionId: string, now?: number): EmailSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new EmailAuthError('SESSION_NOT_FOUND');
    if (this.revokedSessions.has(sessionId)) throw new EmailAuthError('SESSION_REVOKED');
    if (boundedNow(now ?? this.now()) >= session.expiresAt) {
      this.revokedSessions.add(sessionId);
      throw new EmailAuthError('SESSION_EXPIRED');
    }
    return session;
  }

  async assertSensitiveOperation(input: {
    readonly sessionId: string;
    readonly operation: SensitiveOperation;
    readonly evidence?: StepUpEvidence;
    readonly verifier: StepUpVerifierPort;
    readonly now?: number;
  }): Promise<void> {
    const session = this.requireSession(input.sessionId, input.now);
    const evidence = input.evidence;
    const now = boundedNow(input.now ?? this.now());
    if (!evidence || (evidence.method !== 'passkey' && evidence.method !== 'recovery'))
      throw new EmailAuthError('STEP_UP_REQUIRED');
    if (
      evidence.requestId.length === 0 ||
      evidence.expiresAt <= now ||
      evidence.verifiedAt > now ||
      evidence.expiresAt - evidence.verifiedAt > 300
    )
      throw new EmailAuthError('STEP_UP_INVALID');
    if (!(await input.verifier.verify({ session, operation: input.operation, evidence })))
      throw new EmailAuthError('STEP_UP_INVALID');
  }

  private createSession(identity: IdentityRecord, now: number): EmailSession {
    const session: EmailSession = {
      sessionId: `ems_${randomHex(16)}`,
      principalId: identity.principalId,
      signerId: identity.signerId,
      policyId: identity.policyId,
      kind: 'email',
      issuedAt: now,
      expiresAt: now + this.sessionTtlSeconds,
      requiresStepUp: true,
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  private identityForHash(hash: string): IdentityRecord | undefined {
    const id = this.subjectIndex.get(hash);
    return id ? this.identities.get(id) : undefined;
  }

  private consumeRate(key: string, now: number): boolean {
    const previous = this.rates.get(key);
    if (!previous || now - previous.windowStart >= this.rateWindowSeconds) {
      this.rates.set(key, { windowStart: now, requests: 1 });
      return true;
    }
    if (previous.requests >= this.maxRequests) return false;
    previous.requests += 1;
    return true;
  }
}

const publicIdentity = (record: IdentityRecord): EmailIdentity => {
  const { normalizedEmail: _private, ...publicRecord } = record;
  return publicRecord;
};
const boundedId = (value: string, field: string): string => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/u.test(value))
    throw new EmailAuthError('INVALID_CONFIGURATION', `${field} is invalid`);
  return value;
};
const positiveOption = (value: number | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value <= 0 || value > 86_400)
    throw new EmailAuthError('INVALID_CONFIGURATION', 'option must be a positive bounded integer');
  return value;
};
