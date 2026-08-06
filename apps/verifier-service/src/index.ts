import {
  CredentialVerifierService,
  VerifierServiceError,
} from '@ssw/verifier-service';

export type VerifierHttpApiOptions = {
  readonly service: CredentialVerifierService;
  readonly maxBodyBytes?: number;
};

const json = (value: unknown, status = 200): Response =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });

export class VerifierHttpApi {
  private readonly maxBodyBytes: number;

  constructor(private readonly options: VerifierHttpApiOptions) {
    this.maxBodyBytes = options.maxBodyBytes ?? 32_768;
  }

  async handle(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/v1/health')
        return json({ ok: true, version: 'v1' });
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] !== 'v1') return this.error(404, 'NOT_FOUND');

      if (
        request.method === 'POST' &&
        parts.length === 2 &&
        parts[1] === 'verification-sessions'
      ) {
        const body = await this.readJson(request, ['policyId']);
        if (typeof body.policyId !== 'string')
          return this.error(400, 'POLICY_ID_REQUIRED');
        const session = this.options.service.createSession(body.policyId);
        return json(session, 201);
      }

      if (
        request.method === 'GET' &&
        parts.length === 3 &&
        parts[1] === 'verification-sessions'
      ) {
        const session = this.options.service.getSession(parts[2]!);
        return session ? json(session) : this.error(404, 'SESSION_NOT_FOUND');
      }

      if (
        request.method === 'POST' &&
        parts.length === 4 &&
        parts[1] === 'verification-sessions' &&
        parts[3] === 'responses'
      ) {
        const contentType = request.headers.get('content-type') ?? '';
        if (
          !contentType
            .toLowerCase()
            .startsWith('application/x-www-form-urlencoded')
        )
          return this.error(415, 'CONTENT_TYPE_UNSUPPORTED');
        const body = await this.readText(request);
        return json(await this.options.service.verifyResponse(parts[2]!, body));
      }

      if (
        request.method === 'GET' &&
        parts.length === 3 &&
        parts[1] === 'receipts'
      ) {
        const receipt = this.options.service.getReceipt(parts[2]!);
        return receipt ? json(receipt) : this.error(404, 'RECEIPT_NOT_FOUND');
      }
      return this.error(404, 'NOT_FOUND');
    } catch (error) {
      if (error instanceof HttpError)
        return this.error(error.status, error.code);
      if (error instanceof VerifierServiceError) {
        const status = error.code.endsWith('_NOT_FOUND') ? 404 : 400;
        return this.error(status, error.code);
      }
      return this.error(500, 'INTERNAL_ERROR');
    }
  }

  private async readText(request: Request): Promise<string> {
    const length = Number(request.headers.get('content-length') ?? 0);
    if (!Number.isFinite(length) || length > this.maxBodyBytes)
      throw new HttpError(413, 'BODY_TOO_LARGE');
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > this.maxBodyBytes)
      throw new HttpError(413, 'BODY_TOO_LARGE');
    return text;
  }

  private async readJson(
    request: Request,
    allowed: readonly string[],
  ): Promise<Record<string, unknown>> {
    let value: unknown;
    try {
      value = JSON.parse(await this.readText(request));
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, 'INVALID_JSON');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new HttpError(400, 'INVALID_BODY');
    for (const key of Object.keys(value))
      if (!allowed.includes(key)) throw new HttpError(400, 'UNKNOWN_FIELD');
    return value as Record<string, unknown>;
  }

  private error(status: number, code: string): Response {
    return json({ error: { code } }, status);
  }
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}
