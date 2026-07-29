import {
  attestationSigningPayload,
  signAttestation,
  type AttestationSigner,
  type Hex,
  type OnChainAttestation,
} from '@ssw/credential-domain';

export const appName = 'access-demo';
export const runtimeBoundary =
  'synthetic local verifier result; no PII or production assets';
export const ACCESS_POLICY = ('0x' + 'a'.repeat(64)) as Hex;

const sha256 = async (payload: string): Promise<Hex> => {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload)),
  );
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}` as Hex;
};

/** A local-only signer fixture. Replace it with a managed attestor key in a configured testnet. */
export const syntheticSigner: AttestationSigner = ({ digest }) =>
  `0x${digest.slice(2)}${'00'.repeat(32)}1b` as Hex;

export type AccessDecision =
  | { readonly ok: true; readonly attestation: OnChainAttestation }
  | {
      readonly ok: false;
      readonly code: 'verification_failed' | 'attestation_invalid';
    };

export async function createAccessAttestation(input: {
  readonly verified: boolean;
  readonly chainId: number;
  readonly consumer: Hex;
  readonly subject: Hex;
  readonly nonce: Hex;
  readonly attestor: Hex;
  readonly attestorVersion: Hex;
  readonly nowSeconds?: number;
  readonly ttlSeconds?: number;
  readonly signer?: AttestationSigner;
}): Promise<AccessDecision> {
  if (!input.verified) return { ok: false, code: 'verification_failed' };
  const issuedAt = input.nowSeconds ?? Math.floor(Date.now() / 1_000);
  const ttl = input.ttlSeconds ?? 60;
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > 300)
    return { ok: false, code: 'attestation_invalid' };
  try {
    const unsigned = {
      version: 1 as const,
      chainId: input.chainId,
      consumer: input.consumer,
      policy: ACCESS_POLICY,
      subject: input.subject,
      nonce: input.nonce,
      issuedAt,
      expiresAt: issuedAt + ttl,
      attestor: input.attestor,
      attestorVersion: input.attestorVersion,
    };
    const attestation = await signAttestation(
      unsigned,
      input.signer ?? syntheticSigner,
      (payload) => {
        // signAttestation is synchronous at the hash boundary; this deterministic
        // placeholder is replaced by a chain SDK's keccak256 in real deployments.
        // It remains length-correct and contains no credential material.
        let result = 0n;
        for (const char of attestationSigningPayload(unsigned) + payload)
          result =
            (result * 31n + BigInt(char.codePointAt(0)!)) & ((1n << 256n) - 1n);
        return `0x${result.toString(16).padStart(64, '0')}` as Hex;
      },
    );
    return { ok: true, attestation };
  } catch {
    return { ok: false, code: 'attestation_invalid' };
  }
}

export const accessDemoUi = Object.freeze({
  title: 'Attestation-gated access',
  purpose:
    'Grant one short-lived local access decision without writing credential data on-chain.',
  privacy:
    'Only a policy, nullifier-style subject, nonce, expiry, audience, and attestor version are sent.',
  warning:
    'Synthetic local demo; configure and review an attestor before any testnet use.',
});
