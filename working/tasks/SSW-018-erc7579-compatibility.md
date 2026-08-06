# SSW-018 — Integrate and test the pinned ERC-7579 compatibility path

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P1 |
| Wave | 4 |
| Lane | account |
| Dependencies | SSW-016 |
| Primary paths | `packages/account-adapter/**`, `contracts/**`, `docs/decisions/**` |

## Active feature context

- working/features/smart-account-and-passkeys.md

## Objective

Integrate the selected maintained ERC-7579 adapter, prove module install/use/remove behavior locally, and document Draft-standard migration risk.

## Deliverables

- Pinned adapter and module manifest
- Install, use, uninstall, and recovery tests
- Compatibility ADR addendum

## Non-goals

- Writing a new modular account standard
- Installing unreviewed community modules
- Making credentials depend on ERC-7579

## Acceptance criteria

1. Account behavior remains valid before and after module lifecycle
2. Malicious/reverting module fixtures cannot silently seize control
3. Draft version and upgrade path are visible in runtime/deployment metadata

## Expected failure handling

- Module uninstall denial has a documented recovery path
- Fallback/hook authorization is fail-closed
- No delegatecall target is accepted without explicit policy

## Validation mapped to acceptance

1. `Foundry module lifecycle and reentrancy tests`
2. `Account-adapter compatibility tests`
3. `Code-hash and registry-policy checks`

## Agent prompt

```text
Implement SSW-018: Integrate and test the pinned ERC-7579 compatibility path.

Project: universal-smart-wallet
Objective: Integrate the selected maintained ERC-7579 adapter, prove module install/use/remove behavior locally, and document Draft-standard migration risk.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/smart-account-and-passkeys.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-016.
5. Work only on SSW-018 in an atomic branch. Primary owned paths: packages/account-adapter/**, contracts/**, docs/decisions/**.


Deliver:
- Pinned adapter and module manifest
- Install, use, uninstall, and recovery tests
- Compatibility ADR addendum

Do not include:
- Writing a new modular account standard
- Installing unreviewed community modules
- Making credentials depend on ERC-7579

Acceptance criteria:
1. Account behavior remains valid before and after module lifecycle
2. Malicious/reverting module fixtures cannot silently seize control
3. Draft version and upgrade path are visible in runtime/deployment metadata

Error and security behavior:
- Module uninstall denial has a documented recovery path
- Fallback/hook authorization is fail-closed
- No delegatecall target is accepted without explicit policy
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Foundry module lifecycle and reentrancy tests and map the result to acceptance criterion 1.
2. Run Account-adapter compatibility tests and map the result to acceptance criterion 2.
3. Run Code-hash and registry-policy checks and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
