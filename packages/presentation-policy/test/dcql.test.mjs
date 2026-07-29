import { describe, expect, it } from 'vitest';
import { ageOver18Policy, fromDcql, parsePresentationPolicy, toDcql } from '../dist/index.js';

describe('narrow DCQL policy mapping', () => {
  it('round-trips the age-over-18 policy deterministically', () => {
    const policy = ageOver18Policy();
    const query = toDcql(policy);
    expect(query).toEqual(toDcql(fromDcql(query, policy.purpose)));
    expect(query.credentials[0].claims[0].path).toEqual(['is_over_18']);
  });
  it('rejects unsupported operators, paths, and disclosure requests', () => {
    expect(() => parsePresentationPolicy({ schemaVersion: 1, id: 'x', purpose: 'y', credentials: [{ id: 'c', format: 'dc+sd-jwt', vct: 'v', claims: [{ path: ['is_over_18'], operator: 'greater_than', value: true, requiredDisclosure: true }] }] })).toThrow();
    expect(() => fromDcql({ credentials: [{ id: 'c', format: 'jwt', meta: { vct_values: ['v'] }, claims: [] }] })).toThrow();
    expect(() => fromDcql({ credentials: [{ id: 'c', format: 'dc+sd-jwt', meta: { vct_values: ['v'] }, claims: [{ path: ['is_over_18'], values: [true, false] }] }] })).toThrow();
  });
  it('does not turn a hidden birthdate into an age predicate', () => {
    expect(ageOver18Policy().credentials[0].claims[0].path).toEqual(['is_over_18']);
  });
});
