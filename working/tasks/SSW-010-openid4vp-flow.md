# SSW-010 — Implement the OpenID4VP and DCQL presentation flow

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 4 |
| Lane | protocol |
| Dependencies | SSW-005, SSW-008 |
| Primary paths | `packages/openid4vc/**`, `packages/presentation-policy/**`, `packages/test-fixtures/**` |

## Active feature context

- working/features/credential-exchange.md
- working/features/verification-trust-and-status.md

## Objective

Implement the supported OpenID4VP 1.0 same-device request/response path using DCQL, direct_post, state/nonce, audience, holder binding, and strict disclosure selection.

## Deliverables

- Wallet request parser and candidate selector
- Verifier request builder and response verifier
- Signed/request-URI trust hooks and negative protocol fixtures

## Non-goals

- Silent presentation
- All client identifier schemes
- Digital Credentials API integration

## Acceptance criteria

1. Wrong audience, nonce, state, holder key, response URI, and disclosure set are rejected
2. Only holder-approved claims enter the presentation
3. Replay state is consumed atomically

## Expected failure handling

- Unknown transaction_data is rejected as required
- Ambiguous verifier identity blocks consent
- Mismatched or duplicate response parameters fail closed

## Validation mapped to acceptance

1. `Protocol contract tests`
2. `Cross-device URI parsing fuzz/property tests`
3. `No-network happy and failure flows`

## Agent prompt

```text
Implement SSW-010: Implement the OpenID4VP and DCQL presentation flow.

Project: sovereign-smart-wallet
Objective: Implement the supported OpenID4VP 1.0 same-device request/response path using DCQL, direct_post, state/nonce, audience, holder binding, and strict disclosure selection.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/credential-exchange.md, working/features/verification-trust-and-status.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-005, SSW-008.
5. Work only on SSW-010 in an atomic branch. Primary owned paths: packages/openid4vc/**, packages/presentation-policy/**, packages/test-fixtures/**.


Deliver:
- Wallet request parser and candidate selector
- Verifier request builder and response verifier
- Signed/request-URI trust hooks and negative protocol fixtures

Do not include:
- Silent presentation
- All client identifier schemes
- Digital Credentials API integration

Acceptance criteria:
1. Wrong audience, nonce, state, holder key, response URI, and disclosure set are rejected
2. Only holder-approved claims enter the presentation
3. Replay state is consumed atomically

Error and security behavior:
- Unknown transaction_data is rejected as required
- Ambiguous verifier identity blocks consent
- Mismatched or duplicate response parameters fail closed
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Protocol contract tests and map the result to acceptance criterion 1.
2. Run Cross-device URI parsing fuzz/property tests and map the result to acceptance criterion 2.
3. Run No-network happy and failure flows and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
