import Link from 'next/link';

const pages: Record<
  string,
  { title: string; intro: string; source: string; bullets: string[] }
> = {
  'sdk-reference': {
    title: 'Identity SDK reference',
    intro: 'Public methods and their passing test evidence.',
    source: 'docs/identity-platform/sdk-reference.md',
    bullets: [
      'Shared browser/server transport and redacted errors.',
      'Tenant-scoped issuer lifecycle and single-use OpenID4VCI operations.',
      'Holder consent, verifier receipts and side-effect-free scanner orchestration.',
    ],
  },
  'protocols-formats': {
    title: 'Protocols and formats',
    intro: 'Version-pinned protocol boundaries with explicit limitations.',
    source: 'docs/identity-platform/protocols-formats.md',
    bullets: [
      'OpenID4VCI and OpenID4VP are adapters, not certification claims.',
      'SD-JWT VC, ISO mdoc and W3C VC Data Integrity remain replaceable formats.',
      'Offline trust failures remain indeterminate and never silently valid.',
    ],
  },
  examples: {
    title: 'Executable example index',
    intro: 'Tests are the source of truth for every documented public method.',
    source: 'docs/identity-platform/examples.md',
    bullets: [
      'Run the identity SDK and credential scanner test suites locally.',
      'OpenAPI path and issuer operation drift checks fail before docs can drift.',
      'Fixtures use synthetic values and injected ports only.',
    ],
  },
  'operator-handoff': {
    title: 'Identity operator handoff',
    intro: 'Runbook, tested examples, sector boundaries and explicit claims limits.',
    source: 'docs/identity-platform/operator-handoff.md',
    bullets: [
      'Issuer, holder, verifier, scanner and mobile journeys map to passing local evidence.',
      'KMS/HSM, signed trust, offline freshness and sector authority boundaries are explicit.',
      'EUDI/HAIP readiness is evidence-driven; no certification, legal or production claim is made.',
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export default async function IdentityGuide({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = pages[slug] ?? pages['sdk-reference'];
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">08 · Institutional identity</p>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
      </header>
      <section className="prose">
        <ul>
          {page.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
        <p>
          Canonical guide: <code>{page.source}</code>
        </p>
        <Link className="button" href="/identity">
          ← Identity overview
        </Link>
      </section>
    </>
  );
}
