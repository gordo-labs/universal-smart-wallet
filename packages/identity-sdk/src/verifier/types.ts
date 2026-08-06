import type {
  IdentityClientOptions,
  RequestOptions,
  RetryPolicy,
  ServerIdentityClientOptions,
} from '../core.js';

export type VerificationOutcome = 'verified' | 'rejected' | 'indeterminate';

export type VerificationStatus = 'requested' | 'consumed' | 'expired';

/** A privacy-minimal verifier receipt. It intentionally has no claim field. */
export type VerificationReceipt = {
  readonly schemaVersion: 1;
  readonly receiptId: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly policyId: string;
  readonly result: VerificationOutcome;
  readonly reasonCode: string;
  readonly verifiedAt: string;
  readonly checks: readonly string[];
  readonly snapshotId?: string;
  readonly snapshotExpiresAt?: number;
};

export type VerificationSession = {
  readonly schemaVersion: 1;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly policyId: string;
  readonly nonce: string;
  readonly state: string;
  readonly status: VerificationStatus;
  readonly createdAt: string;
  readonly expiresAt: string;
  /** The OpenID4VP request is opaque to the SDK and contains no presentation. */
  readonly request: Readonly<Record<string, unknown>>;
  readonly receipt?: VerificationReceipt;
};

export type VerifierRequestOptions = RequestOptions;

export type VerifierClientOptions = IdentityClientOptions & {
  /** Injectable clock for deterministic receipt polling tests. */
  readonly now?: () => number;
};

export type ServerVerifierClientOptions = ServerIdentityClientOptions & {
  readonly now?: () => number;
};

export type VerificationResponse =
  | string
  | URLSearchParams
  | Readonly<Record<string, string>>;

export type ReceiptPollingOptions = {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly intervalMs?: number;
};

export type VerifierClientErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'RESPONSE_ALREADY_SUBMITTED'
  | 'AMBIGUOUS_RESPONSE'
  | 'SESSION_TERMINAL'
  | 'RECEIPT_POLL_TIMEOUT'
  | 'ABORTED';

/** Stable, redacted SDK error. It never includes a response or claim value. */
export class VerifierClientError extends Error {
  constructor(
    readonly code: VerifierClientErrorCode,
    message = 'Verifier operation failed',
    readonly receiptId?: string,
    options?: { readonly cause?: unknown },
  ) {
    super(message, options);
    this.name = 'VerifierClientError';
  }
}

export type ScannerRequestOptions = {
  readonly signal?: AbortSignal;
  readonly idempotencyKey?: string;
  readonly retry?: RetryPolicy;
  readonly timeoutMs?: number;
};

export type VerifierOpenApiContract = {
  '/v1/verification-sessions': {
    POST: { body: { readonly policyId: string }; response: VerificationSession };
  };
  '/v1/verification-sessions/{sessionId}': {
    GET: { response: VerificationSession };
  };
  '/v1/verification-sessions/{sessionId}/responses': {
    POST: { response: VerificationReceipt };
  };
  '/v1/receipts/{receiptId}': {
    GET: { response: VerificationReceipt };
  };
};
