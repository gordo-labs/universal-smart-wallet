# SSW-041 — Build the browser and server TypeScript Wallet SDK

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 16 |
| Lane | sdk |
| Dependencies | SSW-040 |
| Primary paths | `packages/wallet-sdk/**` |

## Active feature context

- working/features/wallet-platform-sdk.md

## Objective

Provide familiar browser/server SDK clients for wallets, transactions, balances, assets, signers, identity, and portability using only the public OpenAPI contract.

## Deliverables

- ESM browser and server entrypoints
- Generated API types plus ergonomic domain methods
- Timeout, abort, retry classification, idempotency, and stable errors

## Non-goals

- React hooks
- Bundling server secrets into browser code
- Direct database or Safe imports

## Acceptance criteria

1. The SDK exposes create/get/getOrCreate, prepare/authorize/send, balances, token/NFT, signer, DID, and migration methods
2. Browser bundles contain no server-only code
3. Generated and runtime API schemas cannot drift

## Expected failure handling

- Retry only operations proven idempotent
- Redact response bodies from authentication errors
- Abort and timeout leave transaction state queryable

## Validation mapped to acceptance

1. `pnpm --filter @ssw/wallet-sdk test`
2. `Browser/server export and bundle tests`
3. `OpenAPI generation drift check`

## Agent prompt

```text
Implement SSW-041: Build the browser and server TypeScript Wallet SDK.

Project: sovereign-smart-wallet
Objective: Provide familiar browser/server SDK clients for wallets, transactions, balances, assets, signers, identity, and portability using only the public OpenAPI contract.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-040.
5. Work only on SSW-041 in an atomic branch. Primary owned paths: packages/wallet-sdk/**.


Deliver:
- ESM browser and server entrypoints
- Generated API types plus ergonomic domain methods
- Timeout, abort, retry classification, idempotency, and stable errors

Do not include:
- React hooks
- Bundling server secrets into browser code
- Direct database or Safe imports

Acceptance criteria:
1. The SDK exposes create/get/getOrCreate, prepare/authorize/send, balances, token/NFT, signer, DID, and migration methods
2. Browser bundles contain no server-only code
3. Generated and runtime API schemas cannot drift

Error and security behavior:
- Retry only operations proven idempotent
- Redact response bodies from authentication errors
- Abort and timeout leave transaction state queryable
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/wallet-sdk test and map the result to acceptance criterion 1.
2. Run Browser/server export and bundle tests and map the result to acceptance criterion 2.
3. Run OpenAPI generation drift check and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
