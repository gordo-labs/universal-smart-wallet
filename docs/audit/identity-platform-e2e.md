# Institutional identity E2E gate evidence

Generated: 2026-08-05T22:35:24.553Z

This is synthetic, local evidence only. It is not a certification, legal approval, or production-readiness claim.

## Required flows

- PASS — issuer-wallet-verifier
- PASS — all-format-adapters
- PASS — scanner-online
- PASS — scanner-offline
- PASS — mobile-wallet
- PASS — sector-university
- PASS — sector-government
- PASS — sector-driving-school
- PASS — sector-enterprise
- PASS — redaction-artifacts

## Determinism and security

- Two complete runs produced identical summaries.
- Online and offline scanner paths were exercised without network access.
- Offline freshness, signed snapshot, and replay rejection were exercised.
- Artifact scan found no private keys, credentials, PII fields, or secrets.

## Artifacts checked

- `docs/audit/identity-platform-e2e.md`
- `scripts/verify-identity-platform.mjs`
- `tests/identity-platform/e2e.test.mjs`
- `tests/identity-platform/fixtures.mjs`

## Exact command

```text
node scripts/verify-identity-platform.mjs
```
