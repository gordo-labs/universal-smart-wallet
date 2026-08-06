# SSW-075 — Add the driving-school credential use-case pack

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P1 |
| Wave | 38 |
| Lane | examples |
| Dependencies | SSW-068, SSW-070, SSW-073 |
| Primary paths | `packages/institutional-use-cases/src/driving-school/**`, `apps/use-case-gallery/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Add synthetic enrollment, lesson completion, exam-readiness, and training-completion credentials while reserving driving licences for authorities.

## Deliverables

- Driving-school templates
- Authority separation policies
- Executable journeys

## Non-goals

- Issuing a driving licence
- Real student data
- ISO mDL certification

## Acceptance criteria

1. School and authority credentials cannot be confused
2. Licence policies reject school assurance
3. All fixtures are synthetic

## Expected failure handling

- No authority escalation
- Reject unsupported mdoc namespace

## Validation mapped to acceptance

1. `pnpm --filter @ssw/institutional-use-cases test -- driving-school`
2. `Negative authority tests`

## Agent prompt

```text
Implement SSW-075: Add the driving-school credential use-case pack.

Project: universal-smart-wallet
Objective: Add synthetic enrollment, lesson completion, exam-readiness, and training-completion credentials while reserving driving licences for authorities.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-068, SSW-070, SSW-073.
5. Work only on SSW-075 in an atomic branch. Primary owned paths: packages/institutional-use-cases/src/driving-school/**, apps/use-case-gallery/**.


Deliver:
- Driving-school templates
- Authority separation policies
- Executable journeys

Do not include:
- Issuing a driving licence
- Real student data
- ISO mDL certification

Acceptance criteria:
1. School and authority credentials cannot be confused
2. Licence policies reject school assurance
3. All fixtures are synthetic

Error and security behavior:
- No authority escalation
- Reject unsupported mdoc namespace
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/institutional-use-cases test -- driving-school and map the result to acceptance criterion 1.
2. Run Negative authority tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
