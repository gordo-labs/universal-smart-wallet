# SSW-066 — Build holder credential SDK methods and React hooks

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 32 |
| Lane | sdk |
| Dependencies | SSW-057 |
| Primary paths | `packages/identity-sdk/src/holder/**`, `packages/wallet-sdk-react/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Expose accept-offer, list, inspect, create-self-attested, delete, export, and claim-consent presentation methods plus React hooks.

## Deliverables

- Holder client
- Credential React hooks
- Stale-request cancellation

## Non-goals

- Rendering credential values in logs
- Silent presentation
- Native modules

## Acceptance criteria

1. Hooks clear stale privileged state
2. Consent is claim-specific
3. No secret or full credential is exposed by errors

## Expected failure handling

- Unmount cancels sensitive operations
- Unknown issuer needs explicit acknowledgement

## Validation mapped to acceptance

1. `pnpm --filter @ssw/identity-sdk test -- holder`
2. `pnpm --filter @ssw/wallet-sdk-react test`

## Agent prompt

```text
Implement SSW-066: Build holder credential SDK methods and React hooks.

Project: sovereign-smart-wallet
Objective: Expose accept-offer, list, inspect, create-self-attested, delete, export, and claim-consent presentation methods plus React hooks.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-057.
5. Work only on SSW-066 in an atomic branch. Primary owned paths: packages/identity-sdk/src/holder/**, packages/wallet-sdk-react/**.


Deliver:
- Holder client
- Credential React hooks
- Stale-request cancellation

Do not include:
- Rendering credential values in logs
- Silent presentation
- Native modules

Acceptance criteria:
1. Hooks clear stale privileged state
2. Consent is claim-specific
3. No secret or full credential is exposed by errors

Error and security behavior:
- Unmount cancels sensitive operations
- Unknown issuer needs explicit acknowledgement
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/identity-sdk test -- holder and map the result to acceptance criterion 1.
2. Run pnpm --filter @ssw/wallet-sdk-react test and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
