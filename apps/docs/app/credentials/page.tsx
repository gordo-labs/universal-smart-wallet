export default function CredentialsPage() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">02 · Verifiable credentials</p>
        <h1>Credentials</h1>
        <p>
          Minimal disclosure, explicit consent, deterministic local exchanges.
        </p>
      </header>
      <section className="prose">
        <h2>Issuance</h2>
        <p>
          The synthetic issuer exposes a pre-authorized OpenID4VCI flow. The
          wallet parses and reviews the offer before accepting it. Issued
          credentials are encrypted; demo fixtures never contain real identity
          data.
        </p>
        <h2>Presentation</h2>
        <p>
          OpenID4VP requests map to DCQL policy. The wallet selects matching
          credentials, renders exact claims, and blocks ambiguous or unsafe
          verifier requests. Verification checks trust, holder binding, status,
          scope, expiry and replay.
        </p>
        <div className="rule-grid">
          <div>
            <b>Allowed</b>
            <span>
              Derived claim such as <code>is_over_18: true</code>
            </span>
          </div>
          <div>
            <b>Never on-chain</b>
            <span>Full VC, date of birth, name, email or raw PII</span>
          </div>
          <div>
            <b>Versioned</b>
            <span>SD-JWT VC and ERC-7579 remain pinned adapters</span>
          </div>
        </div>
        <h2>Consent contract</h2>
        <p>
          Every presentation has a named verifier, purpose, requested claims,
          expiry and trust level. Approval is unavailable when identity is
          ambiguous, origin is unsafe or disclosure exceeds policy.
        </p>
      </section>
    </>
  );
}
