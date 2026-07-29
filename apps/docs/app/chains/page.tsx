export default function ChainsPage() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">06 · Deployment policy</p>
        <h1>Base → Scroll</h1>
        <p>
          Ship on the compatible chain first, then validate a second zkEVM lane.
        </p>
      </header>
      <section className="prose">
        <div className="chain-card selected">
          <div>
            <span className="pill">INITIAL</span>
            <h2>Base Sepolia</h2>
          </div>
          <p>
            Best fit for the current Safe/ERC-4337/EIP-1271 surface and
            EAS-compatible attestations. Keep VC data off-chain; publish only
            minimal commitments.
          </p>
        </div>
        <div className="chain-card">
          <div>
            <span className="pill muted">FOLLOW-UP</span>
            <h2>Scroll Sepolia</h2>
          </div>
          <p>
            First security/portability lane for the same Solidity verifier.
            Re-run deployment, bytecode, EntryPoint and chain-ID checks; do not
            assume EVM semantics are identical.
          </p>
        </div>
        <h2>Deployment invariants</h2>
        <ul>
          <li>Explicit chain ID and RPC configuration; Anvil is local-only.</li>
          <li>Exact contract and EntryPoint code hashes per network.</li>
          <li>One proof envelope and policy model across chains.</li>
          <li>
            No credential, PII or recovery secret in calldata, events or
            fixtures.
          </li>
        </ul>
        <p className="note">
          Production deployment remains out of scope until independent
          security/privacy review.
        </p>
      </section>
    </>
  );
}
