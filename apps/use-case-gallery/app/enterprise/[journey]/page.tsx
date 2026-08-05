import {
  ENTERPRISE_PACKS,
  runEnterpriseJourney,
  type EnterpriseJourneyId,
} from '@ssw/institutional-use-cases';

export function generateStaticParams() {
  return Object.keys(ENTERPRISE_PACKS).map((journey) => ({ journey }));
}

export default async function EnterpriseJourneyPage({
  params,
}: {
  readonly params: Promise<{ journey: string }>;
}) {
  const { journey } = await params;
  if (!(journey in ENTERPRISE_PACKS))
    return <main><h1>Enterprise journey not found</h1></main>;
  const result = runEnterpriseJourney(journey as EnterpriseJourneyId);
  const pack = ENTERPRISE_PACKS[journey as EnterpriseJourneyId];
  return <main>
    <h1>{pack.title}</h1>
    <p>Result: {result.status} ({result.reasonCode})</p>
    <p>Tenant: {pack.verifierPolicy.tenantId}</p>
    <p>Template: {pack.template.type}</p>
    <p>Assurance: {pack.template.assurance}</p>
    <p>Authority: {pack.authority.notes.join(' ')}</p>
    {result.representationScope ? <p>Representation scope: {result.representationScope}</p> : null}
    <h2>Disclosed synthetic claims</h2>
    <ul>{Object.entries(result.disclosedClaims).map(([name, value]) => <li key={name}>{name}: {value}</li>)}</ul>
  </main>;
}
