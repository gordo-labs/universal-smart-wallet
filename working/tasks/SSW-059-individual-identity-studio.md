# SSW-059 — Build the holder credential inbox and trust inspector

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 34 |
| Lane | apps |
| Dependencies | SSW-066 |
| Primary paths | `apps/wallet-app/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Let holders accept offers, list credentials, and inspect issuer trust, assurance, status, expiry, and claims before storage.

## Deliverables

- Credential inbox
- Trust and assurance inspector
- Offer acceptance flow

## Non-goals

- Silent acceptance
- Unencrypted credential export
- Trusting unknown issuers

## Acceptance criteria

1. Trust and assurance are visible before acceptance
2. Vault remains client encrypted
3. Cancellation stores nothing

## Expected failure handling

- Unknown issuer requires explicit warning
- Never auto-present

## Validation mapped to acceptance

1. `pnpm --filter @ssw/wallet-app test`
2. `Mobile viewport and privacy tests`

## Agent prompt

```text
Implement SSW-059: Build the holder credential inbox and trust inspector.

Project: sovereign-smart-wallet
Objective: Let holders accept offers, list credentials, and inspect issuer trust, assurance, status, expiry, and claims before storage.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-066.
5. Work only on SSW-059 in an atomic branch. Primary owned paths: apps/wallet-app/**.


Deliver:
- Credential inbox
- Trust and assurance inspector
- Offer acceptance flow

Do not include:
- Silent acceptance
- Unencrypted credential export
- Trusting unknown issuers

Acceptance criteria:
1. Trust and assurance are visible before acceptance
2. Vault remains client encrypted
3. Cancellation stores nothing

Error and security behavior:
- Unknown issuer requires explicit warning
- Never auto-present
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/wallet-app test and map the result to acceptance criterion 1.
2. Run Mobile viewport and privacy tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
