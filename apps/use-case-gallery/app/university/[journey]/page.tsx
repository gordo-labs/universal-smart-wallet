import {
  UNIVERSITY_PACKS,
  runUniversityJourney,
  type UniversityJourneyId,
} from '@ssw/institutional-use-cases';

export function generateStaticParams() {
  return Object.keys(UNIVERSITY_PACKS).map((journey) => ({ journey }));
}

export default async function UniversityJourneyPage({
  params,
}: {
  readonly params: Promise<{ journey: string }>;
}) {
  const { journey } = await params;
  if (!(journey in UNIVERSITY_PACKS)) return <main><h1>University journey not found</h1></main>;
  const result = runUniversityJourney(journey as UniversityJourneyId);
  const pack = UNIVERSITY_PACKS[journey as UniversityJourneyId];
  return <main><h1>{pack.title}</h1><p>Result: {result.status}</p><p>Template: {pack.template.type}</p><p>Assurance: {pack.template.assurance}</p><p>Authority: {pack.authority.notes.join(' ')}</p><h2>Disclosed claims</h2><ul>{Object.entries(result.disclosedClaims).map(([name, value]) => <li key={name}>{name}: {value}</li>)}</ul></main>;
}
