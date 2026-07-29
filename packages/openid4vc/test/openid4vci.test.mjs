import { describe, expect, it } from 'vitest';
import {
  DeterministicIssuerAdapter,
  OpenId4VciError,
  PRE_AUTHORIZED_CODE_GRANT,
  issuePreAuthorizedCredential,
  parseCredentialOffer,
  parseIssuerMetadata,
} from '../src/index.ts';

const metadata = {
  credential_issuer: 'https://issuer.example',
  credential_endpoint: 'https://issuer.example/credential',
  token_endpoint: 'https://issuer.example/oauth/token',
  credential_configurations_supported: {
    age: { format: 'dc+sd-jwt', vct: 'AgeCredential' },
  },
};
const offer = {
  credential_issuer: 'https://issuer.example',
  credential_configuration_ids: ['age'],
  grants: { [PRE_AUTHORIZED_CODE_GRANT]: { 'pre-authorized_code': 'code-1' } },
};

describe('OpenID4VCI 1.0 pre-authorized code', () => {
  it('parses final metadata and offer names', () => {
    expect(parseIssuerMetadata(metadata).credential_endpoint).toBe(
      metadata.credential_endpoint,
    );
    expect(
      parseCredentialOffer(offer).grants[PRE_AUTHORIZED_CODE_GRANT][
        'pre-authorized_code'
      ],
    ).toBe('code-1');
  });

  it('runs deterministic issuer-wallet flow and verifies before storage', async () => {
    const adapter = new DeterministicIssuerAdapter(
      metadata,
      offer,
      'credential-token',
    );
    const inserted = [];
    const result = await issuePreAuthorizedCredential({
      offer,
      transport: adapter.transport,
      proofJwt: 'synthetic-proof',
      verifyCredential: async (credential) => ({
        issuer: metadata.credential_issuer,
        vct: 'AgeCredential',
        credential,
      }),
      vault: {
        put: async (_metadata, credential) => inserted.push(credential),
      },
      credentialId: 'fixture-1',
    });
    expect(result.stored).toBe(true);
    expect(inserted).toHaveLength(1);
  });

  it('never stores when verification fails and maps proof errors safely', async () => {
    const adapter = new DeterministicIssuerAdapter(
      metadata,
      offer,
      'credential-token',
    );
    let writes = 0;
    await expect(
      issuePreAuthorizedCredential({
        offer,
        transport: adapter.transport,
        proofJwt: 'bad-proof',
        verifyCredential: async () => ({ ok: true }),
        vault: {
          put: async () => {
            writes += 1;
          },
        },
      }),
    ).rejects.toMatchObject({
      code: 'oauth_invalid_or_missing_proof',
      action: 'restart',
    });
    expect(writes).toBe(0);
    await expect(
      issuePreAuthorizedCredential({
        offer,
        transport: adapter.transport,
        proofJwt: 'synthetic-proof',
        verifyCredential: async () => undefined,
      }),
    ).rejects.toMatchObject({ code: 'verification_failed' });
  });

  it('rejects private origins, cross-origin metadata, redirects, and oversized responses', async () => {
    expect(() =>
      parseIssuerMetadata({
        ...metadata,
        credential_issuer: 'https://127.0.0.1',
      }),
    ).toThrowError(OpenId4VciError);
    expect(() =>
      parseIssuerMetadata({
        ...metadata,
        credential_endpoint: 'https://other.example/credential',
      }),
    ).toThrowError(/origin/i);
    const badTransport = async () => ({ status: 302, body: '' });
    await expect(
      issuePreAuthorizedCredential({
        offer,
        transport: badTransport,
        proofJwt: 'proof',
        verifyCredential: async () => ({}),
      }),
    ).rejects.toMatchObject({ code: 'redirect_rejected' });
    const huge = async () => ({ status: 200, body: 'x'.repeat(40_000) });
    await expect(
      issuePreAuthorizedCredential({
        offer,
        transport: huge,
        proofJwt: 'proof',
        verifyCredential: async () => ({}),
      }),
    ).rejects.toMatchObject({ code: 'response_too_large' });
  });
});
