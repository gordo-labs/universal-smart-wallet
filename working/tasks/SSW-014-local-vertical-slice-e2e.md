# SSW-014 — Integrate the deterministic local vertical slice

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 7 |
| Lane | integration |
| Dependencies | SSW-011, SSW-012, SSW-013 |
| Primary paths | `tests/e2e/**`, `packages/test-fixtures/**`, `scripts/**`, `README.md` |

## Active feature context

- working/features/credential-exchange.md
- working/features/encrypted-vault.md
- working/features/verification-trust-and-status.md

## Objective

Provide one command that starts the three local apps and proves issuance, encrypted storage, minimal presentation, off-chain verification, and access without chain or hosted infrastructure.

## Deliverables

- Playwright happy path
- Required negative and restart/persistence paths
- Exact local runbook and test fixture reset

## Non-goals

- Testnet smart account
- On-chain attestation
- Performance certification

## Acceptance criteria

1. The happy path passes from a clean data directory
2. No birthdate or undisclosed claim reaches the verifier
3. Signature, replay, expiry, status, holder-binding, and vault-tamper failures deny access

## Expected failure handling

- E2E does not paper over prerequisite failures
- Ports and child processes are cleaned up reliably
- Screenshots/traces are sanitized before retention

## Validation mapped to acceptance

1. `pnpm e2e:local`
2. `Inspect network/log artifacts for secret and undisclosed-claim leakage`
3. `Repeat after app restart and fixture reset`

## Agent prompt

```text
Implement SSW-014: Integrate the deterministic local vertical slice.

Project: sovereign-smart-wallet
Objective: Provide one command that starts the three local apps and proves issuance, encrypted storage, minimal presentation, off-chain verification, and access without chain or hosted infrastructure.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/credential-exchange.md, working/features/encrypted-vault.md, working/features/verification-trust-and-status.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-011, SSW-012, SSW-013.
5. Work only on SSW-014 in an atomic branch. Primary owned paths: tests/e2e/**, packages/test-fixtures/**, scripts/**, README.md.


Deliver:
- Playwright happy path
- Required negative and restart/persistence paths
- Exact local runbook and test fixture reset

Do not include:
- Testnet smart account
- On-chain attestation
- Performance certification

Acceptance criteria:
1. The happy path passes from a clean data directory
2. No birthdate or undisclosed claim reaches the verifier
3. Signature, replay, expiry, status, holder-binding, and vault-tamper failures deny access

Error and security behavior:
- E2E does not paper over prerequisite failures
- Ports and child processes are cleaned up reliably
- Screenshots/traces are sanitized before retention
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm e2e:local and map the result to acceptance criterion 1.
2. Run Inspect network/log artifacts for secret and undisclosed-claim leakage and map the result to acceptance criterion 2.
3. Run Repeat after app restart and fixture reset and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
