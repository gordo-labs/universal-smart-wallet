# SSW-061 — Build the Expo React Native identity wallet and SDK

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P1 |
| Wave | 33 |
| Lane | mobile |
| Dependencies | SSW-059, SSW-060 |
| Primary paths | `apps/wallet-mobile/**`, `packages/identity-sdk-react-native/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Provide passkeys, secure storage, camera, QR, universal links, issuance, presentation, and verification on iOS and Android.

## Deliverables

- Expo app
- React Native identity SDK
- Native capability ports

## Non-goals

- App-store publication
- BLE/NFC
- Replacing EUDI reference wallets

## Acceptance criteria

1. Core works without Expo imports
2. Camera and deep-link lifecycle is safe
3. Secrets remain in secure-storage ports

## Expected failure handling

- Backgrounding cancels sensitive sessions
- No plaintext backup

## Validation mapped to acceptance

1. `pnpm --filter @ssw/wallet-mobile test`
2. `Expo export and deep-link tests`

## Agent prompt

```text
Implement SSW-061: Build the Expo React Native identity wallet and SDK.

Project: sovereign-smart-wallet
Objective: Provide passkeys, secure storage, camera, QR, universal links, issuance, presentation, and verification on iOS and Android.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-059, SSW-060.
5. Work only on SSW-061 in an atomic branch. Primary owned paths: apps/wallet-mobile/**, packages/identity-sdk-react-native/**.


Deliver:
- Expo app
- React Native identity SDK
- Native capability ports

Do not include:
- App-store publication
- BLE/NFC
- Replacing EUDI reference wallets

Acceptance criteria:
1. Core works without Expo imports
2. Camera and deep-link lifecycle is safe
3. Secrets remain in secure-storage ports

Error and security behavior:
- Backgrounding cancels sensitive sessions
- No plaintext backup
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/wallet-mobile test and map the result to acceptance criterion 1.
2. Run Expo export and deep-link tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
