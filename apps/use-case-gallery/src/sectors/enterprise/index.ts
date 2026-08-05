import {
  ENTERPRISE_PACKS,
  runEnterpriseJourney,
  type EnterpriseJourneyId,
  type EnterpriseJourneyResult,
} from '@ssw/institutional-use-cases';

export type EnterpriseGalleryCase = {
  readonly id: EnterpriseJourneyId;
  readonly title: string;
  readonly path: string;
  readonly issuerPolicy: string;
  readonly verifierPolicy: string;
  readonly tenantId: string;
  readonly scope?: string;
};

export const ENTERPRISE_GALLERY_CASES: readonly EnterpriseGalleryCase[] =
  Object.values(ENTERPRISE_PACKS).map((pack) => ({
    id: pack.id,
    title: pack.title,
    path: `/enterprise/${pack.id}`,
    issuerPolicy: pack.issuerPolicy.policyId,
    verifierPolicy: pack.verifierPolicy.policyId,
    tenantId: pack.verifierPolicy.tenantId,
    ...(pack.id === 'representation'
      ? { scope: pack.fixture.claims.representationScope }
      : {}),
  }));

export function runEnterpriseGalleryJourney(
  id: EnterpriseJourneyId,
  options: Parameters<typeof runEnterpriseJourney>[1] = {},
): EnterpriseJourneyResult {
  return runEnterpriseJourney(id, options);
}
