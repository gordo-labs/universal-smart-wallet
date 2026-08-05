# SSW-072 — Implement signed offline QR verification and freshness policy

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 35 |
| Lane | scanner |
| Dependencies | SSW-052, SSW-060, SSW-067 |
| Primary paths | `packages/credential-scanner/src/offline/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Verify bounded signed offline envelopes against cached trust/status and return indeterminate when freshness is insufficient.

## Deliverables

- Offline envelope v1
- Freshness evaluator
- Cached trust/status resolver

## Non-goals

- BLE/NFC
- Online status fallback disguised as offline
- Large credential payloads

## Acceptance criteria

1. Fresh signed envelopes verify
2. Stale/unknown trust is indeterminate
3. Tamper, replay, and downgrade fail closed

## Expected failure handling

- No stale-to-verified transition
- Reject unbounded QR payloads

## Validation mapped to acceptance

1. `pnpm --filter @ssw/credential-scanner test -- offline`
2. `Deterministic clock and mutation tests`

## Agent prompt

```text
Implement SSW-072: Implement signed offline QR verification and freshness policy.

Project: sovereign-smart-wallet
Objective: Verify bounded signed offline envelopes against cached trust/status and return indeterminate when freshness is insufficient.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-052, SSW-060, SSW-067.
5. Work only on SSW-072 in an atomic branch. Primary owned paths: packages/credential-scanner/src/offline/**.


Deliver:
- Offline envelope v1
- Freshness evaluator
- Cached trust/status resolver

Do not include:
- BLE/NFC
- Online status fallback disguised as offline
- Large credential payloads

Acceptance criteria:
1. Fresh signed envelopes verify
2. Stale/unknown trust is indeterminate
3. Tamper, replay, and downgrade fail closed

Error and security behavior:
- No stale-to-verified transition
- Reject unbounded QR payloads
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/credential-scanner test -- offline and map the result to acceptance criterion 1.
2. Run Deterministic clock and mutation tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
