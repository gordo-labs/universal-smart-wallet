# SSW-079 — Publish identity operator, sector, and final handoff documentation

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P1 |
| Wave | 42 |
| Lane | documentation |
| Dependencies | SSW-064, SSW-068, SSW-069, SSW-070, SSW-071, SSW-072, SSW-073, SSW-078 |
| Primary paths | `apps/docs/**`, `docs/identity-platform/**`, `DOCS-MAP.md`, `working/orchestration/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Publish issuer, verifier, scanner, mobile, KMS/HSM, trust, offline, sector, EUDI-boundary, runbook, and generated prompt documentation.

## Deliverables

- Operator guides
- Sector and mobile guides
- Final prompt catalog and claims audit

## Non-goals

- Deploying docs
- Publishing packages
- Certification claim

## Acceptance criteria

1. Every supported journey links to a passing example
2. Limitations and external blockers are explicit
3. Graph, backlog, prompts, and docs are synchronized

## Expected failure handling

- No stale examples
- No unsupported capability claim

## Validation mapped to acceptance

1. `pnpm --filter @ssw/docs build`
2. `Documentation link, sample, and claims audit`

## Agent prompt

```text
Implement SSW-079: Publish identity operator, sector, and final handoff documentation.

Project: sovereign-smart-wallet
Objective: Publish issuer, verifier, scanner, mobile, KMS/HSM, trust, offline, sector, EUDI-boundary, runbook, and generated prompt documentation.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-064, SSW-068, SSW-069, SSW-070, SSW-071, SSW-072, SSW-073, SSW-078.
5. Work only on SSW-079 in an atomic branch. Primary owned paths: apps/docs/**, docs/identity-platform/**, DOCS-MAP.md, working/orchestration/**.


Deliver:
- Operator guides
- Sector and mobile guides
- Final prompt catalog and claims audit

Do not include:
- Deploying docs
- Publishing packages
- Certification claim

Acceptance criteria:
1. Every supported journey links to a passing example
2. Limitations and external blockers are explicit
3. Graph, backlog, prompts, and docs are synchronized

Error and security behavior:
- No stale examples
- No unsupported capability claim
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/docs build and map the result to acceptance criterion 1.
2. Run Documentation link, sample, and claims audit and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
