# SSW-073 — Build the Expo mobile identity wallet application

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P1 |
| Wave | 36 |
| Lane | mobile |
| Dependencies | SSW-061, SSW-070, SSW-071, SSW-072 |
| Primary paths | `apps/wallet-mobile/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Compose passkey, secure storage, inbox, consent, camera, deep-link, issuance, presentation, and verification flows in an Expo app.

## Deliverables

- Expo application
- iOS/Android link configuration
- Mobile lifecycle tests

## Non-goals

- Store publication
- BLE/NFC
- Production push notifications

## Acceptance criteria

1. Sensitive sessions cancel on background
2. Secrets stay in secure storage
3. Issuance and verification deep links are single use

## Expected failure handling

- No plaintext backup
- Permission failure has recovery UI

## Validation mapped to acceptance

1. `pnpm --filter @ssw/wallet-mobile test`
2. `Expo export and platform-config tests`

## Agent prompt

```text
Implement SSW-073: Build the Expo mobile identity wallet application.

Project: universal-smart-wallet
Objective: Compose passkey, secure storage, inbox, consent, camera, deep-link, issuance, presentation, and verification flows in an Expo app.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-061, SSW-070, SSW-071, SSW-072.
5. Work only on SSW-073 in an atomic branch. Primary owned paths: apps/wallet-mobile/**.


Deliver:
- Expo application
- iOS/Android link configuration
- Mobile lifecycle tests

Do not include:
- Store publication
- BLE/NFC
- Production push notifications

Acceptance criteria:
1. Sensitive sessions cancel on background
2. Secrets stay in secure storage
3. Issuance and verification deep links are single use

Error and security behavior:
- No plaintext backup
- Permission failure has recovery UI
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/wallet-mobile test and map the result to acceptance criterion 1.
2. Run Expo export and platform-config tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
