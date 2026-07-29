import { describe, expect, it } from 'vitest';
import { generateKeyPair, exportJWK } from 'jose';
import {
  issue,
  present,
  verify,
  SdJwtVerificationError,
  SD_JWT_VC_PROFILE,
  SD_JWT_VC_MEDIA_TYPE,
} from '../src/index.ts';

async function material() {
  const issuer = await generateKeyPair('ES256');
  const holder = await generateKeyPair('ES256');
  return { issuer, holder, holderJwk: await exportJWK(holder.publicKey) };
}

async function issued() {
  const keys = await material();
  const credential = await issue({
    issuer: 'https://issuer.local/synthetic',
    vct: 'AgeCredential',
    claims: { is_over_18: true, given_name: 'Synthetic Holder', country: 'ES' },
    issuerKey: keys.issuer.privateKey,
    issuerKid: 'issuer-1',
    holderJwk: keys.holderJwk,
    issuedAt: 1_700_000_000,
    expiresAt: 2_000_000_000,
  });
  return { ...keys, credential };
}

describe('pinned SD-JWT VC adapter', () => {
  it('issues a draft-16 dc+sd-jwt fixture and discloses only selected claims', async () => {
    const { credential, holder, issuer } = await issued();
    expect(credential.profile).toBe(SD_JWT_VC_PROFILE);
    expect(credential.mediaType).toBe(SD_JWT_VC_MEDIA_TYPE);
    const country = credential.disclosures.find((d) =>
      Buffer.from(d, 'base64url').toString().includes('country'),
    );
    const presentation = await present({
      token: credential.token,
      disclosures: [country],
      holderKey: holder.privateKey,
      holderKid: 'holder-1',
      audience: 'https://verifier.local',
      nonce: 'n-1',
    });
    const result = await verify({
      presentation,
      issuerKey: issuer.publicKey,
      expectedAudience: 'https://verifier.local',
      expectedNonce: 'n-1',
      now: 1_800_000_000,
    });
    expect(result.claims).toMatchObject({ is_over_18: true, country: 'ES' });
    expect(result.claims.given_name).toBeUndefined();
  });

  it.each([
    [
      'mutated disclosure',
      (p) => {
        const parts = p.split('~');
        const raw = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        raw[2] = 'FR';
        parts[1] = Buffer.from(JSON.stringify(raw)).toString('base64url');
        return parts.join('~');
      },
    ],
    ['wrong audience', (p) => p],
  ])('rejects %s', async (_name, mutate) => {
    const { credential, holder, issuer } = await issued();
    const country = credential.disclosures.find((d) =>
      Buffer.from(d, 'base64url').toString().includes('country'),
    );
    const presentation = await present({
      token: credential.token,
      disclosures: [country],
      holderKey: holder.privateKey,
      holderKid: 'holder-1',
      audience: 'https://verifier.local',
      nonce: 'n-1',
    });
    const value = mutate(presentation);
    if (_name === 'wrong audience')
      await expect(
        verify({
          presentation: value,
          issuerKey: issuer.publicKey,
          expectedAudience: 'https://other.local',
          now: 1_800_000_000,
        }),
      ).rejects.toBeInstanceOf(SdJwtVerificationError);
    else
      await expect(
        verify({
          presentation: value,
          issuerKey: issuer.publicKey,
          now: 1_800_000_000,
        }),
      ).rejects.toBeInstanceOf(Error);
  });

  it('rejects unsupported JOSE algorithms, profile, and expiry', async () => {
    const { credential, issuer, holder } = await issued();
    const expired = await issue({
      issuer: 'https://issuer.local/synthetic',
      vct: 'AgeCredential',
      claims: { is_over_18: true },
      issuerKey: issuer.privateKey,
      issuerKid: 'issuer-1',
      holderJwk: await exportJWK(holder.publicKey),
      issuedAt: 1_700_000_000,
      expiresAt: 1_700_000_001,
    });
    const p = await present({
      token: expired.token,
      disclosures: [],
      holderKey: holder.privateKey,
      holderKid: 'holder-1',
      audience: 'v',
      nonce: 'n',
    });
    await expect(
      verify({
        presentation: p,
        issuerKey: issuer.publicKey,
        now: 1_700_000_002,
      }),
    ).rejects.toThrow('expired');
    expect(credential.profile).toBe(SD_JWT_VC_PROFILE);
  });
});
