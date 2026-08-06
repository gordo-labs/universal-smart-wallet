export default function TestingPage() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">05 · Quality and security</p>
        <h1>Testing</h1>
        <p>
          Every privacy and authorization boundary has a deterministic failure
          case.
        </p>
      </header>
      <section className="prose">
        <h2>Fast checks</h2>
        <div className="command-grid">
          <code>pnpm test</code>
          <span>Unit smoke suite.</span>
          <code>pnpm test:security</code>
          <span>Adversarial Node, Foundry and redaction checks.</span>
          <code>pnpm e2e:local</code>
          <span>Issuer → wallet → verifier with restart and recovery.</span>
          <code>pnpm verify:rc</code>
          <span>Release gate; testnet is explicit opt-in.</span>
        </div>
        <h2>Edge and adversarial cases</h2>
        <ul>
          <li>
            Replay, duplicate nonce, expired presentation and stale status.
          </li>
          <li>
            Wrong audience, scope escalation, holder mismatch and attestor
            rotation.
          </li>
          <li>
            Ambiguous verifier, unsafe origin, consent cancellation and
            over-disclosure.
          </li>
          <li>
            Corrupt vault ciphertext, wrong key, backup tampering and recovery
            failure.
          </li>
          <li>
            Malformed SD-JWT/OpenID4VC messages, unsafe text and secret/PII
            redaction.
          </li>
          <li>
            Signature failure, wrong chain/EntryPoint, code-hash mismatch and
            rejected testnet configuration.
          </li>
        </ul>
        <p>A local pass is not a testnet pass or production approval.</p>
      </section>
    </>
  );
}
