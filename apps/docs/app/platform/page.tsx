import Link from 'next/link';

const guides = [
  ['TypeScript and React SDK', 'Compose browser/server clients and React bindings.', 'typescript-sdk.md'],
  ['REST API', 'Run the tenant-scoped self-hosted service.', 'rest-api.md'],
  ['Self-hosting and portability', 'Email custody, OIDC, migration and vendor rotation.', 'self-hosting.md'],
  ['Apps and use cases', 'Consumer wallet, admin console and executable gallery.', 'apps-and-use-cases.md'],
  ['Security and operations', 'Threat boundaries, release gates and explicit limits.', 'security-and-operations.md'],
] as const;

export default function PlatformPage() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">07 · Wallet Platform</p>
        <h1>Build your own service.</h1>
        <p>Install only the modules you need, keep custody portable and verify every sensitive transition.</p>
      </header>
      <section className="prose">
        <div className="section-grid">
          {guides.map(([title, text, href]) => (
            <Link className="section-card" href={`/platform/${href.replace('.md', '')}`} key={href}>
              <h2>{title} <span>↗</span></h2>
              <p>{text}</p>
            </Link>
          ))}
        </div>
        <h2>Control model</h2>
        <p>Passkey or recovery evidence controls the wallet. Email and social sessions are revocable operational signers, never irreversible owners. Credential data and PII remain outside service databases and chain payloads.</p>
        <div className="warning"><strong>Alpha boundary</strong><span>Use synthetic fixtures and local Anvil or explicitly configured testnets. This is not a production, audit or mainnet approval.</span></div>
      </section>
    </>
  );
}
