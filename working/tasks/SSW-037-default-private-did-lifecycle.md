# SSW-037 — Add the default private DID lifecycle

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P1 |
| Wave | 14 |
| Lane | identity |
| Dependencies | SSW-030, SSW-032 |
| Primary paths | `packages/identity-adapter/**` |

## Active feature context

- working/features/wallet-platform-sdk.md
- working/features/identity-and-holder-binding.md

## Objective

Create a local did:pkh controller reference automatically for each Safe while keeping publication optional and credential presentations pairwise by default.

## Deliverables

- Wallet-creation DID lifecycle API
- Control-proof and export interface
- Pairwise presentation integration fixtures

## Non-goals

- Automatic on-chain registration
- Universal resolver dependency
- Global DID disclosure in every presentation

## Acceptance criteria

1. DID derives deterministically from chain and Safe
2. Passkey/vendor rotation preserves the DID
3. Creation produces no chain transaction or public identifier disclosure

## Expected failure handling

- Chain mismatch fails closed
- Resolver outage cannot break base credential flows
- Never replace pairwise holder IDs with the public controller silently

## Validation mapped to acceptance

1. `pnpm --filter @ssw/identity-adapter test`
2. `Recovery and vendor-rotation identity tests`
3. `Correlation and disclosure fixture review`

## Agent prompt

```text
Implement SSW-037: Add the default private DID lifecycle.

Project: sovereign-smart-wallet
Objective: Create a local did:pkh controller reference automatically for each Safe while keeping publication optional and credential presentations pairwise by default.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md, working/features/identity-and-holder-binding.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-030, SSW-032.
5. Work only on SSW-037 in an atomic branch. Primary owned paths: packages/identity-adapter/**.


Deliver:
- Wallet-creation DID lifecycle API
- Control-proof and export interface
- Pairwise presentation integration fixtures

Do not include:
- Automatic on-chain registration
- Universal resolver dependency
- Global DID disclosure in every presentation

Acceptance criteria:
1. DID derives deterministically from chain and Safe
2. Passkey/vendor rotation preserves the DID
3. Creation produces no chain transaction or public identifier disclosure

Error and security behavior:
- Chain mismatch fails closed
- Resolver outage cannot break base credential flows
- Never replace pairwise holder IDs with the public controller silently
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/identity-adapter test and map the result to acceptance criterion 1.
2. Run Recovery and vendor-rotation identity tests and map the result to acceptance criterion 2.
3. Run Correlation and disclosure fixture review and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
