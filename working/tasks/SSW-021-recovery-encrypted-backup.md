# SSW-021 — Implement account recovery and encrypted vault backup/restore

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 7 |
| Lane | recovery |
| Dependencies | SSW-007, SSW-016, SSW-019 |
| Primary paths | `packages/credential-vault/**`, `packages/account-adapter/**`, `apps/wallet-web/**`, `contracts/**` |

## Active feature context

- working/features/encrypted-vault.md
- working/features/identity-and-holder-binding.md
- working/features/smart-account-and-passkeys.md

## Objective

Provide tested signer rotation/account recovery and a separately authenticated encrypted vault export/restore flow, making their independent success conditions clear.

## Deliverables

- Recovery policy and timelock/guardian or selected maintained module integration
- Versioned encrypted backup envelope with KDF and integrity metadata
- Lost-device, colluding-guardian, wrong-passphrase, rollback, and partial-recovery tests

## Non-goals

- Production social graph
- Custodial recovery service
- Unencrypted export

## Acceptance criteria

1. Recovered account keeps the documented stable address/control identity
2. A backup never contains plaintext credentials or keys
3. Account recovery without vault backup and vault restore without account control are handled honestly

## Expected failure handling

- Timelock and guardian thresholds cannot be bypassed
- Rollback/version downgrade is detected
- Wrong recovery input does not reveal whether a credential exists

## Validation mapped to acceptance

1. `Foundry/account recovery tests`
2. `Export/import round-trip and corruption/property tests`
3. `End-to-end device-loss drill`

## Agent prompt

```text
Implement SSW-021: Implement account recovery and encrypted vault backup/restore.

Project: sovereign-smart-wallet
Objective: Provide tested signer rotation/account recovery and a separately authenticated encrypted vault export/restore flow, making their independent success conditions clear.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/encrypted-vault.md, working/features/identity-and-holder-binding.md, working/features/smart-account-and-passkeys.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-007, SSW-016, SSW-019.
5. Work only on SSW-021 in an atomic branch. Primary owned paths: packages/credential-vault/**, packages/account-adapter/**, apps/wallet-web/**, contracts/**.


Deliver:
- Recovery policy and timelock/guardian or selected maintained module integration
- Versioned encrypted backup envelope with KDF and integrity metadata
- Lost-device, colluding-guardian, wrong-passphrase, rollback, and partial-recovery tests

Do not include:
- Production social graph
- Custodial recovery service
- Unencrypted export

Acceptance criteria:
1. Recovered account keeps the documented stable address/control identity
2. A backup never contains plaintext credentials or keys
3. Account recovery without vault backup and vault restore without account control are handled honestly

Error and security behavior:
- Timelock and guardian thresholds cannot be bypassed
- Rollback/version downgrade is detected
- Wrong recovery input does not reveal whether a credential exists
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Foundry/account recovery tests and map the result to acceptance criterion 1.
2. Run Export/import round-trip and corruption/property tests and map the result to acceptance criterion 2.
3. Run End-to-end device-loss drill and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
