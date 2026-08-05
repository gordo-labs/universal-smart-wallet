import {
  DRIVING_SCHOOL_PACKS,
  runDrivingSchoolJourney,
  type DrivingSchoolJourneyId,
} from '@ssw/institutional-use-cases';

export default async function DrivingSchoolJourneyPage({
  params,
}: {
  readonly params: Promise<{ journey: string }>;
}) {
  const { journey } = await params;
  if (!(journey in DRIVING_SCHOOL_PACKS))
    return <main><h1>Driving-school journey not found</h1></main>;
  const id = journey as DrivingSchoolJourneyId;
  const pack = DRIVING_SCHOOL_PACKS[id];
  const result = runDrivingSchoolJourney(id);
  return (
    <main>
      <h1>{pack.title}</h1>
      <p>Result: {result.status}</p>
      <p>Template: {pack.template.type}</p>
      <p>Assurance: {pack.template.assurance}</p>
      <p>Authority: {pack.authority.notes.join(' ')}</p>
      <p>Licence boundary: school training never issues a driving licence.</p>
      <h2>Disclosed claims</h2>
      <ul>
        {Object.entries(result.disclosedClaims).map(([name, value]) => (
          <li key={name}>{name}: {String(value)}</li>
        ))}
      </ul>
    </main>
  );
}
