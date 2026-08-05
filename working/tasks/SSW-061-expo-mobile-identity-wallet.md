# SSW-061 — Build React Native identity capability ports

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P1 |
| Wave | 35 |
| Lane | mobile |
| Dependencies | SSW-060, SSW-066, SSW-067 |
| Primary paths | `packages/identity-sdk-react-native/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Expose framework-neutral React Native ports for passkeys, secure storage, camera, lifecycle, and universal/app links.

## Deliverables

- React Native identity adapter
- Native capability ports
- Lifecycle cancellation contract

## Non-goals

- App-store publication
- BLE/NFC
- Replacing EUDI reference wallets

## Acceptance criteria

1. Core identity SDK remains free of React Native imports
2. Lifecycle and deep-link cancellation is safe
3. Secrets remain behind secure-storage ports

## Expected failure handling

- Backgrounding cancels sensitive sessions
- No plaintext backup

## Validation mapped to acceptance

1. `pnpm --filter @ssw/identity-sdk-react-native test`
2. `Bundle and deep-link tests`

## Agent prompt

```text
Implement SSW-061: Build React Native identity capability ports.

Project: sovereign-smart-wallet
Objective: Expose framework-neutral React Native ports for passkeys, secure storage, camera, lifecycle, and universal/app links.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-060, SSW-066, SSW-067.
5. Work only on SSW-061 in an atomic branch. Primary owned paths: packages/identity-sdk-react-native/**.


Deliver:
- React Native identity adapter
- Native capability ports
- Lifecycle cancellation contract

Do not include:
- App-store publication
- BLE/NFC
- Replacing EUDI reference wallets

Acceptance criteria:
1. Core identity SDK remains free of React Native imports
2. Lifecycle and deep-link cancellation is safe
3. Secrets remain behind secure-storage ports

Error and security behavior:
- Backgrounding cancels sensitive sessions
- No plaintext backup
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/identity-sdk-react-native test and map the result to acceptance criterion 1.
2. Run Bundle and deep-link tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
