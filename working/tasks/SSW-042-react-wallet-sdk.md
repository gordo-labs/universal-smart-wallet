# SSW-042 — Build framework-neutral React wallet bindings

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Doing |
| Priority | P1 |
| Wave | 21 |
| Lane | sdk |
| Dependencies | SSW-034, SSW-035, SSW-036, SSW-041 |
| Primary paths | `packages/wallet-sdk-react/**` |

## Active feature context

- working/features/wallet-platform-sdk.md

## Objective

Expose configurable React providers and hooks for auth, wallets, balances, transactions, signers, DID, and portability without requiring Next.js.

## Deliverables

- WalletProvider and modular auth configuration
- useAuth/useWallet/useBalances/useTransaction/useSigners/useDid/usePortability hooks
- Accessible loading, cancellation, error, and step-up states

## Non-goals

- Product-specific visual design
- Next.js-only APIs
- Silent transaction approval

## Acceptance criteria

1. Auth modules can be installed independently
2. Hooks handle cancellation, stale requests, wallet switching, and step-up
3. No hook exposes secret or full credential values

## Expected failure handling

- Provider changes clear stale privileged state
- Unmounted flows cannot submit operations
- UI errors remain privacy-safe

## Validation mapped to acceptance

1. `pnpm --filter @ssw/wallet-sdk-react test`
2. `React strict-mode and concurrency tests`
3. `Bundle and accessibility checks`

## Agent prompt

```text
Implement SSW-042: Build framework-neutral React wallet bindings.

Project: sovereign-smart-wallet
Objective: Expose configurable React providers and hooks for auth, wallets, balances, transactions, signers, DID, and portability without requiring Next.js.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-034, SSW-035, SSW-036, SSW-041.
5. Work only on SSW-042 in an atomic branch. Primary owned paths: packages/wallet-sdk-react/**.


Deliver:
- WalletProvider and modular auth configuration
- useAuth/useWallet/useBalances/useTransaction/useSigners/useDid/usePortability hooks
- Accessible loading, cancellation, error, and step-up states

Do not include:
- Product-specific visual design
- Next.js-only APIs
- Silent transaction approval

Acceptance criteria:
1. Auth modules can be installed independently
2. Hooks handle cancellation, stale requests, wallet switching, and step-up
3. No hook exposes secret or full credential values

Error and security behavior:
- Provider changes clear stale privileged state
- Unmounted flows cannot submit operations
- UI errors remain privacy-safe
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/wallet-sdk-react test and map the result to acceptance criterion 1.
2. Run React strict-mode and concurrency tests and map the result to acceptance criterion 2.
3. Run Bundle and accessibility checks and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
