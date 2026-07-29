# Security Policy

## Project maturity

Sovereign Smart Wallet is experimental and has not been independently audited.
Do not use it for production identity credentials, personal data, mainnet
assets, or decisions with legal or financial effect.

## Reporting

Report suspected vulnerabilities through
[GitHub private vulnerability reporting](https://github.com/gordo-labs/sovereign-smart-wallet/security/advisories/new).
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
- Security claims require evidence and the review gates in
  `working/procedures/SECURITY-REVIEW.md`.
