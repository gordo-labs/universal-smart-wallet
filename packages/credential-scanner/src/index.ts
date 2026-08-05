/**
 * Pure, bounded QR/URI classification for credential exchange.
 *
 * This package deliberately does not access cameras, open URLs, fetch remote
 * content, or verify credentials.  Those effects belong to the higher-level
 * wallet/admin integrations.  A scan result contains only the bounded opaque
 * payload needed by those integrations; callers must still apply trust and
 * consent policy before using it.
 */

export const SCANNER_SCHEMA_VERSION = 1 as const;
export const MAX_SCAN_INPUT_BYTES = 16_384;
export const MAX_SCAN_PAYLOAD_BYTES = 12_288;
export const MAX_QUERY_VALUE_BYTES = 8_192;

export const ISSUANCE_SCHEME = 'openid-credential-offer:' as const;
export const PRESENTATION_SCHEME = 'openid4vp:' as const;
export const OFFLINE_SCHEME = 'ssw-offline:' as const;

export type CredentialScanKind = 'issuance' | 'presentation' | 'offline';

export type CredentialScannerErrorCode =
  | 'EMPTY_INPUT'
  | 'INPUT_TOO_LARGE'
  | 'INVALID_ENCODING'
  | 'CONTROL_CHARACTER'
  | 'UNKNOWN_SCHEME'
  | 'MALFORMED_URI'
  | 'UNSUPPORTED_HOST'
  | 'DUPLICATE_PARAMETER'
  | 'UNKNOWN_PARAMETER'
  | 'MISSING_PARAMETER'
  | 'PARAMETER_TOO_LARGE'
  | 'INVALID_OFFER'
  | 'UNTRUSTED_OFFER_URI'
  | 'INVALID_REQUEST'
  | 'UNTRUSTED_REQUEST_URI'
  | 'INVALID_OFFLINE_ENVELOPE'
  | 'REPLAY_TOKEN_REUSED';

export class CredentialScannerError extends Error {
  constructor(
    readonly code: CredentialScannerErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'CredentialScannerError';
  }
}

export interface IssuanceScan {
  readonly schemaVersion: 1;
  readonly kind: 'issuance';
  readonly scheme: typeof ISSUANCE_SCHEME;
  readonly credentialOffer?: string;
  readonly credentialOfferUri?: string;
  /** True when the caller must fetch/validate an issuer-controlled URI. */
  readonly requiresExternalTrust: boolean;
}

export interface PresentationScan {
  readonly schemaVersion: 1;
  readonly kind: 'presentation';
  readonly scheme: typeof PRESENTATION_SCHEME;
  readonly request?: string;
  readonly requestUri?: string;
  readonly requiresExternalTrust: boolean;
}

export interface OfflineScan {
  readonly schemaVersion: 1;
  readonly kind: 'offline';
  readonly scheme: typeof OFFLINE_SCHEME;
  readonly version: 'v1';
  /** Base64url envelope, still opaque and unverified. */
  readonly envelope: string;
  /** Stable token passed to a one-time replay boundary by the caller. */
  readonly replayToken: string;
  readonly requiresExternalTrust: false;
}

export type ParsedCredentialScan =
  | IssuanceScan
  | PresentationScan
  | OfflineScan;

export type ScanClassification =
  | { readonly accepted: true; readonly input: ParsedCredentialScan }
  | {
      readonly accepted: false;
      readonly code: CredentialScannerErrorCode;
    };

export interface ReplayTokenBoundary {
  /** Atomically returns false for a token that was already consumed/expired. */
  consume(token: string, now?: number): boolean;
}

type ReplayEntry = { readonly expiresAt?: number };

/** Small in-memory reference boundary for tests and local adapters. */
export class InMemoryReplayTokenBoundary implements ReplayTokenBoundary {
  private readonly consumed = new Map<string, ReplayEntry>();

  issue(token: string, expiresAt?: number): void {
    validateReplayToken(token);
    if (expiresAt !== undefined && !Number.isSafeInteger(expiresAt))
      throw new CredentialScannerError(
        'INVALID_OFFLINE_ENVELOPE',
        'replay expiry is invalid',
      );
    this.consumed.delete(token);
    // An entry is absent until consumed. The expiry is retained separately so
    // callers can use deterministic clocks without a timer or background job.
    this.consumed.set(`issued:${token}`, { expiresAt });
  }

  consume(token: string, now = Date.now()): boolean {
    validateReplayToken(token);
    const issuedKey = `issued:${token}`;
    const issued = this.consumed.get(issuedKey);
    if (issued) {
      this.consumed.delete(issuedKey);
      if (issued.expiresAt !== undefined && now >= issued.expiresAt)
        return false;
      this.consumed.set(token, issued);
      return true;
    }
    if (this.consumed.has(token)) return false;
    // A token not explicitly issued is rejected; callers cannot accidentally
    // turn arbitrary QR data into a valid one-time nonce.
    return false;
  }
}

export interface CredentialScannerOptions {
  /** Explicit allow-list for issuer-controlled credential_offer_uri values. */
  readonly allowCredentialOfferUri?: (url: URL) => boolean;
  /** Explicit allow-list for verifier-controlled request_uri values. */
  readonly allowRequestUri?: (url: URL) => boolean;
  /** Optional one-time boundary for offline envelopes. */
  readonly replay?: ReplayTokenBoundary;
  readonly now?: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const controlCharacter = /[\u0000-\u001f\u007f]/u;
const base64UrlPattern = /^[A-Za-z0-9_-]+$/u;
const safeSchemePattern = /^[a-z][a-z0-9+.-]*:$/u;

const byteLength = (value: string): number => encoder.encode(value).byteLength;

const fail = (
  code: CredentialScannerErrorCode,
  message: string = code,
): never => {
  throw new CredentialScannerError(code, message);
};

const toInput = (input: string | Uint8Array): string => {
  let value = '';
  if (input instanceof Uint8Array) {
    if (input.byteLength === 0) fail('EMPTY_INPUT');
    if (input.byteLength > MAX_SCAN_INPUT_BYTES) fail('INPUT_TOO_LARGE');
    try {
      value = decoder.decode(input);
    } catch {
      return fail('INVALID_ENCODING');
    }
  } else if (typeof input === 'string') {
    value = input;
  } else {
    fail('INVALID_ENCODING');
  }
  if (value.length === 0) fail('EMPTY_INPUT');
  if (byteLength(value) > MAX_SCAN_INPUT_BYTES) fail('INPUT_TOO_LARGE');
  if (value.trim() !== value)
    fail('MALFORMED_URI', 'surrounding whitespace is not allowed');
  if (controlCharacter.test(value)) fail('CONTROL_CHARACTER');
  return value;
};

const uniqueParam = (url: URL, name: string): string | undefined => {
  const values = url.searchParams.getAll(name);
  if (values.length > 1) fail('DUPLICATE_PARAMETER', `${name} is duplicated`);
  const value = values[0];
  if (value !== undefined && byteLength(value) > MAX_QUERY_VALUE_BYTES)
    fail('PARAMETER_TOO_LARGE', `${name} is too large`);
  return value;
};

const rejectUnknownParams = (url: URL, allowed: readonly string[]): void => {
  for (const key of url.searchParams.keys())
    if (!allowed.includes(key))
      fail('UNKNOWN_PARAMETER', `${key} is not allowed`);
};

const parseUri = (input: string): URL => {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return fail('MALFORMED_URI', 'URI cannot be parsed');
  }
  if (!safeSchemePattern.test(url.protocol)) fail('MALFORMED_URI');
  if (url.username || url.password)
    fail('UNSUPPORTED_HOST', 'userinfo is forbidden');
  if (url.hash) fail('MALFORMED_URI', 'fragments are not accepted');
  return url;
};

const requireEmptyAuthority = (url: URL): void => {
  if (url.host || (url.pathname !== '' && url.pathname !== '/'))
    fail(
      'UNSUPPORTED_HOST',
      'authority and path are not accepted for this scheme',
    );
};

const requireHttpsUrl = (
  value: string,
  code: 'UNTRUSTED_OFFER_URI' | 'UNTRUSTED_REQUEST_URI',
  allow?: (url: URL) => boolean,
): URL => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail(code, 'remote URI is invalid');
  }
  if (
    url.protocol !== 'https:' ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.hash ||
    !allow?.(url)
  )
    fail(code, 'remote URI is not explicitly trusted');
  return url;
};

/**
 * A minimal duplicate-key rejecting JSON parser. JSON.parse alone silently
 * accepts duplicate object keys, which makes signed/approved QR data
 * ambiguous. Values are returned only to validate an offer shape; they are
 * never logged or persisted by this package.
 */
class JsonCursor {
  private index = 0;
  constructor(private readonly source: string) {}

  parse(): unknown {
    const value = this.value(0);
    this.ws();
    if (this.index !== this.source.length) throw new Error('trailing data');
    return value;
  }

  private ws(): void {
    while (/\s/u.test(this.source[this.index] ?? '')) this.index += 1;
  }

  private value(depth: number): unknown {
    if (depth > 10) throw new Error('nesting too deep');
    this.ws();
    const char = this.source[this.index];
    if (char === '{') return this.object(depth + 1);
    if (char === '[') return this.array(depth + 1);
    if (char === '"') return this.string();
    if (this.source.startsWith('true', this.index)) {
      this.index += 4;
      return true;
    }
    if (this.source.startsWith('false', this.index)) {
      this.index += 5;
      return false;
    }
    if (this.source.startsWith('null', this.index)) {
      this.index += 4;
      return null;
    }
    const number = this.source
      .slice(this.index)
      .match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u);
    if (number) {
      this.index += number[0].length;
      const parsed = Number(number[0]);
      if (!Number.isFinite(parsed)) throw new Error('number is not finite');
      return parsed;
    }
    throw new Error('invalid value');
  }

  private string(): string {
    const start = this.index;
    this.index += 1;
    let escaped = false;
    while (this.index < this.source.length) {
      const char = this.source[this.index++];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        try {
          return JSON.parse(this.source.slice(start, this.index)) as string;
        } catch {
          throw new Error('invalid string');
        }
      }
      if (char < ' ') throw new Error('control character in string');
    }
    throw new Error('unterminated string');
  }

  private object(depth: number): Record<string, unknown> {
    this.index += 1;
    const result: Record<string, unknown> = {};
    const keys = new Set<string>();
    this.ws();
    if (this.source[this.index] === '}') {
      this.index += 1;
      return result;
    }
    while (true) {
      this.ws();
      if (this.source[this.index] !== '"')
        throw new Error('object key required');
      const key = this.string();
      if (
        keys.has(key) ||
        key === '__proto__' ||
        key === 'constructor' ||
        key === 'prototype'
      )
        throw new Error('duplicate or unsafe key');
      keys.add(key);
      this.ws();
      if (this.source[this.index++] !== ':') throw new Error('colon required');
      result[key] = this.value(depth);
      this.ws();
      const delimiter = this.source[this.index++];
      if (delimiter === '}') return result;
      if (delimiter !== ',') throw new Error('object delimiter required');
    }
  }

  private array(depth: number): unknown[] {
    this.index += 1;
    const result: unknown[] = [];
    this.ws();
    if (this.source[this.index] === ']') {
      this.index += 1;
      return result;
    }
    while (true) {
      result.push(this.value(depth));
      if (result.length > 256) throw new Error('array too large');
      this.ws();
      const delimiter = this.source[this.index++];
      if (delimiter === ']') return result;
      if (delimiter !== ',') throw new Error('array delimiter required');
    }
  }
}

const validateCredentialOffer = (value: string): void => {
  if (byteLength(value) === 0 || byteLength(value) > MAX_SCAN_PAYLOAD_BYTES)
    fail('INVALID_OFFER', 'credential offer is outside bounds');
  let parsed: unknown;
  try {
    parsed = new JsonCursor(value).parse();
  } catch {
    fail('INVALID_OFFER', 'credential offer JSON is invalid or ambiguous');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    fail('INVALID_OFFER', 'credential offer must be an object');
};

const validateCompactRequest = (value: string): void => {
  if (byteLength(value) === 0 || byteLength(value) > MAX_SCAN_PAYLOAD_BYTES)
    fail('INVALID_REQUEST', 'request is outside bounds');
  const parts = value.split('.');
  if (parts.length !== 3 || parts.some((part) => part.length === 0))
    fail('INVALID_REQUEST', 'request must be a compact signed object');
  if (parts.some((part) => !base64UrlPattern.test(part)))
    fail('INVALID_REQUEST', 'request encoding is invalid');
};

const validateRemoteRequest = (
  url: URL,
  code: 'UNTRUSTED_OFFER_URI' | 'UNTRUSTED_REQUEST_URI',
  allow?: (url: URL) => boolean,
): string => requireHttpsUrl(url.toString(), code, allow).toString();

const parseIssuance = (
  url: URL,
  options: CredentialScannerOptions,
): IssuanceScan => {
  requireEmptyAuthority(url);
  rejectUnknownParams(url, ['credential_offer', 'credential_offer_uri']);
  const offer = uniqueParam(url, 'credential_offer');
  const offerUri = uniqueParam(url, 'credential_offer_uri');
  if ((offer && offerUri) || (!offer && !offerUri))
    fail('MISSING_PARAMETER', 'exactly one credential offer is required');
  if (offer) {
    validateCredentialOffer(offer);
    return {
      schemaVersion: SCANNER_SCHEMA_VERSION,
      kind: 'issuance',
      scheme: ISSUANCE_SCHEME,
      credentialOffer: offer,
      requiresExternalTrust: false,
    };
  }
  const trusted = validateRemoteRequest(
    parseUri(offerUri!),
    'UNTRUSTED_OFFER_URI',
    options.allowCredentialOfferUri,
  );
  return {
    schemaVersion: SCANNER_SCHEMA_VERSION,
    kind: 'issuance',
    scheme: ISSUANCE_SCHEME,
    credentialOfferUri: trusted,
    requiresExternalTrust: true,
  };
};

const parsePresentation = (
  url: URL,
  options: CredentialScannerOptions,
): PresentationScan => {
  requireEmptyAuthority(url);
  rejectUnknownParams(url, ['request', 'request_uri']);
  const request = uniqueParam(url, 'request');
  const requestUri = uniqueParam(url, 'request_uri');
  if ((request && requestUri) || (!request && !requestUri))
    fail('MISSING_PARAMETER', 'exactly one presentation request is required');
  if (request) {
    validateCompactRequest(request);
    return {
      schemaVersion: SCANNER_SCHEMA_VERSION,
      kind: 'presentation',
      scheme: PRESENTATION_SCHEME,
      request,
      requiresExternalTrust: false,
    };
  }
  const trusted = validateRemoteRequest(
    parseUri(requestUri!),
    'UNTRUSTED_REQUEST_URI',
    options.allowRequestUri,
  );
  return {
    schemaVersion: SCANNER_SCHEMA_VERSION,
    kind: 'presentation',
    scheme: PRESENTATION_SCHEME,
    requestUri: trusted,
    requiresExternalTrust: true,
  };
};

const parseOffline = (
  url: URL,
  options: CredentialScannerOptions,
): OfflineScan => {
  if (url.search || url.hash || !url.host || url.host !== 'v1')
    fail('INVALID_OFFLINE_ENVELOPE', 'offline envelope version is invalid');
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 1)
    fail('INVALID_OFFLINE_ENVELOPE', 'envelope is missing');
  const envelope = parts[0];
  if (
    byteLength(envelope) < 16 ||
    byteLength(envelope) > MAX_SCAN_PAYLOAD_BYTES ||
    !base64UrlPattern.test(envelope) ||
    envelope.length % 4 === 1
  )
    fail('INVALID_OFFLINE_ENVELOPE', 'envelope encoding is invalid');
  if (options.replay && !options.replay.consume(envelope, options.now))
    fail(
      'REPLAY_TOKEN_REUSED',
      'offline replay token is unknown or already consumed',
    );
  return {
    schemaVersion: SCANNER_SCHEMA_VERSION,
    kind: 'offline',
    scheme: OFFLINE_SCHEME,
    version: 'v1',
    envelope,
    replayToken: envelope,
    requiresExternalTrust: false,
  };
};

/** Pure parser. It never opens a browser, starts a camera, or performs I/O. */
export function parseCredentialInput(
  input: string | Uint8Array,
  options: CredentialScannerOptions = {},
): ParsedCredentialScan {
  const value = toInput(input);
  const url = parseUri(value);
  switch (url.protocol) {
    case ISSUANCE_SCHEME:
      return parseIssuance(url, options);
    case PRESENTATION_SCHEME:
      return parsePresentation(url, options);
    case OFFLINE_SCHEME:
      return parseOffline(url, options);
    default:
      return fail('UNKNOWN_SCHEME', 'scheme is not supported');
  }
}

/** Non-throwing classifier suitable for camera pipelines and fuzz tests. */
export function classifyCredentialInput(
  input: string | Uint8Array,
  options: CredentialScannerOptions = {},
): ScanClassification {
  try {
    return { accepted: true, input: parseCredentialInput(input, options) };
  } catch (error) {
    if (error instanceof CredentialScannerError)
      return { accepted: false, code: error.code };
    return { accepted: false, code: 'MALFORMED_URI' };
  }
}

/** Returns the protocol kind without granting trust or causing navigation. */
export function classifyUriScheme(
  input: string,
): CredentialScanKind | 'unknown' {
  try {
    const protocol = parseUri(toInput(input)).protocol;
    if (protocol === ISSUANCE_SCHEME) return 'issuance';
    if (protocol === PRESENTATION_SCHEME) return 'presentation';
    if (protocol === OFFLINE_SCHEME) return 'offline';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export const safeUriClassifier = classifyUriScheme;
export const parseQrInput = parseCredentialInput;
export const classifyQrInput = classifyCredentialInput;

export function validateReplayToken(token: string): void {
  if (
    byteLength(token) < 16 ||
    byteLength(token) > MAX_SCAN_PAYLOAD_BYTES ||
    !base64UrlPattern.test(token) ||
    token.length % 4 === 1
  )
    fail('INVALID_OFFLINE_ENVELOPE', 'replay token is invalid');
}

export function consumeReplayToken(
  boundary: ReplayTokenBoundary,
  token: string,
  now?: number,
): void {
  validateReplayToken(token);
  if (!boundary.consume(token, now))
    fail('REPLAY_TOKEN_REUSED', 'replay token is unknown or already consumed');
}
