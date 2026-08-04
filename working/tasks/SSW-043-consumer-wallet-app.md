# SSW-043 — Build the modular consumer wallet application

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 22 |
| Lane | apps |
| Dependencies | SSW-038, SSW-039, SSW-042 |
| Primary paths | `apps/wallet-app/**` |

## Active feature context

- working/features/wallet-platform-sdk.md
- working/features/credential-exchange.md

## Objective

Build a Next.js PWA for passkey, email, or OIDC onboarding, Safe/DID creation, assets, credentials, consent, signers, recovery, export, and migration through the public React SDK.

## Deliverables

- Installable wallet application
- Modular onboarding and step-up flows
- Assets, credentials, identity, recovery, and portability screens

## Non-goals

- Direct service/database imports
- Mainnet assets
- Auto-approval

## Acceptance criteria

1. Each auth module can be enabled independently
2. A local private DID is created without public registration
3. Sensitive actions require explicit preview, consent, and step-up

## Expected failure handling

- No plaintext credential survives a locked session
- Email-only custody limitations are visible
- Failed or cancelled migrations preserve control

## Validation mapped to acceptance

1. `pnpm --filter @ssw/wallet-app test`
2. `Browser E2E for every auth mode`
3. `PWA, accessibility, privacy, and responsive checks`

## Agent prompt

```text
Implement SSW-043: Build the modular consumer wallet application.

Project: sovereign-smart-wallet
Objective: Build a Next.js PWA for passkey, email, or OIDC onboarding, Safe/DID creation, assets, credentials, consent, signers, recovery, export, and migration through the public React SDK.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md, working/features/credential-exchange.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-038, SSW-039, SSW-042.
5. Work only on SSW-043 in an atomic branch. Primary owned paths: apps/wallet-app/**.


Deliver:
- Installable wallet application
- Modular onboarding and step-up flows
- Assets, credentials, identity, recovery, and portability screens

Do not include:
- Direct service/database imports
- Mainnet assets
- Auto-approval

Acceptance criteria:
1. Each auth module can be enabled independently
2. A local private DID is created without public registration
3. Sensitive actions require explicit preview, consent, and step-up

Error and security behavior:
- No plaintext credential survives a locked session
- Email-only custody limitations are visible
- Failed or cancelled migrations preserve control
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/wallet-app test and map the result to acceptance criterion 1.
2. Run Browser E2E for every auth mode and map the result to acceptance criterion 2.
3. Run PWA, accessibility, privacy, and responsive checks and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
