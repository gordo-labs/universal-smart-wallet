# SSW-067 — Build verifier session and scanner SDK methods

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 33 |
| Lane | sdk |
| Dependencies | SSW-057, SSW-060 |
| Primary paths | `packages/identity-sdk/src/verifier/**`, `packages/identity-sdk/src/scanner/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Expose policy/session/request/verify/receipt clients and safe scanner parse/accept/respond orchestration.

## Deliverables

- Verifier client
- Scanner orchestration client
- Receipt polling

## Non-goals

- Camera access
- Persisting presentations
- Offline trust implementation

## Acceptance criteria

1. Results preserve verified/rejected/indeterminate
2. Replay is terminal
3. Receipts contain no disclosed claim values

## Expected failure handling

- No blind response resubmission
- Timeout preserves receipt lookup

## Validation mapped to acceptance

1. `pnpm --filter @ssw/identity-sdk test -- verifier`
2. `Verifier OpenAPI drift check`

## Agent prompt

```text
Implement SSW-067: Build verifier session and scanner SDK methods.

Project: sovereign-smart-wallet
Objective: Expose policy/session/request/verify/receipt clients and safe scanner parse/accept/respond orchestration.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-057, SSW-060.
5. Work only on SSW-067 in an atomic branch. Primary owned paths: packages/identity-sdk/src/verifier/**, packages/identity-sdk/src/scanner/**.


Deliver:
- Verifier client
- Scanner orchestration client
- Receipt polling

Do not include:
- Camera access
- Persisting presentations
- Offline trust implementation

Acceptance criteria:
1. Results preserve verified/rejected/indeterminate
2. Replay is terminal
3. Receipts contain no disclosed claim values

Error and security behavior:
- No blind response resubmission
- Timeout preserves receipt lookup
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/identity-sdk test -- verifier and map the result to acceptance criterion 1.
2. Run Verifier OpenAPI drift check and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
