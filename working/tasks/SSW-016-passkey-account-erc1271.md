# SSW-016 — Implement the local passkey smart account and ERC-1271 flow

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 3 |
| Lane | account |
| Dependencies | SSW-015 |
| Primary paths | `packages/account-adapter/**`, `contracts/**`, `apps/wallet-web/**` |

## Active feature context

- working/features/smart-account-and-passkeys.md

## Objective

Register a WebAuthn passkey, derive or deploy the selected smart account locally, execute a local operation, and validate account signatures through ERC-1271.

## Deliverables

- WebAuthn signer adapter with origin/RP/challenge checks
- Counterfactual/deployed account flow on Anvil
- ERC-1271 positive and negative contract tests

## Non-goals

- Hosted bundler/paymaster
- ERC-7579 modules
- Account recovery

## Acceptance criteria

1. Passkey private material never leaves the authenticator
2. Wrong origin, RP ID, challenge, signature, and account reject
3. Account address remains deterministic under the documented inputs

## Expected failure handling

- Explicitly handle user cancellation and unavailable authenticators
- P-256 verifier path is pinned and code-hash checked
- Never conflate passkey assertion with vault decryption

## Validation mapped to acceptance

1. `Playwright virtual-authenticator tests`
2. `Anvil integration and forge ERC-1271 tests`
3. `Cross-browser passkey capability smoke matrix`

## Agent prompt

```text
Implement SSW-016: Implement the local passkey smart account and ERC-1271 flow.

Project: universal-smart-wallet
Objective: Register a WebAuthn passkey, derive or deploy the selected smart account locally, execute a local operation, and validate account signatures through ERC-1271.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/smart-account-and-passkeys.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-015.
5. Work only on SSW-016 in an atomic branch. Primary owned paths: packages/account-adapter/**, contracts/**, apps/wallet-web/**.


Deliver:
- WebAuthn signer adapter with origin/RP/challenge checks
- Counterfactual/deployed account flow on Anvil
- ERC-1271 positive and negative contract tests

Do not include:
- Hosted bundler/paymaster
- ERC-7579 modules
- Account recovery

Acceptance criteria:
1. Passkey private material never leaves the authenticator
2. Wrong origin, RP ID, challenge, signature, and account reject
3. Account address remains deterministic under the documented inputs

Error and security behavior:
- Explicitly handle user cancellation and unavailable authenticators
- P-256 verifier path is pinned and code-hash checked
- Never conflate passkey assertion with vault decryption
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Playwright virtual-authenticator tests and map the result to acceptance criterion 1.
2. Run Anvil integration and forge ERC-1271 tests and map the result to acceptance criterion 2.
3. Run Cross-browser passkey capability smoke matrix and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
