import { describe, expect, it } from 'vitest';
import {
  parseCredentialMetadata,
  parseVerificationResult,
  SchemaValidationError,
} from '../dist/index.js';

describe('shared runtime schemas', () => {
  it('accepts versioned metadata and verification result', () => {
    expect(
      parseCredentialMetadata({
        schemaVersion: 1,
        format: 'dc+sd-jwt',
        vct: 'urn:ssw:test',
      }).schemaVersion,
    ).toBe(1);
    expect(
      parseVerificationResult({
        schemaVersion: 1,
        status: 'verified',
        credentialId: 'c1',
        disclosedClaims: { is_over_18: true },
        checks: ['signature'],
      }).status,
    ).toBe('verified');
  });
  it('rejects unknown fields, unsupported formats, and oversized values', () => {
    expect(() =>
      parseCredentialMetadata({ schemaVersion: 1, format: 'jwt', vct: 'x' }),
    ).toThrow(SchemaValidationError);
    expect(() =>
      parseCredentialMetadata({
        schemaVersion: 1,
        format: 'dc+sd-jwt',
        vct: 'x',
        extra: true,
      }),
    ).toThrow(SchemaValidationError);
    expect(() =>
      parseCredentialMetadata({
        schemaVersion: 1,
        format: 'dc+sd-jwt',
        vct: 'x'.repeat(257),
      }),
    ).toThrow(SchemaValidationError);
  });
});
