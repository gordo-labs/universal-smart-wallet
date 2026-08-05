/**
 * In-memory one-time gate for credential links and QR payloads.
 *
 * Only a bounded digest is retained. Raw links, QR values and presentations
 * are never persisted, logged, or returned by this module.
 */
export class SingleUseLinkGate {
  private readonly consumed = new Set<string>();

  constructor(private readonly maxEntries = 256) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 4096)
      throw new RangeError('maxEntries is invalid');
  }

  accept(input: string | Uint8Array): boolean {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
    if (bytes.byteLength === 0 || bytes.byteLength > 16_384) return false;
    const key = digest(bytes);
    if (this.consumed.has(key)) return false;
    if (this.consumed.size >= this.maxEntries) this.consumed.delete(this.consumed.values().next().value as string);
    this.consumed.add(key);
    return true;
  }

  get size(): number {
    return this.consumed.size;
  }
}

// Two independent 32-bit lanes give a stable, allocation-free digest while
// keeping the one-time cache free of raw credential data. This is a replay
// key, not a signature or cryptographic identity primitive.
const digest = (bytes: Uint8Array): string => {
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (const byte of bytes) {
    left ^= byte;
    left = Math.imul(left, 0x01000193);
    right ^= byte + 0x7f4a7c15;
    right = Math.imul(right, 0x85ebca6b);
  }
  return `${(left >>> 0).toString(16)}:${(right >>> 0).toString(16)}:${bytes.byteLength}`;
};
