# SSW-060 — Build the bounded credential QR parser core

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 32 |
| Lane | scanner |
| Dependencies | SSW-057 |
| Primary paths | `packages/credential-scanner/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Parse and classify bounded OpenID4VCI offer, OpenID4VP request, and offline-envelope inputs without camera or navigation side effects.

## Deliverables

- Scanner parser core
- Safe URI classifier
- Replay-token boundary

## Non-goals

- BLE
- NFC
- Biometric capture

## Acceptance criteria

1. Issuance, presentation, and offline inputs are classified
2. Unknown schemes never navigate
3. Malformed, oversized, duplicated, and phishing input fails closed

## Expected failure handling

- Never navigate unknown schemes
- One-time nonces cannot replay

## Completion evidence (2026-08-05)

- `@ssw/credential-scanner` provides a pure, byte-bounded classifier for
  OpenID4VCI offers, OpenID4VP requests, and `ssw-offline://v1` envelopes.
- Unknown schemes, non-HTTPS remote URIs without an explicit allow-list,
  duplicate/unknown parameters, duplicate JSON keys, malformed payloads, and
  oversized inputs fail closed. The parser never opens a browser, camera, or
  network connection.
- `InMemoryReplayTokenBoundary` and the `ReplayTokenBoundary` port provide a
  deterministic one-time replay boundary for offline tokens. Signature and
  freshness verification remain in SSW-072.
- Validation: `pnpm --filter @ssw/credential-scanner test` — 5/5 tests passed,
  including cancellation/fuzz-style bounded-input checks.

## Validation mapped to acceptance

1. `pnpm --filter @ssw/credential-scanner test`
2. `Camera cancellation and parser fuzz tests`

## Agent prompt

```text
Implement SSW-060: Build the bounded credential QR parser core.

Project: sovereign-smart-wallet
Objective: Parse and classify bounded OpenID4VCI offer, OpenID4VP request, and offline-envelope inputs without camera or navigation side effects.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-057.
5. Work only on SSW-060 in an atomic branch. Primary owned paths: packages/credential-scanner/**.


Deliver:
- Scanner parser core
- Safe URI classifier
- Replay-token boundary

Do not include:
- BLE
- NFC
- Biometric capture

Acceptance criteria:
1. Issuance, presentation, and offline inputs are classified
2. Unknown schemes never navigate
3. Malformed, oversized, duplicated, and phishing input fails closed

Error and security behavior:
- Never navigate unknown schemes
- One-time nonces cannot replay
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/credential-scanner test and map the result to acceptance criterion 1.
2. Run Camera cancellation and parser fuzz tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
