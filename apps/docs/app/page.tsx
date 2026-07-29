import Link from 'next/link';
const sections = [
  {
    href: '/architecture',
    number: '01',
    title: 'Architecture',
    text: 'Issuer, wallet, verifier and smart-account boundaries.',
  },
  {
    href: '/credentials',
    number: '02',
    title: 'Credentials',
    text: 'OpenID4VCI, OpenID4VP, SD-JWT VC and encrypted vault.',
  },
  {
    href: '/smart-account',
    number: '03',
    title: 'Smart account',
    text: 'Passkeys, ERC-1271, ERC-4337 and recovery.',
  },
  {
    href: '/privacy',
    number: '04',
    title: 'Privacy & ZK',
    text: 'Data minimisation now and predicate-proof roadmap.',
  },
  {
    href: '/testing',
    number: '05',
    title: 'Testing',
    text: 'Deterministic flows, adversarial cases and release gates.',
  },
  {
    href: '/chains',
    number: '06',
    title: 'Base → Scroll',
    text: 'Deployment policy and a second zkEVM lane.',
  },
];
export default function HomePage() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Project documentation · v0.1 alpha foundation</p>
        <h1>
          Credentials stay private.
          <br />
          <span>Authorization stays verifiable.</span>
        </h1>
        <p className="lede">
          Sovereign Smart Wallet is an open-source passkey wallet for
          privacy-preserving verifiable credentials and smart-account
          authorization.
        </p>
        <div className="hero-actions">
          <Link className="button primary" href="/architecture">
            Read the architecture
          </Link>
          <Link className="button" href="/testing">
            See the test surface
          </Link>
        </div>
      </section>
      <div className="callout">
        <strong>Current scope</strong>
        <span>
          Synthetic credentials · local Anvil · explicitly configured EVM
          testnets · no mainnet assets or production claims.
        </span>
      </div>
      <section className="section-grid">
        {sections.map((section) => (
          <Link className="section-card" href={section.href} key={section.href}>
            <span className="card-number">{section.number}</span>
            <h2>
              {section.title} <span>↗</span>
            </h2>
            <p>{section.text}</p>
          </Link>
        ))}
      </section>
      <section className="prose compact">
        <h2>One vertical slice, deliberately bounded</h2>
        <p>
          The validated flow is issuer → wallet → verifier: issue a synthetic
          SD-JWT VC, encrypt it in the browser, approve the smallest OpenID4VP
          disclosure, verify it off-chain, then authorise access. The smart
          account is the control plane; identity data is not an on-chain
          database.
        </p>
      </section>
    </>
  );
}
