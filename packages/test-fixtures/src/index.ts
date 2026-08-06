import { generateKeyPair, exportJWK } from 'jose';

export const SD_JWT_VC_DRAFT = 'draft-ietf-oauth-sd-jwt-vc-16' as const;
export const SD_JWT_VC_MEDIA_TYPE = 'dc+sd-jwt' as const;
export const syntheticAgeCredential = {
  issuer: 'https://issuer.local/synthetic',
  vct: 'AgeCredential' as const,
  claims: {
    is_over_18: true as const,
    given_name: 'Synthetic Holder',
    country: 'ES',
  },
  expiresAt: 2_000_000_000,
};

/**
 * The canonical local presentation fixture.  It deliberately contains only
 * the derived age claim; birthdate and other identity attributes never enter
 * the verifier request or response body.
 */
export const syntheticAgePresentation = Object.freeze({
  issuer: syntheticAgeCredential.issuer,
  vct: 'urn:ssw:age-over-18',
  claims: { is_over_18: true as const },
});

export const SYNTHETIC_WALLET_PASSPHRASE = 'synthetic-local-recovery-factor-v1';
export const SYNTHETIC_CREDENTIAL_ID = 'credential-age-over-18';

/** Stable marker used by the local E2E reset command. */
export const LOCAL_FIXTURE_VERSION = 'ssw-local-vertical-slice-v1' as const;

export {
  createPlatformFixture,
  resetPlatformFixture,
  type PlatformFixture,
  type PlatformFixtureOptions,
} from './platform-use-cases.js';

export async function createSyntheticKeyMaterial() {
  const issuer = await generateKeyPair('ES256');
  const holder = await generateKeyPair('ES256');
  return {
    issuerPrivateKey: issuer.privateKey,
    issuerPublicKey: issuer.publicKey,
    issuerJwk: await exportJWK(issuer.publicKey),
    holderPrivateKey: holder.privateKey,
    holderPublicKey: holder.publicKey,
    holderJwk: await exportJWK(holder.publicKey),
  };
}

/** Deterministic OpenID4VCI 1.0 documents used by protocol tests. */
export const syntheticOpenId4Vci = {
  issuerMetadata: {
    credential_issuer: 'https://issuer.example',
    credential_endpoint: 'https://issuer.example/credential',
    token_endpoint: 'https://issuer.example/oauth/token',
    credential_configurations_supported: {
      age: { format: 'dc+sd-jwt' as const, vct: 'AgeCredential' },
    },
  },
  credentialOffer: {
    credential_issuer: 'https://issuer.example',
    credential_configuration_ids: ['age'] as const,
    grants: {
      'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
        'pre-authorized_code': 'synthetic-pre-authorized-code',
      },
    },
  },
  proofJwt: 'synthetic-proof',
  credential: 'synthetic-unverified-token',
} as const;
