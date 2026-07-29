# SSW-005 — Implement nonce, replay, and verification-result domain logic

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 3 |
| Lane | credential-core |
| Dependencies | SSW-004 |
| Primary paths | `packages/credential-domain/**`, `packages/shared-types/**` |

## Active feature context

- working/features/verification-trust-and-status.md

## Objective

Build infrastructure-free challenge generation, state/nonce lifecycle, atomic single-use replay protection, verification-result construction, and stable error codes.

## Deliverables

- Cryptographically strong challenge generator behind an injectable port
- TTL-aware atomic replay store interface plus in-memory adapter
- Verification pipeline result and failure taxonomy

## Non-goals

- HTTP endpoints
- Credential signature verification
- Persistent production database

## Acceptance criteria

1. Challenges provide at least 128 bits of entropy
2. Concurrent reuse consumes a challenge at most once
3. Expired, wrong-audience, unknown, and reused challenges produce distinct safe errors

## Expected failure handling

- Never log raw presentation tokens or secrets
- Clock skew policy is explicit and bounded
- Storage failure cannot turn a rejected replay into acceptance

## Validation mapped to acceptance

1. `Unit and concurrency tests with deterministic clock/random ports`
2. `Property tests for challenge encoding and TTL boundaries`
3. `pnpm typecheck`

## Agent prompt

```text
Implement SSW-005: Implement nonce, replay, and verification-result domain logic.

Project: sovereign-smart-wallet
Objective: Build infrastructure-free challenge generation, state/nonce lifecycle, atomic single-use replay protection, verification-result construction, and stable error codes.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/verification-trust-and-status.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-004.
5. Work only on SSW-005 in an atomic branch. Primary owned paths: packages/credential-domain/**, packages/shared-types/**.


Deliver:
- Cryptographically strong challenge generator behind an injectable port
- TTL-aware atomic replay store interface plus in-memory adapter
- Verification pipeline result and failure taxonomy

Do not include:
- HTTP endpoints
- Credential signature verification
- Persistent production database

Acceptance criteria:
1. Challenges provide at least 128 bits of entropy
2. Concurrent reuse consumes a challenge at most once
3. Expired, wrong-audience, unknown, and reused challenges produce distinct safe errors

Error and security behavior:
- Never log raw presentation tokens or secrets
- Clock skew policy is explicit and bounded
- Storage failure cannot turn a rejected replay into acceptance
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Unit and concurrency tests with deterministic clock/random ports and map the result to acceptance criterion 1.
2. Run Property tests for challenge encoding and TTL boundaries and map the result to acceptance criterion 2.
3. Run pnpm typecheck and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```

## Completion evidence (2026-07-29)

- Acceptance 1: **Pass** — default challenges use 32 random bytes and reject
  configured entropy below 16 bytes; deterministic encoding round-trip tested.
- Acceptance 2: **Pass** — consume marks before return and reuse test proves a
  challenge is accepted at most once.
- Acceptance 3: **Pass** — unknown, expired, wrong-audience, and reused codes
  are distinct; replay-store exceptions return `REPLAY_STORE_FAILURE`.
- Checks: package build (pass), package tests (4, pass), `pnpm typecheck`
  (pass).
