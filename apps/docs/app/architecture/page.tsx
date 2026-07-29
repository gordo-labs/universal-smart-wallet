export default function ArchitecturePage() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">01 · System design</p>
        <h1>Architecture</h1>
        <p>Replaceable adapters around a small, testable credential core.</p>
      </header>
      <div className="diagram">
        <div className="diagram-row">
          <div className="node">
            <b>Issuer</b>
            <small>
              OpenID4VCI
              <br />
              SD-JWT VC
            </small>
          </div>
          <i>offer</i>
          <div className="node wallet">
            <b>Wallet</b>
            <small>
              consent · vault
              <br />
              OpenID4VP
            </small>
          </div>
          <i>presentation</i>
          <div className="node">
            <b>Verifier</b>
            <small>
              DCQL policy
              <br />
              trust + status
            </small>
          </div>
        </div>
        <div className="diagram-row lower">
          <div className="node account">
            <b>Smart account</b>
            <small>
              passkey · ERC-1271
              <br />
              ERC-4337 adapter
            </small>
          </div>
          <i>authorises</i>
          <div className="node chain">
            <b>Base / Scroll</b>
            <small>
              commitments only
              <br />
              optional attestations
            </small>
          </div>
        </div>
      </div>
      <section className="prose">
        <h2>Boundaries</h2>
        <ul>
          <li>
            <strong>Credential domain:</strong> schemas, nonce/replay, holder
            binding, expiry and verification.
          </li>
          <li>
            <strong>Adapters:</strong> OpenID4VCI/VP, SD-JWT VC, identity/DID
            and account implementations remain replaceable.
          </li>
          <li>
            <strong>Vault:</strong> encrypted browser storage with passkey PRF
            as an optional key wrapper and recovery backup.
          </li>
          <li>
            <strong>Chain:</strong> authorization and timestamping plane, never
            a place to publish a full VC or PII.
          </li>
        </ul>
        <h2>Repository map</h2>
        <p>
          <code>packages/credential-domain</code> owns rules;{' '}
          <code>packages/credential-vault</code> owns encrypted storage; issuer,
          wallet and verifier demos prove the local flow. Foundry contracts live
          under <code>contracts/</code>.
        </p>
      </section>
    </>
  );
}
