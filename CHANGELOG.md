# Changelog

All notable changes to Sovereign Smart Wallet are documented here. The
project follows a pre-release version convention until an independently
reviewed production policy exists.

## [0.1.0-alpha.1] — prepared, not published

Release candidate source: `de994c6cf3db82158b3118e9c3f7cc1b501fda07`

This is a release preparation record. No tag, GitHub Release, or testnet
deployment has been published. Publication remains blocked on explicit owner
approval and completion of the opt-in testnet lane.

### Added

- Deterministic local issuer → encrypted wallet → verifier vertical slice.
- OpenID4VCI issuance and OpenID4VP minimal disclosure using synthetic
  `is_over_18` fixtures.
- Passkey-controlled account adapters, encrypted vault recovery, replay and
  expiry checks, provider-outage handling, and opt-in on-chain attestations.
- Release-candidate evidence for SBOM/licenses, dependency locking, contract
  source hashes, secret redaction, and adversarial/recovery scenarios.

### Verification

```text
pnpm verify:rc
expected local result: LOCAL_PASS_TESTNET_NOT_REQUESTED
```

The local result is not alpha-testnet approval. Reproduce an archive and its
checksum from the exact source commit with the commands in
[`.github/RELEASE-CHECKLIST.md`](.github/RELEASE-CHECKLIST.md).

### Boundaries

- Synthetic credentials and local Anvil are the default and only guaranteed
  environment.
- Explicitly configured EVM testnets are opt-in; mainnet is prohibited.
- No production identity, custody, valuable assets, legal/financial decision,
  audit, compliance, EUDI, KYC, or browser portability claim is made.

## [Unreleased]

Reserved for changes after the alpha preparation source commit. Do not append
changes to the alpha entry after a tag is published; cut a new version.
