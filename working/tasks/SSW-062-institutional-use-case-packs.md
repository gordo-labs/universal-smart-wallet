# SSW-062 — Add the university credential use-case pack

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P1 |
| Wave | 38 |
| Lane | examples |
| Dependencies | SSW-068, SSW-070, SSW-073 |
| Primary paths | `packages/institutional-use-cases/**`, `apps/use-case-gallery/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Ship synthetic enrollment, diploma, and professional-qualification templates, policies, fixtures, issuance, status, and verification journeys.

## Deliverables

- University templates
- University verifier policies
- Executable university journeys

## Non-goals

- Real citizen data
- Claiming a driving school can issue a driving licence
- Jurisdiction-specific legal advice

## Acceptance criteria

1. Each pack has issuer and verifier policy
2. Authority boundaries are explicit
3. All fixtures are synthetic

## Expected failure handling

- Reject unauthorized credential types
- No real PII

## Validation mapped to acceptance

1. `pnpm --filter @ssw/institutional-use-cases test`
2. `Gallery journey tests`

## Agent prompt

```text
Implement SSW-062: Add the university credential use-case pack.

Project: sovereign-smart-wallet
Objective: Ship synthetic enrollment, diploma, and professional-qualification templates, policies, fixtures, issuance, status, and verification journeys.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-068, SSW-070, SSW-073.
5. Work only on SSW-062 in an atomic branch. Primary owned paths: packages/institutional-use-cases/**, apps/use-case-gallery/**.


Deliver:
- University templates
- University verifier policies
- Executable university journeys

Do not include:
- Real citizen data
- Claiming a driving school can issue a driving licence
- Jurisdiction-specific legal advice

Acceptance criteria:
1. Each pack has issuer and verifier policy
2. Authority boundaries are explicit
3. All fixtures are synthetic

Error and security behavior:
- Reject unauthorized credential types
- No real PII
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/institutional-use-cases test and map the result to acceptance criterion 1.
2. Run Gallery journey tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
