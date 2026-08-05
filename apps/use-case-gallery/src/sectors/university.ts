import {
  UNIVERSITY_PACKS,
  runUniversityJourney,
  type UniversityJourneyId,
  type UniversityJourneyResult,
} from '@ssw/institutional-use-cases';

export type UniversityGalleryCase = {
  readonly id: UniversityJourneyId;
  readonly title: string;
  readonly path: string;
  readonly issuerPolicy: string;
  readonly verifierPolicy: string;
  readonly authority: string;
};

export const UNIVERSITY_GALLERY_CASES: readonly UniversityGalleryCase[] =
  Object.values(UNIVERSITY_PACKS).map((pack) => ({
    id: pack.id,
    title: pack.title,
    path: `/university/${pack.id}`,
    issuerPolicy: pack.issuerPolicy.policyId,
    verifierPolicy: pack.verifierPolicy.policyId,
    authority: 'Synthetic registrar only; no government licence authority',
  }));

export function runUniversityGalleryJourney(
  id: UniversityJourneyId,
): UniversityJourneyResult {
  return runUniversityJourney(id);
}
