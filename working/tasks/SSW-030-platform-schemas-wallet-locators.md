# SSW-030 — Implement platform schemas and opaque wallet locators

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 14 |
| Lane | platform-core |
| Dependencies | SSW-029 |
| Primary paths | `packages/platform-types/**` |

## Active feature context

- working/features/wallet-platform-sdk.md

## Objective

Create versioned runtime schemas for tenants, principals, wallets, signers, auth identities, transaction intents, challenges, audit events, migration bundles, and opaque tenant-scoped wallet locators.

## Deliverables

- Dependency-light public schemas and error taxonomy
- Email-free opaque wallet locator
- Deterministic serialization and validation fixtures

## Non-goals

- Database adapter
- HTTP service
- Authentication implementation

## Acceptance criteria

1. Locators reveal no email or social subject
2. Unknown fields, malformed hex, unsafe integers, and oversized values fail closed
3. Every persisted/exchanged project object carries a schema version

## Expected failure handling

- Prevent cross-tenant locator confusion
- Bound nesting, arrays, strings, and numeric values
- Never serialize secrets into audit or public response types

## Validation mapped to acceptance

1. `pnpm --filter @ssw/platform-types test`
2. `Property tests for locator parsing and serialization`
3. `pnpm typecheck`

## Agent prompt

```text
Implement SSW-030: Implement platform schemas and opaque wallet locators.

Project: sovereign-smart-wallet
Objective: Create versioned runtime schemas for tenants, principals, wallets, signers, auth identities, transaction intents, challenges, audit events, migration bundles, and opaque tenant-scoped wallet locators.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-029.
5. Work only on SSW-030 in an atomic branch. Primary owned paths: packages/platform-types/**.


Deliver:
- Dependency-light public schemas and error taxonomy
- Email-free opaque wallet locator
- Deterministic serialization and validation fixtures

Do not include:
- Database adapter
- HTTP service
- Authentication implementation

Acceptance criteria:
1. Locators reveal no email or social subject
2. Unknown fields, malformed hex, unsafe integers, and oversized values fail closed
3. Every persisted/exchanged project object carries a schema version

Error and security behavior:
- Prevent cross-tenant locator confusion
- Bound nesting, arrays, strings, and numeric values
- Never serialize secrets into audit or public response types
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/platform-types test and map the result to acceptance criterion 1.
2. Run Property tests for locator parsing and serialization and map the result to acceptance criterion 2.
3. Run pnpm typecheck and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
