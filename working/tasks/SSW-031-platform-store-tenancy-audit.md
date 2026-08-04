# SSW-031 — Implement multi-tenant storage and redacted audit events

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 13 |
| Lane | platform-storage |
| Dependencies | SSW-030 |
| Primary paths | `packages/platform-store/**` |

## Active feature context

- working/features/wallet-platform-sdk.md

## Objective

Build in-memory and PostgreSQL ports for platform metadata with strict tenant isolation, atomic idempotency, migrations, and privacy-safe audit records.

## Deliverables

- Storage interfaces and in-memory adapter
- PostgreSQL schema and migrations
- Append-only redacted audit adapter

## Non-goals

- Credential plaintext storage
- Managed database service
- Analytics warehouse

## Acceptance criteria

1. Every query is tenant-scoped
2. Concurrent idempotent writes produce one result
3. No VC, OTP, token, recovery factor, or raw social/email identity enters audit output

## Expected failure handling

- Storage failure cannot authorize an operation
- Migrations are atomic and reversible before destructive steps
- Redaction failure stops audit persistence

## Validation mapped to acceptance

1. `pnpm --filter @ssw/platform-store test`
2. `PostgreSQL migration and rollback integration tests`
3. `Tenant escape and concurrency tests`

## Agent prompt

```text
Implement SSW-031: Implement multi-tenant storage and redacted audit events.

Project: sovereign-smart-wallet
Objective: Build in-memory and PostgreSQL ports for platform metadata with strict tenant isolation, atomic idempotency, migrations, and privacy-safe audit records.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-030.
5. Work only on SSW-031 in an atomic branch. Primary owned paths: packages/platform-store/**.


Deliver:
- Storage interfaces and in-memory adapter
- PostgreSQL schema and migrations
- Append-only redacted audit adapter

Do not include:
- Credential plaintext storage
- Managed database service
- Analytics warehouse

Acceptance criteria:
1. Every query is tenant-scoped
2. Concurrent idempotent writes produce one result
3. No VC, OTP, token, recovery factor, or raw social/email identity enters audit output

Error and security behavior:
- Storage failure cannot authorize an operation
- Migrations are atomic and reversible before destructive steps
- Redaction failure stops audit persistence
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/platform-store test and map the result to acceptance criterion 1.
2. Run PostgreSQL migration and rollback integration tests and map the result to acceptance criterion 2.
3. Run Tenant escape and concurrency tests and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
