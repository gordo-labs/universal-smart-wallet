# SSW-051 — Implement replaceable multiformat credential adapters

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Doing |
| Priority | P0 |
| Wave | 29 |
| Lane | credential-format |
| Dependencies | SSW-050 |
| Primary paths | `packages/credential-formats/**`, `packages/sd-jwt-adapter/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Expose one adapter contract for SD-JWT VC, ISO mdoc, W3C VC 2.0 Data Integrity, and legacy JWT-VC inspection.

## Deliverables

- CredentialFormatAdapter
- Pinned adapter registry
- Format-neutral verification result

## Non-goals

- Inventing cryptography
- Full ISO certification
- Accepting legacy JWT-VC for issuance

## Acceptance criteria

1. Adapters share issue/inspect/verify/present boundaries
2. Unsupported versions fail closed
3. Legacy JWT-VC is verify-only

## Expected failure handling

- Reject algorithm confusion
- Reject format downgrade

## Validation mapped to acceptance

1. `pnpm --filter @ssw/credential-formats test`
2. `Cross-format fixtures`

## Agent prompt

```text
Implement SSW-051: Implement replaceable multiformat credential adapters.

Project: sovereign-smart-wallet
Objective: Expose one adapter contract for SD-JWT VC, ISO mdoc, W3C VC 2.0 Data Integrity, and legacy JWT-VC inspection.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-050.
5. Work only on SSW-051 in an atomic branch. Primary owned paths: packages/credential-formats/**, packages/sd-jwt-adapter/**.


Deliver:
- CredentialFormatAdapter
- Pinned adapter registry
- Format-neutral verification result

Do not include:
- Inventing cryptography
- Full ISO certification
- Accepting legacy JWT-VC for issuance

Acceptance criteria:
1. Adapters share issue/inspect/verify/present boundaries
2. Unsupported versions fail closed
3. Legacy JWT-VC is verify-only

Error and security behavior:
- Reject algorithm confusion
- Reject format downgrade
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/credential-formats test and map the result to acceptance criterion 1.
2. Run Cross-format fixtures and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
