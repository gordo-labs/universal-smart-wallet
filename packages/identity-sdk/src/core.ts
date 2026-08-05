import type {
  IdentityErrorBody,
  IdentityHealth,
  IssuerMetadata,
} from './generated.js';

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type RetryPolicy = {
  readonly retries?: number;
  readonly baseDelayMs?: number;
};

export type IdentityClientOptions = {
  readonly baseUrl: string;
  readonly token?: string;
  readonly fetch?: FetchLike;
  readonly timeoutMs?: number;
  readonly retry?: RetryPolicy;
  readonly headers?: Readonly<Record<string, string>>;
};

export type ServerIdentityClientOptions = IdentityClientOptions & {
  readonly apiKey: string;
};

export type RequestOptions = {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  /** Required for retrying a mutating request. */
  readonly idempotencyKey?: string;
  readonly retry?: RetryPolicy;
  /** Per-request headers such as the issuer tenant boundary. */
  readonly headers?: Readonly<Record<string, string>>;
  /** Explicit request authorization, for single-use protocol tokens. */
  readonly authorization?: string;
};

export type IdentitySdkErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID'
  | 'ABORTED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_REQUEST';

export class IdentitySdkError extends Error {
  constructor(
    readonly code: IdentitySdkErrorCode,
    message: string,
    readonly status?: number,
    readonly requestId?: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'IdentitySdkError';
  }
}

const REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/u;

const safeRequestId = (value: unknown): string | undefined =>
  typeof value === 'string' && REQUEST_ID.test(value) ? value : undefined;

const codeForStatus = (status: number): IdentitySdkErrorCode => {
  if (status === 401) return 'AUTH_INVALID';
  if (status === 403) return 'AUTH_REQUIRED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 400 || status === 413 || status === 415)
    return 'INVALID_REQUEST';
  return 'HTTP_ERROR';
};

const messageForStatus = (status: number): string => {
  if (status === 401) return 'Authentication failed';
  if (status === 403) return 'Authorization failed';
  if (status === 404) return 'Resource not found';
  if (status === 409) return 'Request conflicts with current state';
  if (status === 400 || status === 413 || status === 415)
    return 'Request was rejected';
  return 'Identity service request failed';
};

const parseJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new IdentitySdkError(
      'INVALID_RESPONSE',
      'Identity service returned invalid JSON',
      response.status,
    );
  }
};

const wait = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new IdentitySdkError('ABORTED', 'Request aborted'));
      },
      { once: true },
    );
  });

const joinUrl = (baseUrl: string, path: string): string => {
  if (!path.startsWith('/') || path.startsWith('//'))
    throw new IdentitySdkError('INVALID_REQUEST', 'path must be relative');
  return new URL(path, baseUrl).toString();
};

export class IdentityClient {
  private readonly fetcher: FetchLike;

  constructor(protected readonly options: IdentityClientOptions) {
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    if (!/^https?:\/\//u.test(options.baseUrl))
      throw new TypeError('baseUrl must be an absolute http(s) URL');
    if (options.token?.length === 0)
      throw new TypeError('token must not be empty');
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    requestOptions: RequestOptions = {},
  ): Promise<T> {
    if (requestOptions.signal?.aborted)
      throw new IdentitySdkError('ABORTED', 'Request aborted');
    const methodUpper = method.toUpperCase();
    const retry = { ...this.options.retry, ...requestOptions.retry };
    const maxRetries = Math.max(0, retry.retries ?? 0);
    const canRetry =
      methodUpper === 'GET' ||
      methodUpper === 'HEAD' ||
      methodUpper === 'OPTIONS' ||
      Boolean(requestOptions.idempotencyKey);
    let attempt = 0;

    while (true) {
      const controller = new AbortController();
      const timeout =
        requestOptions.timeoutMs ?? this.options.timeoutMs ?? 15_000;
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeout);
      const abort = () => controller.abort();
      requestOptions.signal?.addEventListener('abort', abort, { once: true });
      try {
        const headers: Record<string, string> = {
          accept: 'application/json',
          ...this.options.headers,
          ...requestOptions.headers,
        };
        if (requestOptions.idempotencyKey)
          headers['idempotency-key'] = requestOptions.idempotencyKey;
        if (body !== undefined) {
          headers['content-type'] = 'application/json';
        }
        if (this.options.token)
          headers.authorization = `Bearer ${this.options.token}`;
        if (requestOptions.authorization)
          headers.authorization = requestOptions.authorization;

        const response = await this.fetcher(
          joinUrl(this.options.baseUrl, path),
          {
            method: methodUpper,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: controller.signal,
          },
        );
        const value = await parseJson(response);
        if (!response.ok) {
          const errorBody = value as IdentityErrorBody;
          const requestId = safeRequestId(errorBody.error?.requestId);
          const code = codeForStatus(response.status);
          const retryable = canRetry && response.status >= 500;
          throw new IdentitySdkError(
            code,
            messageForStatus(response.status),
            response.status,
            requestId,
            retryable,
          );
        }
        return value as T;
      } catch (error) {
        if (error instanceof IdentitySdkError) {
          if (timedOut)
            throw new IdentitySdkError('TIMEOUT', 'Request timed out');
          if (error.code === 'ABORTED') throw error;
          if (!error.retryable || !canRetry || attempt >= maxRetries)
            throw error;
        } else {
          if (timedOut)
            throw new IdentitySdkError('TIMEOUT', 'Request timed out');
          if (requestOptions.signal?.aborted)
            throw new IdentitySdkError('ABORTED', 'Request aborted');
          if (!canRetry || attempt >= maxRetries)
            throw new IdentitySdkError(
              'NETWORK_ERROR',
              'Network request failed',
            );
        }
        attempt += 1;
        await wait(
          (retry.baseDelayMs ?? 100) * 2 ** (attempt - 1),
          requestOptions.signal,
        );
      } finally {
        clearTimeout(timer);
        requestOptions.signal?.removeEventListener('abort', abort);
      }
    }
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  health(options?: RequestOptions): Promise<IdentityHealth> {
    return this.get<IdentityHealth>('/v1/health', options);
  }

  issuerMetadata(
    tenantId: string,
    issuerId: string,
    options?: RequestOptions,
  ): Promise<IssuerMetadata> {
    const query = new URLSearchParams({ tenant: tenantId, issuer: issuerId });
    return this.get<IssuerMetadata>(
      `/.well-known/openid-credential-issuer?${query.toString()}`,
      options,
    );
  }
}
