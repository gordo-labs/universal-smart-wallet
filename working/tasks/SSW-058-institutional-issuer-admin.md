# SSW-058 — Build the institutional issuer administration panel

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 32 |
| Lane | apps |
| Dependencies | SSW-057 |
| Primary paths | `apps/admin-console/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Add template, evidence review, approval, issue, bulk issue, reissue, suspend, revoke, signer, and audit workflows.

## Deliverables

- Issuer admin modules
- Institutional RBAC
- Safe previews and audit views

## Non-goals

- Showing secrets
- Legal qualification automation
- Production billing

## Acceptance criteria

1. Roles separate review and signing
2. Dangerous operations require step-up and confirmation
3. No full credential or evidence appears in audit

## Expected failure handling

- Unmounted flows cannot issue
- Provider errors remain redacted

## Validation mapped to acceptance

1. `pnpm --filter @ssw/admin-console test`
2. `Accessibility and tenant isolation tests`

## Agent prompt

```text
Implement SSW-058: Build the institutional issuer administration panel.

Project: sovereign-smart-wallet
Objective: Add template, evidence review, approval, issue, bulk issue, reissue, suspend, revoke, signer, and audit workflows.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-057.
5. Work only on SSW-058 in an atomic branch. Primary owned paths: apps/admin-console/**.


Deliver:
- Issuer admin modules
- Institutional RBAC
- Safe previews and audit views

Do not include:
- Showing secrets
- Legal qualification automation
- Production billing

Acceptance criteria:
1. Roles separate review and signing
2. Dangerous operations require step-up and confirmation
3. No full credential or evidence appears in audit

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
