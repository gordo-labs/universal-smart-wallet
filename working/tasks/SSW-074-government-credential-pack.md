# SSW-074 — Add the government credential use-case pack

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P1 |
| Wave | 38 |
| Lane | examples |
| Dependencies | SSW-068, SSW-070, SSW-073 |
| Primary paths | `packages/institutional-use-cases/src/government/**`, `apps/use-case-gallery/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Add synthetic residence, permit, public-licence, PID/EAA policy examples with explicit authority and legal-status boundaries.

## Deliverables

- Government templates
- Government verifier policies
- Executable journeys

## Non-goals

- Real PID
- Qualified-provider claim
- Citizen data

## Acceptance criteria

1. Authority and jurisdiction are explicit
2. Qualified labels require supplied trust metadata
3. All fixtures are synthetic

## Expected failure handling

- Reject unauthorized government types
- No legal inference

## Validation mapped to acceptance

1. `pnpm --filter @ssw/institutional-use-cases test -- government`
2. `Gallery journey tests`

## Agent prompt

```text
Implement SSW-074: Add the government credential use-case pack.

Project: sovereign-smart-wallet
Objective: Add synthetic residence, permit, public-licence, PID/EAA policy examples with explicit authority and legal-status boundaries.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-068, SSW-070, SSW-073.
5. Work only on SSW-074 in an atomic branch. Primary owned paths: packages/institutional-use-cases/src/government/**, apps/use-case-gallery/**.


Deliver:
- Government templates
- Government verifier policies
- Executable journeys

Do not include:
- Real PID
- Qualified-provider claim
- Citizen data

Acceptance criteria:
1. Authority and jurisdiction are explicit
2. Qualified labels require supplied trust metadata
3. All fixtures are synthetic

Error and security behavior:
- Reject unauthorized government types
- No legal inference
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/institutional-use-cases test -- government and map the result to acceptance criterion 1.
2. Run Gallery journey tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
