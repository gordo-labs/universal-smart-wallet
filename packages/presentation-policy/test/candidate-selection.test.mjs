import { describe, expect, it } from 'vitest';
import {
  ageOver18Policy,
  selectPresentationCandidates,
} from '../dist/index.js';

describe('strict DCQL candidate selection', () => {
  it('returns only holder-approved matching credentials', () => {
    const candidate = {
      id: 'age-credential',
      format: 'dc+sd-jwt',
      vct: 'urn:ssw:age-over-18',
      claims: { is_over_18: true, given_name: 'Synthetic' },
      disclosures: ['given-name'],
    };
    expect(
      selectPresentationCandidates(
        ageOver18Policy(),
        [candidate],
        ['age-credential'],
      ),
    ).toHaveLength(1);
    expect(
      selectPresentationCandidates(ageOver18Policy(), [candidate], []),
    ).toHaveLength(0);
  });
  it('rejects a wrong claim value', () => {
    const candidate = {
      id: 'age-credential',
      format: 'dc+sd-jwt',
      vct: 'urn:ssw:age-over-18',
      claims: { is_over_18: false },
      disclosures: [],
    };
    expect(
      selectPresentationCandidates(ageOver18Policy(), [candidate]),
    ).toHaveLength(0);
  });
});
