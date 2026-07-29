# ADR SSW-015 — Safe smart-account boundary and deterministic harness

**Date:** 2026-07-29  
**Status:** Accepted for local account-control implementation  
**Depends on:** [SSW-003](SSW-003-standards-dependency-baseline.md) (`d831f9e`)

## Decision

Select Safe as the maintained smart-account base for the next account tasks.
The wallet integrates Safe through `@safe-global/protocol-kit` `8.0.4` and a
narrow `packages/account-adapter` port. Safe's ERC-1271 validation, ERC-4337
support, and documented passkey signer path meet the MVP control-plane need.
The account itself remains an upstream deployment: this repository does not
implement an account base, P-256 verifier, recovery module, or UserOperation
transport.

EntryPoint is pinned to `0.8.0` at the canonical address from SSW-003. A
consumer must verify chain ID, non-empty bytecode, and the runtime code hash at
startup; an address without those facts is rejected. The local Foundry harness
only proves deterministic deployment and the adapter's metadata checks. It is
not a Safe or EntryPoint deployment and cannot hold assets.

## Safe versus Kernel

| Criterion             | Safe (selected)                                                                      | Kernel (rejected for this spike)                                                 |
| --------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| ERC-1271              | Established Safe account validation path                                             | Available through Kernel validator path                                          |
| ERC-4337              | Documented Safe account-abstraction integrations                                     | Strong ERC-4337 focus, but more versioned plugin surface                         |
| Passkeys              | Safe passkey/signature integrations and ecosystem tooling                            | Passkey validator path exists but requires Kernel-specific validator wiring      |
| Modules/recovery      | Mature owners/modules and documented recovery options; authority must be constrained | Modular validator/executor model; module compatibility must be proven separately |
| Provider independence | Protocol Kit can be wrapped; local adapter owns RPC client port                      | Kernel SDK would likewise need wrapping; no benefit before a local spike         |
| License               | MIT; audit history and public deployment ecosystem                                   | MIT; audit history is version-specific                                           |
| Migration             | Adapter can replace Safe deployment with another ERC-1271 account                    | Requires changing validator, factory, and module assumptions                     |

This is a fit decision, not a security or conformance claim. Versions and
audits must be re-reviewed before a testnet or production deployment.

## Authority and upgrade rules

- Safe singleton/factory and EntryPoint addresses are configuration, never
  user-supplied trust roots. Chain ID and code hash are mandatory.
- Safe owner/threshold authority controls execution and module installation;
  no arbitrary module is enabled by the adapter. Recovery is a later,
  explicitly reviewed task (`SSW-021`).
- Any upgradeable proxy, fallback handler, or module must be pinned and have
  an independent code-hash record. A code-hash change blocks startup.
- ERC-7579 remains an optional Draft adapter (`SSW-018`) and is not installed
  by this task.

## License, audits, and replacement

Safe Protocol Kit is MIT-licensed. Safe contracts and the chosen deployment
must retain their upstream notices; the project makes no claim that an upstream
audit covers this adapter or its configuration. Replacing Safe with Kernel (or
another account) requires an adapter-compatible ERC-1271 test suite, pinned
EntryPoint compatibility, deployment/code-hash records, license review, and a
migration note. Hosted SDK, RPC, bundler, and paymaster clients are forbidden
in core tests; they may only enter an explicit adapter integration.

## Local evidence

`contracts/test/SmartAccountHarness.t.sol` deploys a test-only external-code
fixture through CREATE2, checks the deterministic address and non-zero runtime
code hash, rejects empty init code, and asserts the ERC-1271 boundary plus the
EntryPoint constant. `contracts/deployments.json` records the chain and pin;
the zero EntryPoint hash deliberately means “address-only until a local
deployment is made”, and runtime verification rejects it rather than trusting
it.

## Consequences

Safe is the shortest path to `SSW-016` (local passkey/ERC-1271 flow) while
keeping the account implementation replaceable. The MVP still has no browser
passkey UI, recovery, ERC-7579 modules, hosted provider, testnet transaction,
or production deployment.
