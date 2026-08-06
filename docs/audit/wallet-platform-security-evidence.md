# Wallet Platform security and integration evidence (SSW-047)

Date: 2026-08-04 · mode: local/offline · data: synthetic fixtures only

## Gate result

`node scripts/verify-platform.mjs` is the deterministic integration command. It
builds the monorepo, executes the platform vertical slice, runs every platform
module suite, the existing security suite, Foundry tests, and the redaction scan.

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Supported flows pass from a clean local build | PASS | platform test; auth, store, DID, signer, asset, portability and service suites; `pnpm build` |
| Abuse and provider-failure cases fail closed | PASS | OTP replay/limits, OIDC issuer/audience/nonce/SSRF, tenant isolation, signer escalation/replay, calldata/simulation, migration tamper, and outage tests |
| Artifacts contain no secrets/PII | PASS | `pnpm test:security` redaction scan over generated artifacts |

The gate does not claim an independent audit, mainnet safety, hosted-provider
availability, or a testnet release. External Base/Scroll RPC, bundler,
paymaster, SMTP, OIDC, issuer and verifier integrations remain opt-in.

## Security coverage map

- Tenant escape: `@ssw/platform-store`, wallet-service tests.
- OTP abuse and delivery outage: `@ssw/auth-email` tests.
- OIDC confusion and SSRF: `@ssw/auth-oidc` tests.
- Signer escalation, replay and store outage: `@ssw/signer-policy` tests.
- Malicious calldata and simulation failure: `@ssw/wallet-actions` tests.
- Migration tamper, expiry, downgrade and rollback: `@ssw/wallet-portability` tests.
- Private DID disclosure boundary: `tests/platform/platform-e2e.test.mjs` and
  `@ssw/identity-adapter` tests.

## Known gates

SSW-025 now has a pinned Base Sepolia smoke deployment and a passing configured
testnet matrix; the deployment is explicitly fixture-only and not a production
Safe account. SSW-027 release publication remains blocked pending explicit
approval; this evidence does not create a tag or release.
