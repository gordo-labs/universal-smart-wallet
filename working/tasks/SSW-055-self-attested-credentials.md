# SSW-055 — Add wallet-created self-attested credentials

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P1 |
| Wave | 30 |
| Lane | identity |
| Dependencies | SSW-051, SSW-053 |
| Primary paths | `packages/self-issued-credentials/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Let individuals create and wallet-sign explicitly self-attested credentials without impersonating institutional issuers.

## Deliverables

- Self-issued credential API
- Wallet signature binding
- Assurance labeling

## Non-goals

- Institutional endorsement by mutation
- Legal validity claim
- Anonymous credentials

## Acceptance criteria

1. Assurance is permanently self_attested
2. Institutional policies reject it
3. Holder control is verified

## Expected failure handling

- Reject issuer substitution
- Reject detached holder key

## Validation mapped to acceptance

1. `pnpm --filter @ssw/self-issued-credentials test`
2. `Assurance escalation tests`

## Agent prompt

```text
Implement SSW-055: Add wallet-created self-attested credentials.

Project: sovereign-smart-wallet
Objective: Let individuals create and wallet-sign explicitly self-attested credentials without impersonating institutional issuers.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-051, SSW-053.
5. Work only on SSW-055 in an atomic branch. Primary owned paths: packages/self-issued-credentials/**.


Deliver:
- Self-issued credential API
- Wallet signature binding
- Assurance labeling

Do not include:
- Institutional endorsement by mutation
- Legal validity claim
- Anonymous credentials

Acceptance criteria:
1. Assurance is permanently self_attested
2. Institutional policies reject it
3. Holder control is verified

Error and security behavior:
- Reject issuer substitution
- Reject detached holder key
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/self-issued-credentials test and map the result to acceptance criterion 1.
2. Run Assurance escalation tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
