# SSW-050 — Generalize credential templates, schemas, and lifecycle types

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 28 |
| Lane | credential-core |
| Dependencies | SSW-049 |
| Primary paths | `packages/credential-domain/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Add strict multitenant credential templates, schemas, issuer profiles, issuance sessions, verification policies, and receipts.

## Deliverables

- Versioned runtime schemas
- Template lifecycle
- Assurance-safe domain types

## Non-goals

- Signing
- UI
- Regulatory certification

## Acceptance criteria

1. Unknown fields and assurance escalation fail closed
2. Published templates are immutable
3. PII is excluded from locators and audit models

## Expected failure handling

- Reject invalid lifecycle transitions
- Reject cross-tenant references

## Validation mapped to acceptance

1. `pnpm --filter @ssw/credential-domain test`
2. `Schema mutation tests`

## Agent prompt

```text
Implement SSW-050: Generalize credential templates, schemas, and lifecycle types.

Project: sovereign-smart-wallet
Objective: Add strict multitenant credential templates, schemas, issuer profiles, issuance sessions, verification policies, and receipts.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-049.
5. Work only on SSW-050 in an atomic branch. Primary owned paths: packages/credential-domain/**.


Deliver:
- Versioned runtime schemas
- Template lifecycle
- Assurance-safe domain types

Do not include:
- Signing
- UI
- Regulatory certification

Acceptance criteria:
1. Unknown fields and assurance escalation fail closed
2. Published templates are immutable
3. PII is excluded from locators and audit models

Error and security behavior:
- Reject invalid lifecycle transitions
- Reject cross-tenant references
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/credential-domain test and map the result to acceptance criterion 1.
2. Run Schema mutation tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
