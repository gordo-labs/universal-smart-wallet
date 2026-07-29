# STATUS — Sovereign Smart Wallet

## Current

- **Lifecycle:** planning; no executable product yet.
- **Feasibility:** high for a synthetic local/testnet vertical slice; medium for
  a production wallet until conformance, recovery, browser portability,
  privacy, and independent security review are complete.
- **Architecture:** off-chain credential core, encrypted local vault,
  replaceable OpenID4VC and SD-JWT adapters, smart-account control plane, and
  optional on-chain attestations.
- **Execution:** 28 atomic tasks with explicit dependencies, parallel waves,
  acceptance criteria, validation, and agent prompts.
- **GitHub:** no local project or accessible
  `gordo-labs/sovereign-smart-wallet` repository existed at review time. The
  public remote is planned but not created.

## Decisions promoted on 2026-07-29

- Use a derived `is_over_18` credential claim for the MVP; selective disclosure
  alone cannot prove a hidden numerical predicate.
- Keep SD-JWT VC behind a pinned adapter because its credential profile remains
  an IETF Internet-Draft.
- Keep ERC-7579 behind a pinned adapter because the ERC remains Draft.
- Prefer a maintained smart-account implementation; Safe is the leading
  candidate for the spike because it has documented passkey, ERC-4337, ERC-1271,
  and ERC-7579 adapter paths.
- Do not make DID resolution or blockchain infrastructure a dependency of the
  local issuer-wallet-verifier test suite.
- WebAuthn PRF can wrap a vault key when supported, but recovery-passphrase and
  non-PRF behavior must be designed and tested.

## Next

1. `SSW-001` — executable monorepo foundation.
2. `SSW-003` — standards and dependency pinning spike.
3. `SSW-002` — public GitHub bootstrap after explicit publication approval.
