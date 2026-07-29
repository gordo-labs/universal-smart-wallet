# SSW-024 adversarial and redaction evidence

This document records reproducible evidence for the initial security review
threats. All inputs are synthetic and local; no hosted issuer, verifier, RPC,
bundler, paymaster, resolver, or trust registry is contacted.

| Threat boundary | Automated evidence | Failure semantics |
| --- | --- | --- |
| JOSE algorithm/profile, holder binding, disclosure and nonce mutation | `tests/security/adversarial.test.mjs` JOSE mutation test plus `packages/sd-jwt-adapter/test/adapter.test.mjs` | Every mutated issuer or key-binding segment rejects; wrong nonce is explicit |
| Replay and challenge races | Deterministic 32-seed replay property test | A challenge is consumed once; unknown, expired, wrong-audience, and storage failures fail closed |
| Vault theft, corruption, and rollback | AES-GCM tamper property and encrypted-backup monotonicity tests | No partial plaintext is returned; ciphertext-only backups contain no claims; old sequence is rejected |
| Recovery and malicious modules | Recovery threshold/timelock and module-policy tests; Foundry invariants | Duplicate approvals are idempotent; unauthorized/unsafe module policy and early recovery reject |
| Issuer trust and status | Unknown issuer, stale status, malformed transport, and SSRF tests | Unknown, stale, unavailable, revoked, and private-host responses are never silently valid |
| Consent, phishing, and privacy | Wallet sanitizer and verifier privacy-error tests | HTML/control text is not trusted; denial and claim mismatch expose only stable generic errors |
| On-chain attestation replay and scope | `contracts/test/AdversarialFuzz.t.sol` | 256 reproducible fuzz runs cover nonce one-shot and signed subject binding |
| Logs, traces, and generated artifacts | `tests/security/redaction-scan.mjs` | CI fails on key material, JWTs, private/secret fields, or direct PII fields |

## Reproduction

```text
pnpm test:security
```

The command builds every workspace, runs the deterministic Node security suite,
runs Foundry unit/fuzz/invariant tests, and scans generated bundles and test
artifacts. Foundry's configured seed and the Node loops provide stable failing
inputs; a failure must retain the reported seed before being changed.

No production credentials, valuable assets, undisclosed claims, or real PII
are used by this evidence suite.
