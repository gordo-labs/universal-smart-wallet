export default function PrivacyPage() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">04 · Privacy roadmap</p>
        <h1>Privacy & ZK</h1>
        <p>
          ZK-ready by interface first; privacy-native execution when needed.
        </p>
      </header>
      <section className="prose">
        <h2>What goes on-chain</h2>
        <p>
          Only a proof result, commitment, nullifier, issuer/schema version,
          audience, consumer, chain ID and expiry. The VC and sensitive claims
          remain in the wallet or private verifier channel.
        </p>
        <h2>Proof envelope</h2>
        <pre>
          {
            'proofSystem · circuitId · issuerKeyId\nschemaHash · audience · consumer · chainId\nnonce · expiry · nullifier · proof'
          }
        </pre>
        <p>
          This envelope is chain-agnostic. A verifier can be deployed on Base
          first, then Scroll, without coupling the credential domain to either
          chain.
        </p>
        <h2>Roadmap</h2>
        <ol>
          <li>
            <strong>Now:</strong> off-chain VC verification and minimal
            commitments on Base Sepolia.
          </li>
          <li>
            <strong>Next:</strong> the same verifier and fixtures on Scroll
            Sepolia.
          </li>
          <li>
            <strong>Future:</strong> an isolated Aztec/Noir adapter for private
            state and local predicate proofs.
          </li>
        </ol>
        <div className="callout">
          <strong>Important</strong>
          <span>
            A ZK rollup proves transaction execution; it does not automatically
            make EVM calldata, events or storage private.
          </span>
        </div>
      </section>
    </>
  );
}
