import { describe, expect, it, vi } from 'vitest';
import {
  attestationSigningPayload,
  signAttestation,
  validateAttestation,
  verifyAttestation,
} from '../dist/index.js';

const hex32 = (character) => `0x${character.repeat(64)}`;
const address = (character) => `0x${character.repeat(40)}`;
const unsigned = () => ({
  version: 1,
  chainId: 84532,
  consumer: address('1'),
  policy: hex32('a'),
  subject: hex32('b'),
  nonce: hex32('c'),
  issuedAt: 1_000,
  expiresAt: 1_060,
  attestor: address('2'),
  attestorVersion: hex32('d'),
});

describe('on-chain attestation privacy and security boundary', () => {
  it.each([
    ['consumer', '0x0000000000000000000000000000000000000000'],
    ['policy', '0x01'],
    ['subject', 'not-hex'],
    ['nonce', hex32('c').slice(0, -1) + 'g'],
    ['attestor', '0x0000000000000000000000000000000000000000'],
    ['attestorVersion', '0x02'],
  ])('rejects malformed %s rather than signing it', (field, value) => {
    expect(() =>
      validateAttestation({ ...unsigned(), [field]: value }),
    ).toThrow();
  });

  it.each([
    ['chainId', 0],
    ['chainId', Number.MAX_SAFE_INTEGER + 1],
    ['issuedAt', 1.5],
    ['expiresAt', 1_000],
  ])('rejects invalid temporal/chain field %s', (field, value) => {
    expect(() =>
      validateAttestation({ ...unsigned(), [field]: value }),
    ).toThrow();
  });

  it('binds every privacy-relevant field into the canonical signing payload', () => {
    const base = attestationSigningPayload(unsigned());
    for (const field of [
      'chainId',
      'consumer',
      'policy',
      'subject',
      'nonce',
      'issuedAt',
      'expiresAt',
      'attestor',
      'attestorVersion',
    ]) {
      const changed = {
        ...unsigned(),
        [field]: field === 'chainId' ? 1 : unsigned()[field],
      };
      if (field !== 'chainId') {
        changed[field] =
          field === 'issuedAt'
            ? 1_001
            : field === 'expiresAt'
              ? 1_061
              : field === 'consumer'
                ? address('3')
                : field === 'policy'
                  ? hex32('e')
                  : field === 'subject'
                    ? hex32('f')
                    : field === 'nonce'
                      ? hex32('9')
                      : field === 'attestor'
                        ? address('4')
                        : hex32('8');
      }
      expect(attestationSigningPayload(changed)).not.toBe(base);
    }
  });

  it('rejects malformed signer output and verifies only within the validity window', async () => {
    const hash = (payload) => hex32(String(payload.length % 10));
    await expect(
      signAttestation(unsigned(), () => '0x01', hash),
    ).rejects.toThrow(/signature/);
    const signer = vi.fn(
      ({ digest }) => `0x${digest.slice(2)}${'00'.repeat(32)}1b`,
    );
    const signed = await signAttestation(unsigned(), signer, hash);
    expect(signer).toHaveBeenCalledOnce();
    const verifier = vi.fn(() => true);
    expect(await verifyAttestation(signed, verifier, hash, 999)).toBe(false);
    expect(await verifyAttestation(signed, verifier, hash, 1_060)).toBe(false);
    expect(verifier).not.toHaveBeenCalled();
    expect(await verifyAttestation(signed, verifier, hash, 1_001)).toBe(true);
  });
});
