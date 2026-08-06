# SSW-069 — Build issuer signer, trust, and redacted audit administration

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P1 |
| Wave | 35 |
| Lane | apps |
| Dependencies | SSW-058, SSW-065 |
| Primary paths | `apps/admin-console/src/identity-operations/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Expose opaque signer health/rotation, trust/status configuration, and tenant-scoped redacted audit views.

## Deliverables

- Signer operations view
- Trust/status view
- Redacted audit explorer

## Non-goals

- Reading keys
- Showing credentials/evidence
- Legal accreditation

## Acceptance criteria

1. Keys remain opaque/write-only
2. Audit filters PII and credential material
3. Rotation ambiguity fails closed

## Expected failure handling

- Provider errors are redacted
- Unknown trust never appears active

## Validation mapped to acceptance

1. `pnpm --filter @ssw/admin-console test -- identity-operations`
2. `Secret and tenant scan`

## Agent prompt

```text
Implement SSW-069: Build issuer signer, trust, and redacted audit administration.

Project: universal-smart-wallet
Objective: Expose opaque signer health/rotation, trust/status configuration, and tenant-scoped redacted audit views.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-058, SSW-065.
5. Work only on SSW-069 in an atomic branch. Primary owned paths: apps/admin-console/src/identity-operations/**.


Deliver:
- Signer operations view
- Trust/status view
- Redacted audit explorer

Do not include:
- Reading keys
- Showing credentials/evidence
- Legal accreditation

Acceptance criteria:
1. Keys remain opaque/write-only
2. Audit filters PII and credential material
3. Rotation ambiguity fails closed

Error and security behavior:
- Provider errors are redacted
- Unknown trust never appears active
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/admin-console test -- identity-operations and map the result to acceptance criterion 1.
2. Run Secret and tenant scan and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
