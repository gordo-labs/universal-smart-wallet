# SSW-065 — Build the institutional issuer SDK

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 32 |
| Lane | sdk |
| Dependencies | SSW-057 |
| Primary paths | `packages/identity-sdk/src/issuer/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Expose typed template, approval, issuance, reissue, suspend, revoke, and offer-session clients over the issuer OpenAPI contract.

## Deliverables

- Issuer server client
- Idempotent mutation methods
- Issuer OpenAPI drift test

## Non-goals

- UI
- KMS secrets in clients
- Direct signer access

## Acceptance criteria

1. Every issuer endpoint is typed
2. Only idempotent calls retry
3. Authentication errors are redacted

## Expected failure handling

- Abort leaves session queryable
- Ambiguous issue response is not retried

## Validation mapped to acceptance

1. `pnpm --filter @ssw/identity-sdk test -- issuer`
2. `Issuer OpenAPI drift check`

## Agent prompt

```text
Implement SSW-065: Build the institutional issuer SDK.

Project: sovereign-smart-wallet
Objective: Expose typed template, approval, issuance, reissue, suspend, revoke, and offer-session clients over the issuer OpenAPI contract.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-057.
5. Work only on SSW-065 in an atomic branch. Primary owned paths: packages/identity-sdk/src/issuer/**.


Deliver:
- Issuer server client
- Idempotent mutation methods
- Issuer OpenAPI drift test

Do not include:
- UI
- KMS secrets in clients
- Direct signer access

Acceptance criteria:
1. Every issuer endpoint is typed
2. Only idempotent calls retry
3. Authentication errors are redacted

Error and security behavior:
- Abort leaves session queryable
- Ambiguous issue response is not retried
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/identity-sdk test -- issuer and map the result to acceptance criterion 1.
2. Run Issuer OpenAPI drift check and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
