import Link from 'next/link';

const guides = [
  [
    'SDK reference',
    'Issuer, holder, verifier, scanner and shared transport methods.',
    '/identity/sdk-reference',
  ],
  [
    'Protocols and formats',
    'OpenID4VCI, OpenID4VP, scanner grammar, offline envelopes and format limits.',
    '/identity/protocols-formats',
  ],
  [
    'Executable examples',
    'The tests that keep public examples and OpenAPI contracts in lockstep.',
    '/identity/examples',
  ],
  [
    'Operator handoff',
    'Issuer, holder, verifier, scanner, mobile, sector, offline and EUDI boundaries.',
    '/identity/operator-handoff',
  ],
] as const;

export default function IdentityPage() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">08 · Institutional identity</p>
        <h1>Build with verifiable credentials.</h1>
        <p>
          Format-neutral TypeScript boundaries for issuers, holders, verifiers
          and QR integrations.
        </p>
      </header>
      <section className="prose">
        <div className="section-grid">
          {guides.map(([title, text, href]) => (
            <Link className="section-card" href={href} key={href}>
              <h2>
                {title} <span>↗</span>
              </h2>
              <p>{text}</p>
            </Link>
          ))}
        </div>
        <h2>Current boundary</h2>
        <p>
          The SDK carries bounded protocol messages and explicit consent. It
          does not custody issuer keys, open scanned URLs, access cameras,
          implement cryptographic primitives, or turn a rollup into a private
          execution environment.
        </p>
        <div className="warning">
          <strong>Alpha boundary</strong>
          <span>
            Use synthetic fixtures and local Anvil or explicitly configured
            testnets. No production, audit, certification or mainnet claim is
            made.
          </span>
        </div>
      </section>
    </>
  );
}
