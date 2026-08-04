# SSW-046 — Build the self-hosted reference stack

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Doing |
| Priority | P1 |
| Wave | 24 |
| Lane | operations |
| Dependencies | SSW-040, SSW-043, SSW-044, SSW-045 |
| Primary paths | `deploy/self-hosted/**`, `docker-compose.platform.yml`, `.env.platform.example` |

## Active feature context

- working/features/wallet-platform-sdk.md

## Objective

Provide a reproducible Docker Compose stack for wallet-service, PostgreSQL, Mailpit, Anvil, wallet app, admin console, and gallery with replaceable production infrastructure ports.

## Deliverables

- Container builds and compose topology
- Environment validation and health/readiness checks
- Migration, backup/restore, secret rotation, and Base Sepolia opt-in runbooks

## Non-goals

- Production SLA
- Bundled production secrets
- Mainnet deployment

## Acceptance criteria

1. A clean machine can start and validate the local stack
2. Development signers and services are unmistakably unsafe for production
3. Replacing SMTP/RPC/bundler/paymaster/signer ports requires configuration rather than domain changes

## Expected failure handling

- Startup fails on missing required configuration
- Health does not imply readiness before migrations
- Never ship default credentials outside local fixtures

## Validation mapped to acceptance

1. `docker compose -f docker-compose.platform.yml config`
2. `Local stack smoke and restart tests`
3. `Backup/restore and environment secret scan`

## Agent prompt

```text
Implement SSW-046: Build the self-hosted reference stack.

Project: sovereign-smart-wallet
Objective: Provide a reproducible Docker Compose stack for wallet-service, PostgreSQL, Mailpit, Anvil, wallet app, admin console, and gallery with replaceable production infrastructure ports.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-040, SSW-043, SSW-044, SSW-045.
5. Work only on SSW-046 in an atomic branch. Primary owned paths: deploy/self-hosted/**, docker-compose.platform.yml, .env.platform.example.


Deliver:
- Container builds and compose topology
- Environment validation and health/readiness checks
- Migration, backup/restore, secret rotation, and Base Sepolia opt-in runbooks

Do not include:
- Production SLA
- Bundled production secrets
- Mainnet deployment

Acceptance criteria:
1. A clean machine can start and validate the local stack
2. Development signers and services are unmistakably unsafe for production
3. Replacing SMTP/RPC/bundler/paymaster/signer ports requires configuration rather than domain changes

Error and security behavior:
- Startup fails on missing required configuration
- Health does not imply readiness before migrations
- Never ship default credentials outside local fixtures
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run docker compose -f docker-compose.platform.yml config and map the result to acceptance criterion 1.
2. Run Local stack smoke and restart tests and map the result to acceptance criterion 2.
3. Run Backup/restore and environment secret scan and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
