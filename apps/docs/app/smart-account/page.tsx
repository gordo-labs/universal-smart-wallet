export default function SmartAccountPage() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">03 · Account control</p>
        <h1>Smart account</h1>
        <p>
          Passkey-controlled authorization without putting credential state in
          the account.
        </p>
      </header>
      <section className="prose">
        <h2>Control plane</h2>
        <p>
          The account adapter isolates Safe-compatible account logic from
          credential verification. ERC-1271 signatures bind presentations to the
          holder. ERC-4337 is an opt-in testnet path; bundler and paymaster
          services are never required by local tests.
        </p>
        <h2>Passkeys and recovery</h2>
        <ul>
          <li>WebAuthn PRF is optional, not a browser guarantee.</li>
          <li>
            PRF can wrap a vault key; non-PRF browsers use a recovery-passphrase
            path.
          </li>
          <li>
            Encrypted backup/restore is tested across a simulated wallet
            restart.
          </li>
          <li>
            Recovery and attestor rotation are explicit, auditable transitions.
          </li>
        </ul>
        <div className="warning">
          <strong>Security boundary</strong>
          <span>
            Use reviewed libraries behind narrow adapters. Keep fixtures
            synthetic and never implement cryptography or a smart-account base
            from scratch.
          </span>
        </div>
      </section>
    </>
  );
}
