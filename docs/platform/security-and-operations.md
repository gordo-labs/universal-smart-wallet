# Security and operations limits

The security gate is recorded in
[`docs/audit/wallet-platform-security-evidence.md`](../audit/wallet-platform-security-evidence.md)
and the trust boundaries in
[`docs/threat-model/wallet-platform-trust-boundaries.md`](../threat-model/wallet-platform-trust-boundaries.md).

Run `pnpm test:security` and inspect `pnpm verify:rc`. Covered failures include
tenant escape, OTP abuse, OIDC SSRF/state confusion, signer escalation,
replay, malicious calldata, webhook forgery, migration tamper, secret/PII
leakage and wrong chain/code hashes.

Known gates remain visible:

- SSW-025 needs an explicitly configured non-local testnet acceptance run;
  Anvil is local-only.
- SSW-027 alpha publication needs human approval and a final candidate. No
  tag, release or push is implied by local evidence.
- No independent audit, production readiness, mainnet support or ZK privacy
  guarantee is claimed.
