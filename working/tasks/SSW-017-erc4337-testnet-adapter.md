# SSW-017 — Add the opt-in ERC-4337 testnet adapter

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P1 |
| Wave | 4 |
| Lane | account |
| Dependencies | SSW-016 |
| Primary paths | `packages/account-adapter/**`, `contracts/script/**`, `.env.example`, `docs/protocols/**` |

## Active feature context

- working/features/smart-account-and-passkeys.md

## Objective

Submit and observe a passkey-authorized UserOperation through configurable bundler/paymaster adapters on one documented testnet while preserving fully local core tests.

## Deliverables

- Validated environment schema and provider-neutral ports
- UserOperation simulation/submission/receipt flow
- Testnet smoke runbook with chain and deployment manifest

## Non-goals

- Mainnet
- Hard-coded provider account
- Guaranteed gas sponsorship

## Acceptance criteria

1. Missing external configuration cleanly skips opt-in tests
2. Simulation errors and sponsorship denial are actionable
3. A successful operation is linked to exact EntryPoint, chain, account, and receipt

## Expected failure handling

- Never fall back to an unintended chain or RPC
- Redact API credentials and signed payload diagnostics
- Retry policy does not duplicate an already-included operation

## Validation mapped to acceptance

1. `Local adapter contract tests`
2. `Opt-in testnet smoke command`
3. `Provider outage and paymaster-denial tests`

## Agent prompt

```text
Implement SSW-017: Add the opt-in ERC-4337 testnet adapter.

Project: sovereign-smart-wallet
Objective: Submit and observe a passkey-authorized UserOperation through configurable bundler/paymaster adapters on one documented testnet while preserving fully local core tests.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/smart-account-and-passkeys.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-016.
5. Work only on SSW-017 in an atomic branch. Primary owned paths: packages/account-adapter/**, contracts/script/**, .env.example, docs/protocols/**.


Deliver:
- Validated environment schema and provider-neutral ports
- UserOperation simulation/submission/receipt flow
- Testnet smoke runbook with chain and deployment manifest

Do not include:
- Mainnet
- Hard-coded provider account
- Guaranteed gas sponsorship

Acceptance criteria:
1. Missing external configuration cleanly skips opt-in tests
2. Simulation errors and sponsorship denial are actionable
3. A successful operation is linked to exact EntryPoint, chain, account, and receipt

Error and security behavior:
- Never fall back to an unintended chain or RPC
- Redact API credentials and signed payload diagnostics
- Retry policy does not duplicate an already-included operation
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Local adapter contract tests and map the result to acceptance criterion 1.
2. Run Opt-in testnet smoke command and map the result to acceptance criterion 2.
3. Run Provider outage and paymaster-denial tests and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
