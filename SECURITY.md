# Security Policy

## Project maturity

Universal Smart Wallet is experimental and has not been independently audited.
Do not use it for production identity credentials, personal data, mainnet
assets, or decisions with legal or financial effect.

The SSW-026 review packet in
[`docs/audit/SSW-026-review-packet.md`](docs/audit/SSW-026-review-packet.md)
lists reproducible evidence and open gaps; it is not an independent audit.

## Reporting

Report suspected vulnerabilities through
[GitHub private vulnerability reporting](https://github.com/gordo-labs/universal-smart-wallet/security/advisories/new).
Do not publish exploit details in a public issue. Maintainers aim to
acknowledge a private report within five business days; remediation timelines
depend on severity and project maturity.

## Non-negotiable boundaries

- Synthetic data and local/testnet networks only.
- No credential or PII on-chain.
- No secrets or private key material in source, logs, fixtures, screenshots, or
  issue attachments.
- No custom cryptographic primitives.
- External network dependencies must be optional in tests.
- Security claims require the evidence and review gates documented under
  `docs/audit/`.
