# Security Policy

## Project maturity

Sovereign Smart Wallet is experimental and has not been independently audited.
Do not use it for production identity credentials, personal data, mainnet
assets, or decisions with legal or financial effect.

## Reporting

The public GitHub repository has not yet been created. Until it exists, do not
publish exploit details in a public issue. After publication, enable GitHub
private vulnerability reporting and replace this paragraph with the verified
reporting URL and response policy.

## Non-negotiable boundaries

- Synthetic data and local/testnet networks only.
- No credential or PII on-chain.
- No secrets or private key material in source, logs, fixtures, screenshots, or
  issue attachments.
- No custom cryptographic primitives.
- External network dependencies must be optional in tests.
- Security claims require evidence and the review gates in
  `working/procedures/SECURITY-REVIEW.md`.
