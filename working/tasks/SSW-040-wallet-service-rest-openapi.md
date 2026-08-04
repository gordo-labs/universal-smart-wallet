# SSW-040 — Build the self-hosted Wallet Service API

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 19 |
| Lane | service |
| Dependencies | SSW-031, SSW-032, SSW-033, SSW-034, SSW-035, SSW-036, SSW-037, SSW-038, SSW-039 |
| Primary paths | `apps/wallet-service/**` |

## Active feature context

- working/features/wallet-platform-sdk.md

## Objective

Expose versioned REST and OpenAPI interfaces for wallet lifecycle, transactions, balances, activity, signers, DID, authentication, and portability without hosted-provider coupling.

## Deliverables

- Node wallet service with /v1 API
- OpenAPI 3.1 specification
- JWT user auth, scoped server API keys, idempotency, and webhook boundaries

## Non-goals

- Admin or consumer UI
- Vendor-specific mandatory service
- Mainnet configuration

## Acceptance criteria

1. All mutations require authentication, tenant scope, idempotency, and policy evaluation
2. Browser and server credentials have separate scopes
3. OpenAPI matches runtime request/response validation

## Expected failure handling

- Never return or log raw secrets, OTPs, VCs, recovery material, or signer keys
- Provider outage maps to stable retry-safe errors
- Unknown API versions or fields fail closed

## Validation mapped to acceptance

1. `pnpm --filter @ssw/wallet-service test`
2. `OpenAPI contract and negative route tests`
3. `Auth, tenant, idempotency, webhook, SSRF, and rate-limit tests`

## Agent prompt

```text
Implement SSW-040: Build the self-hosted Wallet Service API.

Project: sovereign-smart-wallet
Objective: Expose versioned REST and OpenAPI interfaces for wallet lifecycle, transactions, balances, activity, signers, DID, authentication, and portability without hosted-provider coupling.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-031, SSW-032, SSW-033, SSW-034, SSW-035, SSW-036, SSW-037, SSW-038, SSW-039.
5. Work only on SSW-040 in an atomic branch. Primary owned paths: apps/wallet-service/**.


Deliver:
- Node wallet service with /v1 API
- OpenAPI 3.1 specification
- JWT user auth, scoped server API keys, idempotency, and webhook boundaries

Do not include:
- Admin or consumer UI
- Vendor-specific mandatory service
- Mainnet configuration

Acceptance criteria:
1. All mutations require authentication, tenant scope, idempotency, and policy evaluation
2. Browser and server credentials have separate scopes
3. OpenAPI matches runtime request/response validation

Error and security behavior:
- Never return or log raw secrets, OTPs, VCs, recovery material, or signer keys
- Provider outage maps to stable retry-safe errors
- Unknown API versions or fields fail closed
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/wallet-service test and map the result to acceptance criterion 1.
2. Run OpenAPI contract and negative route tests and map the result to acceptance criterion 2.
3. Run Auth, tenant, idempotency, webhook, SSRF, and rate-limit tests and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
