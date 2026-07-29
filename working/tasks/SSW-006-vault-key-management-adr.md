# SSW-006 — Design and prove the vault key-management boundary

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 2 |
| Lane | vault |
| Dependencies | SSW-003 |
| Primary paths | `docs/decisions/**`, `packages/credential-vault/**`, `docs/threat-model/**` |

## Active feature context

- working/features/encrypted-vault.md

## Objective

Decide and prototype versioned vault key wrapping for WebAuthn PRF-capable and non-PRF browsers without treating a passkey signature as encryption material.

## Deliverables

- ADR for data-encryption keys, wrapping keys, salts, KDF parameters, and recovery factors
- Capability-detection prototype for WebAuthn PRF
- Deterministic crypto test vectors and migration envelope

## Non-goals

- Full IndexedDB vault
- Smart-account deployment
- Inventing cryptographic primitives

## Acceptance criteria

1. PRF absence has a documented secure fallback
2. No wrapping key or recovery secret is persisted plaintext
3. Backup and device-loss consequences are explicit for every strategy

## Expected failure handling

- Unsupported PRF never downgrades silently
- Authentication-tag or envelope-version failures are terminal
- KDF parameters are bounded against resource exhaustion

## Validation mapped to acceptance

1. `WebCrypto unit vectors for encrypt/decrypt/tamper`
2. `Browser capability checks on the supported matrix`
3. `Threat-model review against loss, sync, theft, and rollback`

## Agent prompt

```text
Implement SSW-006: Design and prove the vault key-management boundary.

Project: sovereign-smart-wallet
Objective: Decide and prototype versioned vault key wrapping for WebAuthn PRF-capable and non-PRF browsers without treating a passkey signature as encryption material.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/encrypted-vault.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-003.
5. Work only on SSW-006 in an atomic branch. Primary owned paths: docs/decisions/**, packages/credential-vault/**, docs/threat-model/**.


Deliver:
- ADR for data-encryption keys, wrapping keys, salts, KDF parameters, and recovery factors
- Capability-detection prototype for WebAuthn PRF
- Deterministic crypto test vectors and migration envelope

Do not include:
- Full IndexedDB vault
- Smart-account deployment
- Inventing cryptographic primitives

Acceptance criteria:
1. PRF absence has a documented secure fallback
2. No wrapping key or recovery secret is persisted plaintext
3. Backup and device-loss consequences are explicit for every strategy

Error and security behavior:
- Unsupported PRF never downgrades silently
- Authentication-tag or envelope-version failures are terminal
- KDF parameters are bounded against resource exhaustion
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run WebCrypto unit vectors for encrypt/decrypt/tamper and map the result to acceptance criterion 1.
2. Run Browser capability checks on the supported matrix and map the result to acceptance criterion 2.
3. Run Threat-model review against loss, sync, theft, and rollback and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
