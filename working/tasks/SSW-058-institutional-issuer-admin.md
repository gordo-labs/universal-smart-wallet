# SSW-058 — Build issuer template and key configuration administration

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 34 |
| Lane | apps |
| Dependencies | SSW-065 |
| Primary paths | `apps/admin-console/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Add tenant-scoped template draft/review/publish/deprecate and opaque KMS/HSM key configuration screens.

## Deliverables

- Template administration
- Signer configuration
- Institutional RBAC

## Non-goals

- Showing secrets
- Legal qualification automation
- Production billing

## Acceptance criteria

1. Published templates are immutable
2. Key material is never readable
3. Tenant and role isolation is enforced

## Expected failure handling

- Unmounted flows cannot issue
- Provider errors remain redacted

## Validation mapped to acceptance

1. `pnpm --filter @ssw/admin-console test`
2. `Accessibility and tenant isolation tests`

## Agent prompt

```text
Implement SSW-058: Build issuer template and key configuration administration.

Project: universal-smart-wallet
Objective: Add tenant-scoped template draft/review/publish/deprecate and opaque KMS/HSM key configuration screens.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-065.
5. Work only on SSW-058 in an atomic branch. Primary owned paths: apps/admin-console/**.


Deliver:
- Template administration
- Signer configuration
- Institutional RBAC

Do not include:
- Showing secrets
- Legal qualification automation
- Production billing

Acceptance criteria:
1. Published templates are immutable
2. Key material is never readable
3. Tenant and role isolation is enforced

Error and security behavior:
- Unmounted flows cannot issue
- Provider errors remain redacted
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/admin-console test and map the result to acceptance criterion 1.
2. Run Accessibility and tenant isolation tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
