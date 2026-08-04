# SSW-038 — Implement in-place rotation and full wallet portability

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 18 |
| Lane | portability |
| Dependencies | SSW-031, SSW-032, SSW-033, SSW-037 |
| Primary paths | `packages/wallet-portability/**` |

## Active feature context

- working/features/wallet-platform-sdk.md

## Objective

Support vendor rotation on the same Safe and a signed, versioned, encrypted full export/import bundle for migration to another service or wallet.

## Deliverables

- In-place signer/module rotation protocol
- Portable encrypted migration bundle
- Import validation, rollback, and compatibility report

## Non-goals

- Silent asset sweeping
- Plaintext key export
- Vendor-specific bundle fields

## Acceptance criteria

1. In-place migration preserves address, DID, assets, and history
2. Full export is integrity-protected, encrypted, and user-authorized
3. The old vendor signer is removed only after the new control path succeeds

## Expected failure handling

- Migration interruption leaves at least one valid user recovery path
- Reject unknown mandatory bundle versions
- Never claim portability when upstream account modules block rotation

## Validation mapped to acceptance

1. `pnpm --filter @ssw/wallet-portability test`
2. `Cross-adapter round-trip fixtures`
3. `Tamper, downgrade, interruption, and rollback tests`

## Agent prompt

```text
Implement SSW-038: Implement in-place rotation and full wallet portability.

Project: sovereign-smart-wallet
Objective: Support vendor rotation on the same Safe and a signed, versioned, encrypted full export/import bundle for migration to another service or wallet.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-031, SSW-032, SSW-033, SSW-037.
5. Work only on SSW-038 in an atomic branch. Primary owned paths: packages/wallet-portability/**.


Deliver:
- In-place signer/module rotation protocol
- Portable encrypted migration bundle
- Import validation, rollback, and compatibility report

Do not include:
- Silent asset sweeping
- Plaintext key export
- Vendor-specific bundle fields

Acceptance criteria:
1. In-place migration preserves address, DID, assets, and history
2. Full export is integrity-protected, encrypted, and user-authorized
3. The old vendor signer is removed only after the new control path succeeds

Error and security behavior:
- Migration interruption leaves at least one valid user recovery path
- Reject unknown mandatory bundle versions
- Never claim portability when upstream account modules block rotation
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/wallet-portability test and map the result to acceptance criterion 1.
2. Run Cross-adapter round-trip fixtures and map the result to acceptance criterion 2.
3. Run Tamper, downgrade, interruption, and rollback tests and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
