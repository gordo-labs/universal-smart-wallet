# SSW-034 — Build the modular passkey authentication adapter

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 17 |
| Lane | authentication |
| Dependencies | SSW-030, SSW-033 |
| Primary paths | `packages/auth-passkey/**` |

## Active feature context

- working/features/wallet-platform-sdk.md
- working/features/smart-account-and-passkeys.md

## Objective

Provide browser/server passkey registration, authentication, step-up, account binding, rotation, and removal while reusing the existing WebAuthn security boundary.

## Deliverables

- Passkey auth ports and browser adapter
- Server challenge and binding verifier
- Deterministic WebAuthn fixtures

## Non-goals

- Hardware-specific SDK
- Using signatures as vault encryption keys
- Assuming WebAuthn PRF support

## Acceptance criteria

1. Origin, RP ID, challenge, account, user verification, and code hash are bound
2. Rotation preserves account/DID identity
3. Cancellation and unsupported authenticators are actionable

## Expected failure handling

- Never downgrade user verification silently
- PRF absence uses the documented fallback
- Remove the old signer only after the replacement is proven

## Validation mapped to acceptance

1. `pnpm --filter @ssw/auth-passkey test`
2. `Mutation tests for WebAuthn context`
3. `Browser capability smoke tests`

## Agent prompt

```text
Implement SSW-034: Build the modular passkey authentication adapter.

Project: universal-smart-wallet
Objective: Provide browser/server passkey registration, authentication, step-up, account binding, rotation, and removal while reusing the existing WebAuthn security boundary.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md, working/features/smart-account-and-passkeys.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-030, SSW-033.
5. Work only on SSW-034 in an atomic branch. Primary owned paths: packages/auth-passkey/**.


Deliver:
- Passkey auth ports and browser adapter
- Server challenge and binding verifier
- Deterministic WebAuthn fixtures

Do not include:
- Hardware-specific SDK
- Using signatures as vault encryption keys
- Assuming WebAuthn PRF support

Acceptance criteria:
1. Origin, RP ID, challenge, account, user verification, and code hash are bound
2. Rotation preserves account/DID identity
3. Cancellation and unsupported authenticators are actionable

Error and security behavior:
- Never downgrade user verification silently
- PRF absence uses the documented fallback
- Remove the old signer only after the replacement is proven
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/auth-passkey test and map the result to acceptance criterion 1.
2. Run Mutation tests for WebAuthn context and map the result to acceptance criterion 2.
3. Run Browser capability smoke tests and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
