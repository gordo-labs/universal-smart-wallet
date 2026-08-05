import {
  GOVERNMENT_PACKS,
  runGovernmentJourney,
  type GovernmentJourneyId,
} from '@ssw/institutional-use-cases';

export function generateStaticParams() {
  return Object.keys(GOVERNMENT_PACKS).map((journey) => ({ journey }));
}

export default async function GovernmentJourneyPage({
  params,
}: {
  readonly params: Promise<{ journey: string }>;
}) {
  const { journey } = await params;
  if (!(journey in GOVERNMENT_PACKS))
    return <main><h1>Government journey not found</h1></main>;
  const id = journey as GovernmentJourneyId;
  const result = runGovernmentJourney(id);
  const pack = GOVERNMENT_PACKS[id];
  return <main>
    <h1>{pack.title}</h1>
    <p>Result: {result.status}</p>
    <p>Authority: {pack.authority.authorityType}</p>
    <p>Jurisdiction: {pack.authority.jurisdiction}</p>
    <p>Assurance policy: {pack.verifierPolicy.assuranceLabels.join(', ')}</p>
    <p>Legal status: synthetic policy only; no legal or certification claim.</p>
    <h2>Disclosed synthetic claims</h2>
    <ul>{Object.entries(result.disclosedClaims).map(([name, value]) => <li key={name}>{name}: {value}</li>)}</ul>
  </main>;
}
