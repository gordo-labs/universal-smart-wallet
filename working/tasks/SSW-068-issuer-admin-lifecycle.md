# SSW-068 — Build issuer review, issuance, and credential lifecycle administration

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 35 |
| Lane | apps |
| Dependencies | SSW-058, SSW-065 |
| Primary paths | `apps/admin-console/src/issuer/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Add evidence-reference review, dual approval, individual/bulk issue, reissue, suspend, and revoke workflows.

## Deliverables

- Review queue
- Issuance flows
- Credential lifecycle views

## Non-goals

- Raw evidence persistence
- Signer configuration
- Billing

## Acceptance criteria

1. Review and signing roles remain separate
2. Bulk rows have independent outcomes
3. Dangerous actions require step-up and confirmation

## Expected failure handling

- Partial bulk failure is explicit
- Unmount cannot issue

## Validation mapped to acceptance

1. `pnpm --filter @ssw/admin-console test -- issuer-lifecycle`
2. `Accessibility and concurrency tests`

## Agent prompt

```text
Implement SSW-068: Build issuer review, issuance, and credential lifecycle administration.

Project: sovereign-smart-wallet
Objective: Add evidence-reference review, dual approval, individual/bulk issue, reissue, suspend, and revoke workflows.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-058, SSW-065.
5. Work only on SSW-068 in an atomic branch. Primary owned paths: apps/admin-console/src/issuer/**.


Deliver:
- Review queue
- Issuance flows
- Credential lifecycle views

Do not include:
- Raw evidence persistence
- Signer configuration
- Billing

Acceptance criteria:
1. Review and signing roles remain separate
2. Bulk rows have independent outcomes
3. Dangerous actions require step-up and confirmation

Error and security behavior:
- Partial bulk failure is explicit
- Unmount cannot issue
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/admin-console test -- issuer-lifecycle and map the result to acceptance criterion 1.
2. Run Accessibility and concurrency tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
