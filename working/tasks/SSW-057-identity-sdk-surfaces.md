# SSW-057 — Build the format-neutral Identity SDK foundation

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 31 |
| Lane | sdk |
| Dependencies | SSW-054, SSW-055, SSW-056 |
| Primary paths | `packages/identity-sdk/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Create the shared transport, generated domain types, stable errors, cancellation, timeout, and browser/server boundaries used by actor-specific SDKs.

## Deliverables

- Identity SDK transport core
- Generated shared types
- Stable errors and cancellation

## Non-goals

- UI
- Server secrets in browser
- Direct database imports

## Acceptance criteria

1. Transport and shared types are format neutral
2. Browser exports contain no server secrets
3. Generated and runtime types cannot drift

## Expected failure handling

- Redact authentication responses
- Retry only idempotent operations

## Validation mapped to acceptance

1. `pnpm --filter @ssw/identity-sdk test`
2. `Bundle and OpenAPI drift tests`

## Agent prompt

```text
Implement SSW-057: Build the format-neutral Identity SDK foundation.

Project: sovereign-smart-wallet
Objective: Create the shared transport, generated domain types, stable errors, cancellation, timeout, and browser/server boundaries used by actor-specific SDKs.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-054, SSW-055, SSW-056.
5. Work only on SSW-057 in an atomic branch. Primary owned paths: packages/identity-sdk/**.


Deliver:
- Identity SDK transport core
- Generated shared types
- Stable errors and cancellation

Do not include:
- UI
- Server secrets in browser
- Direct database imports

Acceptance criteria:
1. Transport and shared types are format neutral
2. Browser exports contain no server secrets
3. Generated and runtime types cannot drift

Error and security behavior:
- Redact authentication responses
- Retry only idempotent operations
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/identity-sdk test and map the result to acceptance criterion 1.
2. Run Bundle and OpenAPI drift tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
