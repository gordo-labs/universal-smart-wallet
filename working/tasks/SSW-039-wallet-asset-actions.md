# SSW-039 — Implement native, token, and NFT wallet actions

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P1 |
| Wave | 17 |
| Lane | assets |
| Dependencies | SSW-032, SSW-033 |
| Primary paths | `packages/wallet-actions/**`, `contracts/test/WalletActions*.t.sol` |

## Active feature context

- working/features/wallet-platform-sdk.md

## Objective

Provide typed prepare/preview/simulate actions for native assets, ERC-20, ERC-721, ERC-1155, minting, transfers, approvals, and batches under signer policies.

## Deliverables

- Typed action builders and human-readable previews
- Token/NFT metadata validation boundary
- Synthetic ERC-20/721/1155 test contracts and fixtures

## Non-goals

- DEX or bridge
- Unrestricted arbitrary calls by default
- Trusting unverified remote token metadata

## Acceptance criteria

1. Every action is simulated and policy-checked before authorization
2. Unlimited approvals and unknown selectors receive explicit high-risk treatment
3. Chain, target, amount, recipient, and token ID appear in consent

## Expected failure handling

- Simulation mismatch blocks submission
- Decimals and metadata cannot change authorization amounts
- Batch failure is atomic or explicitly represented

## Validation mapped to acceptance

1. `pnpm --filter @ssw/wallet-actions test`
2. `forge test --root contracts --match-path test/WalletActions*.t.sol`
3. `Malicious-token and revert fixtures`

## Agent prompt

```text
Implement SSW-039: Implement native, token, and NFT wallet actions.

Project: sovereign-smart-wallet
Objective: Provide typed prepare/preview/simulate actions for native assets, ERC-20, ERC-721, ERC-1155, minting, transfers, approvals, and batches under signer policies.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-032, SSW-033.
5. Work only on SSW-039 in an atomic branch. Primary owned paths: packages/wallet-actions/**, contracts/test/WalletActions*.t.sol.


Deliver:
- Typed action builders and human-readable previews
- Token/NFT metadata validation boundary
- Synthetic ERC-20/721/1155 test contracts and fixtures

Do not include:
- DEX or bridge
- Unrestricted arbitrary calls by default
- Trusting unverified remote token metadata

Acceptance criteria:
1. Every action is simulated and policy-checked before authorization
2. Unlimited approvals and unknown selectors receive explicit high-risk treatment
3. Chain, target, amount, recipient, and token ID appear in consent

Error and security behavior:
- Simulation mismatch blocks submission
- Decimals and metadata cannot change authorization amounts
- Batch failure is atomic or explicitly represented
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/wallet-actions test and map the result to acceptance criterion 1.
2. Run forge test --root contracts --match-path test/WalletActions*.t.sol and map the result to acceptance criterion 2.
3. Run Malicious-token and revert fixtures and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
