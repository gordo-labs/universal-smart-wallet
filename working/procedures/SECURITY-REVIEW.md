# Security review

## Review layers

1. **Per task:** mapped negative tests and no new unbounded parser/network path.
2. **Per wave:** dependency, secret, license, and regression checks.
3. **Vertical slice:** phishing, replay, issuer compromise, stale status, vault
   corruption, and holder-binding test scenarios.
4. **Account slice:** passkey loss, signer rotation, malicious module,
   EntryPoint mismatch, bundler/paymaster outage, and recovery drill.
5. **Release candidate:** threat model evidence, fuzz/property suite, SBOM,
   deployment/code-hash inventory, privacy review, and independent review pack.

## Mandatory failure semantics

- Unknown issuer or algorithm: reject.
- Invalid/expired/stale status: reject or report an explicit unavailable state;
  never silently accept.
- Reused nonce/state: reject atomically.
- Unsupported PRF: use the documented fallback; never store a wrapping key in
  plaintext.
- Resolver/RPC/bundler/paymaster outage: isolate to the dependent feature and
  keep local credential tests green.
- Corrupt vault/authentication tag: stop and offer recovery; never return
  partial plaintext.

## Evidence

Every security claim links to a test, code path, pinned dependency, or review
artifact. “Uses blockchain”, “uses passkeys”, and “uses encryption” are not
security evidence.
