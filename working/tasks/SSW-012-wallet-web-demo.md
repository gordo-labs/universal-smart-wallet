# SSW-012 — Build the wallet web demo

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 6 |
| Lane | apps |
| Dependencies | SSW-007, SSW-009, SSW-010 |
| Primary paths | `apps/wallet-web/**` |

## Active feature context

- working/features/credential-exchange.md
- working/features/encrypted-vault.md

## Objective

Build the wallet UI for local unlock, credential offer intake, verification-before-storage, encrypted listing/deletion, request review, disclosure approval, and presentation submission.

## Deliverables

- Vault setup/unlock and credential lifecycle screens
- OpenID4VCI intake and OpenID4VP consent flow
- Actionable privacy-safe error states

## Non-goals

- Smart-account integration
- Cloud backup
- Production visual design

## Acceptance criteria

1. The UI shows issuer/verifier, purpose, expiry, requested and disclosed claims
2. No credential plaintext persists outside the unlocked session
3. Lock, delete, corrupt-vault, rejected-offer, and cancelled-presentation paths work

## Expected failure handling

- Never auto-approve or silently disclose
- Unsupported PRF presents the approved fallback
- Sensitive data is redacted from logs and error boundaries

## Validation mapped to acceptance

1. `Component tests`
2. `Browser integration tests with fake IndexedDB/WebAuthn capabilities`
3. `Accessibility checks for the complete local flow`

## Agent prompt

```text
Implement SSW-012: Build the wallet web demo.

Project: sovereign-smart-wallet
Objective: Build the wallet UI for local unlock, credential offer intake, verification-before-storage, encrypted listing/deletion, request review, disclosure approval, and presentation submission.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/credential-exchange.md, working/features/encrypted-vault.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-007, SSW-009, SSW-010.
5. Work only on SSW-012 in an atomic branch. Primary owned paths: apps/wallet-web/**.


Deliver:
- Vault setup/unlock and credential lifecycle screens
- OpenID4VCI intake and OpenID4VP consent flow
- Actionable privacy-safe error states

Do not include:
- Smart-account integration
- Cloud backup
- Production visual design

Acceptance criteria:
1. The UI shows issuer/verifier, purpose, expiry, requested and disclosed claims
2. No credential plaintext persists outside the unlocked session
3. Lock, delete, corrupt-vault, rejected-offer, and cancelled-presentation paths work

Error and security behavior:
- Never auto-approve or silently disclose
- Unsupported PRF presents the approved fallback
- Sensitive data is redacted from logs and error boundaries
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Component tests and map the result to acceptance criterion 1.
2. Run Browser integration tests with fake IndexedDB/WebAuthn capabilities and map the result to acceptance criterion 2.
3. Run Accessibility checks for the complete local flow and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
