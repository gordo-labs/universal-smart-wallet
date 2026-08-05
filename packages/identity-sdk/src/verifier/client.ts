import { IdentityClient, IdentitySdkError } from '../core.js';
import type {
  ServerIdentityClientOptions,
  RequestOptions,
  IdentityClientOptions,
} from '../core.js';
import type {
  ReceiptPollingOptions,
  ServerVerifierClientOptions,
  VerificationOutcome,
  VerificationReceipt,
  VerificationResponse,
  VerificationSession,
  VerifierClientErrorCode,
  VerifierClientOptions,
  VerifierRequestOptions,
} from './types.js';
import { VerifierClientError } from './types.js';

export type { IdentityClientOptions, ServerIdentityClientOptions };

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const CLAIM_FREE_KEYS = new Set([
  'schemaVersion',
  'receiptId',
  'sessionId',
  'tenantId',
  'policyId',
  'result',
  'reasonCode',
  'verifiedAt',
  'checks',
  'snapshotId',
  'snapshotExpiresAt',
]);

const invalid = (message = 'Verifier request is invalid'): never =>
  fail('INVALID_REQUEST', message);

const fail = (
  code: VerifierClientErrorCode,
  message = 'Verifier operation failed',
  receiptId?: string,
): never => {
  throw new VerifierClientError(code, message, receiptId);
};

const encoded = (value: string, name: string): string => {
  if (typeof value !== 'string' || !ID.test(value))
    invalid(`${name} is invalid`);
  return encodeURIComponent(value);
};

const requestOptions = (options: VerifierRequestOptions = {}): RequestOptions => ({
  signal: options.signal,
  timeoutMs: options.timeoutMs,
  idempotencyKey: options.idempotencyKey,
  retry: options.retry,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const boundedString = (
  value: unknown,
  name: string,
  max = 512,
): string => {
  if (typeof value !== 'string' || value.length === 0 || value.length > max)
    throw new VerifierClientError('INVALID_RESPONSE', `Invalid ${name}`);
  return value;
};

const outcome = (value: unknown): VerificationOutcome => {
  if (value === 'verified' || value === 'rejected' || value === 'indeterminate')
    return value;
  throw new VerifierClientError('INVALID_RESPONSE', 'Invalid verification result');
};

/**
 * Pick only the receipt contract. In particular, a misconfigured service that
 * includes `claims`, `disclosures`, or a presentation is not allowed to expose
 * those values through the SDK.
 */
const parseReceipt = (value: unknown): VerificationReceipt => {
  if (!isRecord(value) || value.schemaVersion !== 1)
    throw new VerifierClientError('INVALID_RESPONSE', 'Invalid verifier receipt');
  const receiptId = boundedString(value.receiptId, 'receiptId', 128);
  const parsed: VerificationReceipt = {
    schemaVersion: 1,
    receiptId,
    sessionId: boundedString(value.sessionId, 'sessionId', 128),
    tenantId: boundedString(value.tenantId, 'tenantId', 128),
    policyId: boundedString(value.policyId, 'policyId', 128),
    result: outcome(value.result),
    reasonCode: boundedString(value.reasonCode, 'reasonCode', 128),
    verifiedAt: boundedString(value.verifiedAt, 'verifiedAt', 128),
    checks: parseChecks(value.checks),
    ...(value.snapshotId === undefined
      ? {}
      : { snapshotId: boundedString(value.snapshotId, 'snapshotId', 256) }),
    ...(value.snapshotExpiresAt === undefined
      ? {}
      : {
          snapshotExpiresAt: parseSafeInteger(
            value.snapshotExpiresAt,
            'snapshotExpiresAt',
          ),
        }),
  };
  // Keep the whitelist visible in the implementation so additions to this
  // public type cannot accidentally start returning disclosed values.
  for (const key of Object.keys(value)) {
    if (key === 'claims' || key === 'disclosures' || key === 'presentation')
      continue;
    if (!CLAIM_FREE_KEYS.has(key)) continue;
  }
  return Object.freeze(parsed);
};

const parseChecks = (value: unknown): readonly string[] => {
  if (
    !Array.isArray(value) ||
    value.length > 64 ||
    value.some((item) => typeof item !== 'string' || item.length === 0 || item.length > 128)
  )
    throw new VerifierClientError('INVALID_RESPONSE', 'Invalid verifier checks');
  return Object.freeze([...value] as string[]);
};

const parseSafeInteger = (value: unknown, name: string): number => {
  if (!Number.isSafeInteger(value))
    throw new VerifierClientError('INVALID_RESPONSE', `Invalid ${name}`);
  return value as number;
};

const parseRequest = (value: unknown): Readonly<Record<string, unknown>> => {
  if (!isRecord(value))
    throw new VerifierClientError('INVALID_RESPONSE', 'Invalid verifier request');
  // A request is metadata and a DCQL query; it is never accepted as a
  // presentation. Bound its serialized size before exposing it to callers.
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new VerifierClientError('INVALID_RESPONSE', 'Invalid verifier request');
  }
  if (serialized.length > 32_768)
    throw new VerifierClientError('INVALID_RESPONSE', 'Verifier request is too large');
  return Object.freeze({ ...value });
};

const parseSession = (value: unknown): VerificationSession => {
  if (!isRecord(value) || value.schemaVersion !== 1)
    throw new VerifierClientError('INVALID_RESPONSE', 'Invalid verifier session');
  const status = value.status;
  if (status !== 'requested' && status !== 'consumed' && status !== 'expired')
    throw new VerifierClientError('INVALID_RESPONSE', 'Invalid verifier session status');
  const session: VerificationSession = {
    schemaVersion: 1,
    sessionId: boundedString(value.sessionId, 'sessionId', 128),
    tenantId: boundedString(value.tenantId, 'tenantId', 128),
    policyId: boundedString(value.policyId, 'policyId', 128),
    nonce: boundedString(value.nonce, 'nonce', 256),
    state: boundedString(value.state, 'state', 256),
    status,
    createdAt: boundedString(value.createdAt, 'createdAt', 128),
    expiresAt: boundedString(value.expiresAt, 'expiresAt', 128),
    request: parseRequest(value.request),
    ...(value.receipt === undefined ? {} : { receipt: parseReceipt(value.receipt) }),
  };
  return Object.freeze(session);
};

const formValue = (value: unknown, name: string, max: number): string => {
  if (typeof value !== 'string' || value.length === 0 || value.length > max)
    invalid(`${name} is invalid`);
  return value as string;
};

const toDirectPostForm = (value: VerificationResponse): URLSearchParams => {
  const form = new URLSearchParams();
  if (typeof value === 'string') {
    try {
      const parsed = new URLSearchParams(value);
      for (const [key, item] of parsed.entries()) form.append(key, item);
    } catch {
      invalid('response form is invalid');
    }
  } else if (value instanceof URLSearchParams) {
    for (const [key, item] of value.entries()) form.append(key, item);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (typeof item !== 'string') invalid('response form is invalid');
      form.append(key, item);
    }
  } else invalid('response form is invalid');

  const keys = new Set<string>();
  for (const key of form.keys()) {
    if (key !== 'state' && key !== 'vp_token') invalid('response field is not allowed');
    if (keys.has(key)) invalid('response field is duplicated');
    keys.add(key);
  }
  formValue(form.get('state'), 'state', 256);
  formValue(form.get('vp_token'), 'vp_token', 32_768);
  if (form.toString().length > 32_768) invalid('response form is too large');
  return form;
};

const wait = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new VerifierClientError('ABORTED', 'Request aborted'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new VerifierClientError('ABORTED', 'Request aborted'));
      },
      { once: true },
    );
  });

export class VerifierClient extends IdentityClient {
  private readonly clock: () => number;
  private readonly submitted = new Set<string>();

  constructor(options: VerifierClientOptions) {
    super(options);
    this.clock = options.now ?? (() => Date.now());
  }

  createSession(
    policyId: string,
    options: VerifierRequestOptions = {},
  ): Promise<VerificationSession> {
    encoded(policyId, 'policyId');
    return this.post<unknown>(
      '/v1/verification-sessions',
      { policyId },
      requestOptions(options),
    ).then(parseSession);
  }

  createVerificationSession(
    policyId: string,
    options: VerifierRequestOptions = {},
  ): Promise<VerificationSession> {
    return this.createSession(policyId, options);
  }

  getSession(
    sessionId: string,
    options: VerifierRequestOptions = {},
  ): Promise<VerificationSession> {
    return this.get<unknown>(
      `/v1/verification-sessions/${encoded(sessionId, 'sessionId')}`,
      requestOptions(options),
    ).then(parseSession);
  }

  getVerificationSession(
    sessionId: string,
    options: VerifierRequestOptions = {},
  ): Promise<VerificationSession> {
    return this.getSession(sessionId, options);
  }

  /**
   * Submit exactly once per client instance. The service consumes the state
   * before verification, so ambiguous transport failures are terminal locally;
   * callers should use getSession/pollReceipt instead of resubmitting.
   */
  async submitResponse(
    sessionId: string,
    response: VerificationResponse,
    options: VerifierRequestOptions = {},
  ): Promise<VerificationReceipt> {
    const pathId = encoded(sessionId, 'sessionId');
    if (this.submitted.has(sessionId))
      fail('RESPONSE_ALREADY_SUBMITTED', 'Response submission is terminal');
    const form = toDirectPostForm(response);
    this.submitted.add(sessionId);
    try {
      const result = await this.postForm<unknown>(
        `/v1/verification-sessions/${pathId}/responses`,
        form,
        {
          ...requestOptions(options),
          // direct_post state is single-use; never auto-retry or resubmit it.
          retry: { retries: 0 },
        },
      );
      return parseReceipt(result);
    } catch (error) {
      if (error instanceof IdentitySdkError &&
          (error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR')) {
        throw new VerifierClientError(
          'AMBIGUOUS_RESPONSE',
          'Response status is unknown; query the receipt or session',
          undefined,
          { cause: error },
        );
      }
      throw error;
    }
  }

  submitPresentation(
    sessionId: string,
    response: VerificationResponse,
    options: VerifierRequestOptions = {},
  ): Promise<VerificationReceipt> {
    return this.submitResponse(sessionId, response, options);
  }

  getReceipt(
    receiptId: string,
    options: VerifierRequestOptions = {},
  ): Promise<VerificationReceipt> {
    return this.get<unknown>(
      `/v1/receipts/${encoded(receiptId, 'receiptId')}`,
      requestOptions(options),
    ).then(parseReceipt);
  }

  getVerificationReceipt(
    receiptId: string,
    options: VerifierRequestOptions = {},
  ): Promise<VerificationReceipt> {
    return this.getReceipt(receiptId, options);
  }

  async pollReceipt(
    receiptId: string,
    options: ReceiptPollingOptions = {},
  ): Promise<VerificationReceipt> {
    encoded(receiptId, 'receiptId');
    const timeoutMs = options.timeoutMs ?? 5_000;
    const intervalMs = options.intervalMs ?? 100;
    if (
      !Number.isFinite(timeoutMs) ||
      timeoutMs < 0 ||
      timeoutMs > 120_000 ||
      !Number.isFinite(intervalMs) ||
      intervalMs < 0 ||
      intervalMs > 60_000
    )
      invalid('polling bounds are invalid');
    const deadline = this.clock() + timeoutMs;
    while (true) {
      if (options.signal?.aborted) fail('ABORTED', 'Request aborted');
      try {
        return await this.getReceipt(receiptId, { signal: options.signal });
      } catch (error) {
        if (!(error instanceof IdentitySdkError) || error.code !== 'NOT_FOUND')
          throw error;
      }
      const remaining = deadline - this.clock();
      if (remaining <= 0)
        fail(
          'RECEIPT_POLL_TIMEOUT',
          'Receipt is not available; lookup remains possible',
          receiptId,
        );
      await wait(Math.min(intervalMs, remaining), options.signal);
    }
  }

  pollVerificationReceipt(
    receiptId: string,
    options: ReceiptPollingOptions = {},
  ): Promise<VerificationReceipt> {
    return this.pollReceipt(receiptId, options);
  }
}

export const createBrowserVerifierClient = (
  options: VerifierClientOptions,
): VerifierClient => new VerifierClient(options);

export const createServerVerifierClient = (
  options: ServerVerifierClientOptions,
): VerifierClient =>
  new VerifierClient({
    ...options,
    headers: {
      ...options.headers,
      authorization: `ApiKey ${options.apiKey}`,
    },
  });
