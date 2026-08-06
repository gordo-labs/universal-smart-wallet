import {
  GOVERNMENT_PACKS,
  runGovernmentJourney,
  type GovernmentJourneyId,
  type GovernmentJourneyResult,
} from '@ssw/institutional-use-cases';

export type GovernmentGalleryCase = {
  readonly id: GovernmentJourneyId;
  readonly title: string;
  readonly path: string;
  readonly authorityType: string;
  readonly jurisdiction: string;
  readonly assuranceLabels: readonly string[];
  readonly legalStatus: 'synthetic-policy-only';
};

export const GOVERNMENT_GALLERY_CASES: readonly GovernmentGalleryCase[] =
  Object.values(GOVERNMENT_PACKS).map((pack) => ({
    id: pack.id,
    title: pack.title,
    path: `/government/${pack.id}`,
    authorityType: pack.authority.authorityType,
    jurisdiction: pack.authority.jurisdiction,
    assuranceLabels: pack.verifierPolicy.assuranceLabels,
    legalStatus: pack.authority.legalStatus,
  }));

export function runGovernmentGalleryJourney(
  id: GovernmentJourneyId,
): GovernmentJourneyResult {
  return runGovernmentJourney(id);
}
