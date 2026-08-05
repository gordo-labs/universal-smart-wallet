# STATUS — Sovereign Smart Wallet

## Current

- **Lifecycle:** local alpha foundation complete; external testnet/release gates remain explicitly blocked.
- **Feasibility:** high for a synthetic local/testnet vertical slice; medium for
  a production wallet until conformance, recovery, browser portability,
  privacy, and independent security review are complete.
- **Architecture:** off-chain credential core, encrypted local vault,
  replaceable OpenID4VC and SD-JWT adapters, smart-account control plane, and
  optional on-chain attestations.
- **Execution:** 79 atomic tasks with explicit dependencies, parallel waves,
  acceptance criteria, validation, and agent prompts. `SSW-001`–`SSW-013`,
  `SSW-015`–`SSW-024`, `SSW-026`, `SSW-028`–`SSW-048` are Done. `SSW-025` has a
  passing local RC gate but remains blocked on explicit testnet configuration;
  `SSW-027` remains blocked on human release approval. `SSW-049`–`SSW-056` are
  Done and extend the platform through generalized credential formats,
  trust/status, institutional signing, issuer, self-issued, and verifier
  services. `SSW-057`–`SSW-079` are documented atomic prompts for the remaining
  SDK, admin, holder, scanner, mobile, sector, security, conformance, and
  documentation work; none is currently executing.
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

1. `SSW-025` — configure a disposable non-local testnet with pinned RPC,
   deployments, and runtime hashes before marking alpha-testnet green.
2. `SSW-027` — release evidence is prepared but publication is blocked pending
   explicit release approval and final candidate selection.
3. Documentation is complete in `docs/platform/` and the Next.js `/platform`
   section; run the documented checks after any implementation change.
4. Assign `SSW-057`–`SSW-079` from the institutional identity execution plan,
   one generated prompt per subagent and only after its dependencies are Done.
