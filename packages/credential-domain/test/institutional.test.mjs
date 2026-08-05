import { describe, expect, it } from 'vitest';
import {
  assuranceAllowed,
  assertSameTenant,
  deprecateCredentialTemplate,
  parseCredentialTemplate,
  parseIssuerProfile,
  publishCredentialTemplate,
} from '../dist/index.js';

const reviewed = {
  schemaVersion: 1,
  tenantId: 'university-a',
  templateId: 'degree',
  version: 1,
  type: 'UniversityDegreeCredential',
  assurance: 'institutional',
  formats: ['sd-jwt-vc', 'w3c-vc-di'],
  claims: [
    {
      name: 'degreeType',
      type: 'string',
      required: true,
      selectivelyDisclosable: true,
    },
  ],
  status: 'review',
};

describe('institutional credential domain', () => {
  it('publishes reviewed templates immutably and deprecates explicitly', () => {
    const published = publishCredentialTemplate(reviewed);
    expect(published.status).toBe('published');
    expect(Object.isFrozen(published)).toBe(true);
    expect(deprecateCredentialTemplate(published).status).toBe('deprecated');
    expect(() =>
      publishCredentialTemplate({ ...reviewed, status: 'draft' }),
    ).toThrow(/reviewed/);
  });
  it('rejects unknown fields, legacy issuance, duplicate claims and PII identifiers', () => {
    expect(() => parseCredentialTemplate({ ...reviewed, secret: 'x' })).toThrow(
      /unknown field/,
    );
    expect(() =>
      parseCredentialTemplate({ ...reviewed, formats: ['jwt-vc-legacy'] }),
    ).toThrow(/verify-only/);
    expect(() =>
      parseCredentialTemplate({
        ...reviewed,
        claims: [...reviewed.claims, ...reviewed.claims],
      }),
    ).toThrow(/duplicate/);
    expect(() =>
      parseCredentialTemplate({ ...reviewed, tenantId: 'person@example.com' }),
    ).toThrow(/opaque/);
  });
  it('keeps assurance exact and rejects tenant escape', () => {
    const policy = { acceptedAssurance: ['institutional'] };
    expect(assuranceAllowed('institutional', policy)).toBe(true);
    expect(assuranceAllowed('self_attested', policy)).toBe(false);
    expect(() =>
      assertSameTenant({ tenantId: 'a' }, { tenantId: 'b' }),
    ).toThrow(/cross-tenant/);
  });
  it('requires https institutional issuers and rejects self-attested issuer profiles', () => {
    expect(
      parseIssuerProfile({
        schemaVersion: 1,
        tenantId: 'university-a',
        issuerId: 'issuer-1',
        issuerUri: 'https://issuer.example',
        assurance: 'institutional',
        keyRef: 'kms-key-1',
        authorizedTemplateIds: ['degree'],
      }).issuerId,
    ).toBe('issuer-1');
    expect(() =>
      parseIssuerProfile({
        schemaVersion: 1,
        tenantId: 'university-a',
        issuerId: 'issuer-1',
        issuerUri: 'http://issuer.example',
        assurance: 'institutional',
        keyRef: 'kms-key-1',
        authorizedTemplateIds: [],
      }),
    ).toThrow(/https/);
    expect(() =>
      parseIssuerProfile({
        schemaVersion: 1,
        tenantId: 'university-a',
        issuerId: 'issuer-1',
        issuerUri: 'https://issuer.example',
        assurance: 'self_attested',
        keyRef: 'key',
        authorizedTemplateIds: [],
      }),
    ).toThrow(/institutional assurance/);
  });
});
