# SSW-071 — Integrate camera and QR flows into wallet and admin web apps

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 35 |
| Lane | scanner |
| Dependencies | SSW-060, SSW-067 |
| Primary paths | `apps/admin-console/src/scanner/**`, `apps/wallet-app/src/scanner/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Add camera, image upload, URI paste, and deep-link handling for issuance and verification without putting media access in scanner core.

## Deliverables

- Web camera adapter
- Admin verifier scanner
- Wallet offer/request scanner

## Non-goals

- Offline envelope verification
- BLE/NFC
- Biometrics

## Acceptance criteria

1. Permission denial has a manual fallback
2. Camera stops on cancel/unmount
3. Unknown schemes never navigate

## Expected failure handling

- Duplicate scans are single use
- No background camera

## Validation mapped to acceptance

1. `Browser camera lifecycle tests`
2. `Accessibility and phishing tests`

## Agent prompt

```text
Implement SSW-071: Integrate camera and QR flows into wallet and admin web apps.

Project: universal-smart-wallet
Objective: Add camera, image upload, URI paste, and deep-link handling for issuance and verification without putting media access in scanner core.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-060, SSW-067.
5. Work only on SSW-071 in an atomic branch. Primary owned paths: apps/admin-console/src/scanner/**, apps/wallet-app/src/scanner/**.


Deliver:
- Web camera adapter
- Admin verifier scanner
- Wallet offer/request scanner

Do not include:
- Offline envelope verification
- BLE/NFC
- Biometrics

Acceptance criteria:
1. Permission denial has a manual fallback
2. Camera stops on cancel/unmount
3. Unknown schemes never navigate

Error and security behavior:
- Duplicate scans are single use
- No background camera
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Browser camera lifecycle tests and map the result to acceptance criterion 1.
2. Run Accessibility and phishing tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
