# STATUS — Sovereign Smart Wallet

## Current

- **Lifecycle:** planning; executable monorepo foundation and public governance baseline complete on task branches.
- **Feasibility:** high for a synthetic local/testnet vertical slice; medium for
  a production wallet until conformance, recovery, browser portability,
  privacy, and independent security review are complete.
- **Architecture:** off-chain credential core, encrypted local vault,
  replaceable OpenID4VC and SD-JWT adapters, smart-account control plane, and
  optional on-chain attestations.
- **Execution:** 28 atomic tasks with explicit dependencies, parallel waves,
  acceptance criteria, validation, and agent prompts. `SSW-001`–`SSW-009`,
  `SSW-015`–`SSW-019` are Done.
- **GitHub:** the public repository is at
  `gordo-labs/sovereign-smart-wallet`. This is repository publication only,
  not an alpha release or production-readiness claim.
- **Codex:** primary thread `019fad60-2d17-7512-acaf-0c740b4a670a`, titled
  “Sovereign Smart Wallet — proyecto y orquestación”, working exclusively in
  this repository from the saved parent project `clawd`.

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

1. `SSW-010` — OpenID4VP and DCQL presentation flow (implementation on `feat/SSW-010-openid4vp-flow`).
2. `SSW-011` — synthetic OpenID4VCI issuer demo (in progress on `feat/SSW-011-issuer-demo`).
3. `SSW-020` — issuer trust and credential status/revocation.
