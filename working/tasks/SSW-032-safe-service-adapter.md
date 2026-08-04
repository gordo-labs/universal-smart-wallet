# SSW-032 — Implement the Safe wallet-service adapter

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 15 |
| Lane | account |
| Dependencies | SSW-029, SSW-030 |
| Primary paths | `packages/safe-service-adapter/**`, `contracts/test/WalletPlatform*.t.sol` |

## Active feature context

- working/features/wallet-platform-sdk.md
- working/features/smart-account-and-passkeys.md

## Objective

Expose deterministic Safe lifecycle, call preparation, ERC-4337 simulation, sponsorship, submission, and receipt inspection through provider-neutral service ports.

## Deliverables

- Safe lifecycle and call interfaces
- RPC, bundler, paymaster, and signer ports
- Base Sepolia and separate Scroll Sepolia deployment profiles

## Non-goals

- Custom smart-account base
- Custom cryptography
- Hosted provider fallback

## Acceptance criteria

1. Chain, EntryPoint, factory, account bytecode, and code hashes are verified
2. A provider can be replaced without changing domain types
3. Scroll configuration cannot silently reuse Base deployment metadata

## Expected failure handling

- Simulation failure blocks submission
- Never retry a possibly submitted UserOperation blindly
- Reject missing or unpinned deployment metadata

## Validation mapped to acceptance

1. `pnpm --filter @ssw/safe-service-adapter test`
2. `forge test --root contracts --match-path test/WalletPlatform*.t.sol`
3. `Provider failure and receipt mismatch tests`

## Agent prompt

```text
Implement SSW-032: Implement the Safe wallet-service adapter.

Project: sovereign-smart-wallet
Objective: Expose deterministic Safe lifecycle, call preparation, ERC-4337 simulation, sponsorship, submission, and receipt inspection through provider-neutral service ports.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md, working/features/smart-account-and-passkeys.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-029, SSW-030.
5. Work only on SSW-032 in an atomic branch. Primary owned paths: packages/safe-service-adapter/**, contracts/test/WalletPlatform*.t.sol.


Deliver:
- Safe lifecycle and call interfaces
- RPC, bundler, paymaster, and signer ports
- Base Sepolia and separate Scroll Sepolia deployment profiles

Do not include:
- Custom smart-account base
- Custom cryptography
- Hosted provider fallback

Acceptance criteria:
1. Chain, EntryPoint, factory, account bytecode, and code hashes are verified
2. A provider can be replaced without changing domain types
3. Scroll configuration cannot silently reuse Base deployment metadata

Error and security behavior:
- Simulation failure blocks submission
- Never retry a possibly submitted UserOperation blindly
- Reject missing or unpinned deployment metadata
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/safe-service-adapter test and map the result to acceptance criterion 1.
2. Run forge test --root contracts --match-path test/WalletPlatform*.t.sol and map the result to acceptance criterion 2.
3. Run Provider failure and receipt mismatch tests and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
