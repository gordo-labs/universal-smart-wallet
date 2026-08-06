import {
  classifyCredentialInput,
  parseCredentialInput,
  type CredentialScannerOptions,
  type ParsedCredentialScan,
  type CredentialScanKind,
  type ScanClassification,
} from '@ssw/credential-scanner';
import type {
  VerificationReceipt,
  VerificationResponse,
  VerifierRequestOptions,
} from '../verifier/types.js';
import { VerifierClientError } from '../verifier/types.js';

export type ScannerClientOptions = {
  readonly parser?: CredentialScannerOptions;
  readonly now?: () => number;
  readonly verifier?: {
    submitResponse(
      sessionId: string,
      response: VerificationResponse,
      options?: VerifierRequestOptions,
    ): Promise<VerificationReceipt>;
  };
};

export type AcceptedCredentialScan = {
  readonly schemaVersion: 1;
  readonly acceptedAt: number;
  readonly scan: ParsedCredentialScan;
};

export type ScannerErrorCode =
  | 'INVALID_REQUEST'
  | 'UNEXPECTED_SCAN_KIND'
  | 'VERIFIER_NOT_CONFIGURED'
  | 'ABORTED';

/** Scanner errors do not include raw QR input or presentation values. */
export class ScannerClientError extends Error {
  constructor(readonly code: ScannerErrorCode, message = 'Scanner operation failed') {
    super(message);
    this.name = 'ScannerClientError';
  }
}

const fail = (code: ScannerErrorCode, message?: string): never => {
  throw new ScannerClientError(code, message);
};

const abortIfNeeded = (signal?: AbortSignal): void => {
  if (signal?.aborted) fail('ABORTED', 'Request aborted');
};

/**
 * Side-effect-free scanner orchestration. It delegates parsing to the bounded
 * credential-scanner package and delegates direct_post submission to a typed
 * verifier client. It never opens URLs, starts a camera, fetches an offer, or
 * stores a presentation.
 */
export class CredentialScannerClient {
  private readonly parser: CredentialScannerOptions;
  private readonly clock: () => number;

  constructor(private readonly options: ScannerClientOptions = {}) {
    this.parser = options.parser ?? {};
    this.clock = options.now ?? (() => Date.now());
  }

  parse(input: string | Uint8Array): ParsedCredentialScan {
    return parseCredentialInput(input, this.parser);
  }

  classify(input: string | Uint8Array): ScanClassification {
    return classifyCredentialInput(input, this.parser);
  }

  accept(
    input: string | Uint8Array,
    expectedKind?: CredentialScanKind,
  ): AcceptedCredentialScan {
    const scan = this.parse(input);
    if (expectedKind !== undefined && scan.kind !== expectedKind)
      fail('UNEXPECTED_SCAN_KIND', 'Scanned credential flow is not expected');
    return Object.freeze({
      schemaVersion: 1,
      acceptedAt: this.clock(),
      scan,
    });
  }

  /**
   * Respond to an already accepted OpenID4VP request. The accepted scan is
   * required to make the presentation flow explicit; issuance/offline scans
   * can never be accidentally sent to a verifier endpoint.
   */
  async respond(
    accepted: AcceptedCredentialScan,
    sessionId: string,
    response: VerificationResponse,
    options: VerifierRequestOptions = {},
  ): Promise<VerificationReceipt> {
    abortIfNeeded(options.signal);
    if (
      !accepted ||
      accepted.schemaVersion !== 1 ||
      !accepted.scan ||
      accepted.scan.kind !== 'presentation'
    )
      fail('UNEXPECTED_SCAN_KIND', 'A presentation scan is required');
    if (!sessionId || sessionId.length > 128)
      fail('INVALID_REQUEST', 'sessionId is invalid');
    const configuredVerifier =
      this.options.verifier ?? fail('VERIFIER_NOT_CONFIGURED');
    try {
      return await configuredVerifier.submitResponse(sessionId, response, options);
    } catch (error) {
      if (options.signal?.aborted) fail('ABORTED', 'Request aborted');
      throw error;
    }
  }

  acceptAndRespond(
    input: string | Uint8Array,
    sessionId: string,
    response: VerificationResponse,
    options: VerifierRequestOptions = {},
  ): Promise<VerificationReceipt> {
    const accepted = this.accept(input, 'presentation');
    return this.respond(accepted, sessionId, response, options);
  }
}

export const createCredentialScannerClient = (
  options: ScannerClientOptions = {},
): CredentialScannerClient => new CredentialScannerClient(options);
