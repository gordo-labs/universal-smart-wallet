import {
  DRIVING_SCHOOL_PACKS,
  runDrivingSchoolJourney,
  type DrivingSchoolJourneyId,
  type DrivingSchoolJourneyResult,
} from '@ssw/institutional-use-cases';

export type DrivingSchoolGalleryCase = {
  readonly id: DrivingSchoolJourneyId;
  readonly title: string;
  readonly path: string;
  readonly issuerPolicy: string;
  readonly verifierPolicy: string;
  readonly authority: string;
};

export const DRIVING_SCHOOL_GALLERY_CASES: readonly DrivingSchoolGalleryCase[] =
  Object.values(DRIVING_SCHOOL_PACKS).map((pack) => ({
    id: pack.id,
    title: pack.title,
    path: `/driving-school/${pack.id}`,
    issuerPolicy: pack.issuerPolicy.policyId,
    verifierPolicy: pack.verifierPolicy.policyId,
    authority:
      'Synthetic school training only; competent authority issues driving licences',
  }));

export function runDrivingSchoolGalleryJourney(
  id: DrivingSchoolJourneyId,
): DrivingSchoolJourneyResult {
  return runDrivingSchoolJourney(id);
}
