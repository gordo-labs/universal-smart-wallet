# SSW-045 — Build executable Wallet Platform use-case examples

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P1 |
| Wave | 23 |
| Lane | examples |
| Dependencies | SSW-043, SSW-044 |
| Primary paths | `apps/use-case-gallery/**`, `packages/test-fixtures/src/platform-*.ts` |

## Active feature context

- working/features/wallet-platform-sdk.md

## Objective

Demonstrate passkey, email, social, enterprise provisioning, ERC-20 loyalty, NFT/1155 minting, credential-gated access, DID binding, recovery, vendor rotation, and full export/import through public SDKs only.

## Deliverables

- Executable use-case gallery
- Synthetic fixtures and recipes
- Deep links into matching admin-console operations

## Non-goals

- Real customer data
- Valuable assets
- Private internal imports

## Acceptance criteria

1. Every example starts from a clean synthetic fixture
2. Examples use only documented public SDK methods
3. Every success flow includes at least one actionable failure example

## Expected failure handling

- Fixtures cannot target mainnet
- Examples never embed API secrets client-side
- Reset cleans all local state and processes

## Validation mapped to acceptance

1. `pnpm --filter @ssw/use-case-gallery test`
2. `Use-case browser E2E`
3. `Public-import and secret/PII scan`

## Agent prompt

```text
Implement SSW-045: Build executable Wallet Platform use-case examples.

Project: sovereign-smart-wallet
Objective: Demonstrate passkey, email, social, enterprise provisioning, ERC-20 loyalty, NFT/1155 minting, credential-gated access, DID binding, recovery, vendor rotation, and full export/import through public SDKs only.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-043, SSW-044.
5. Work only on SSW-045 in an atomic branch. Primary owned paths: apps/use-case-gallery/**, packages/test-fixtures/src/platform-*.ts.


Deliver:
- Executable use-case gallery
- Synthetic fixtures and recipes
- Deep links into matching admin-console operations

Do not include:
- Real customer data
- Valuable assets
- Private internal imports

Acceptance criteria:
1. Every example starts from a clean synthetic fixture
2. Examples use only documented public SDK methods
3. Every success flow includes at least one actionable failure example

Error and security behavior:
- Fixtures cannot target mainnet
- Examples never embed API secrets client-side
- Reset cleans all local state and processes
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/use-case-gallery test and map the result to acceptance criterion 1.
2. Run Use-case browser E2E and map the result to acceptance criterion 2.
3. Run Public-import and secret/PII scan and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
