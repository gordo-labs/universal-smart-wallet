# SSW-044 — Build the Wallet Platform administration console

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P1 |
| Wave | 22 |
| Lane | apps |
| Dependencies | SSW-039, SSW-041, SSW-042 |
| Primary paths | `apps/admin-console/**` |

## Active feature context

- working/features/wallet-platform-sdk.md

## Objective

Build a Next.js console for tenants, API keys, auth providers, networks, infrastructure ports, policies, wallets, transactions, audit, DID, assets, credentials, and migration operations.

## Deliverables

- Tenant and integration configuration
- Wallet/policy/audit operational views
- Simulation-first token, NFT, DID, credential, and migration actions

## Non-goals

- Showing secrets or full VCs
- Bypassing SDK/API boundaries
- Production billing

## Acceptance criteria

1. Every mutation shows chain, target, cost, simulation, and policy result
2. Roles and API scopes restrict administrative actions
3. Audit views remain redacted and tenant-scoped

## Expected failure handling

- No raw secret can be read back after creation
- Dangerous actions require reauthentication and confirmation
- Provider errors cannot expose configuration credentials

## Validation mapped to acceptance

1. `pnpm --filter @ssw/admin-console test`
2. `Role, tenant, and destructive-action E2E`
3. `Accessibility and secret-rendering scan`

## Agent prompt

```text
Implement SSW-044: Build the Wallet Platform administration console.

Project: universal-smart-wallet
Objective: Build a Next.js console for tenants, API keys, auth providers, networks, infrastructure ports, policies, wallets, transactions, audit, DID, assets, credentials, and migration operations.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-039, SSW-041, SSW-042.
5. Work only on SSW-044 in an atomic branch. Primary owned paths: apps/admin-console/**.


Deliver:
- Tenant and integration configuration
- Wallet/policy/audit operational views
- Simulation-first token, NFT, DID, credential, and migration actions

Do not include:
- Showing secrets or full VCs
- Bypassing SDK/API boundaries
- Production billing

Acceptance criteria:
1. Every mutation shows chain, target, cost, simulation, and policy result
2. Roles and API scopes restrict administrative actions
3. Audit views remain redacted and tenant-scoped

Error and security behavior:
- No raw secret can be read back after creation
- Dangerous actions require reauthentication and confirmation
- Provider errors cannot expose configuration credentials
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/admin-console test and map the result to acceptance criterion 1.
2. Run Role, tenant, and destructive-action E2E and map the result to acceptance criterion 2.
3. Run Accessibility and secret-rendering scan and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
