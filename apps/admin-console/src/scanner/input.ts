export const ALLOWED_SCAN_SCHEMES = new Set([
  'openid-credential-offer:',
  'openid4vp:',
  'ssw-offline:',
]);

export type ScanSource = 'camera' | 'image' | 'uri' | 'deep-link';
export type ParsedScan = { readonly input: string | Uint8Array; readonly source: ScanSource };
export type ScanParser<T> = (input: string | Uint8Array) => T;

export class ScanInputError extends Error {
  constructor(readonly code: 'EMPTY' | 'UNKNOWN_SCHEME' | 'UNTRUSTED_LINK' | 'DUPLICATE' | 'INVALID_IMAGE', message: string) {
    super(message);
    this.name = 'ScanInputError';
  }
}

const asString = (value: string): string => {
  if (value.length === 0 || value.length > 16_384) throw new ScanInputError('EMPTY', 'Scan input is empty or too large');
  return value;
};

/** Only known credential schemes or an explicitly trusted HTTPS link pass. */
export const validateDeepLink = (
  value: string,
  allowHosts: readonly string[] = [],
): string => {
  const raw = asString(value);
  let url: URL;
  try { url = new URL(raw); } catch { throw new ScanInputError('UNKNOWN_SCHEME', 'The link scheme is not supported'); }
  if (ALLOWED_SCAN_SCHEMES.has(url.protocol)) return raw;
  if (url.protocol !== 'https:' || !allowHosts.includes(url.hostname) || url.username || url.password || url.hash)
    throw new ScanInputError('UNTRUSTED_LINK', 'The link is not in the configured allow-list');
  return raw;
};

export const fromUri = (value: string): ParsedScan => ({ input: validateDeepLink(value), source: 'uri' });
export const fromDeepLink = (value: string, allowHosts: readonly string[] = []): ParsedScan => ({ input: validateDeepLink(value, allowHosts), source: 'deep-link' });

export const fromImageBytes = (bytes: Uint8Array): ParsedScan => {
  if (bytes.byteLength === 0 || bytes.byteLength > 2_000_000) throw new ScanInputError('INVALID_IMAGE', 'Image is empty or too large');
  return { input: bytes, source: 'image' };
};

/** Reject duplicate scans before handing a payload to a verifier or wallet. */
export class SingleUseScanGate {
  private readonly seen = new Set<string>();
  constructor(private readonly maxEntries = 256) {}

  accept(input: string | Uint8Array): boolean {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    const key = `${bytes.byteLength}:${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
    if (this.seen.has(key)) return false;
    if (this.seen.size >= this.maxEntries) this.seen.delete(this.seen.keys().next().value as string);
    this.seen.add(key);
    return true;
  }
}

export const decodeImage = async (file: Blob, decode: (file: Blob) => Promise<string | Uint8Array>): Promise<ParsedScan> => {
  if (file.size === 0 || file.size > 2_000_000) throw new ScanInputError('INVALID_IMAGE', 'Image is empty or too large');
  const value = await decode(file);
  if (typeof value === 'string') return { input: asString(value), source: 'image' };
  return fromImageBytes(value);
};
