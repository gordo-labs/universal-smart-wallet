# SSW-011 — Build the synthetic OpenID4VCI issuer demo

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P1 |
| Wave | 5 |
| Lane | apps |
| Dependencies | SSW-009 |
| Primary paths | `apps/issuer-demo/**` |

## Active feature context

- working/features/credential-exchange.md

## Objective

Build a minimal issuer that creates a synthetic AgeCredential offer and issues a signed is_over_18 credential through the supported local OpenID4VCI flow.

## Deliverables

- Issuer metadata, offer, token, credential, status, and public-key routes
- Clearly synthetic fixture UI
- Deterministic local signing-key lifecycle for tests

## Non-goals

- Real identity proofing
- Production key management
- General issuer administration

## Acceptance criteria

1. A wallet can complete the supported offer flow
2. The UI never asks for or suggests real PII
3. Expired, reused, invalid-code, and revoked fixtures are testable

## Expected failure handling

- Test signing keys are unmistakably non-production
- Errors do not expose tokens or signing material
- Rate and size bounds exist even in the demo

## Validation mapped to acceptance

1. `Issuer route integration tests`
2. `OpenID4VCI contract test against the client package`
3. `Accessibility smoke check`

## Agent prompt

```text
Implement SSW-011: Build the synthetic OpenID4VCI issuer demo.

Project: universal-smart-wallet
Objective: Build a minimal issuer that creates a synthetic AgeCredential offer and issues a signed is_over_18 credential through the supported local OpenID4VCI flow.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/credential-exchange.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-009.
5. Work only on SSW-011 in an atomic branch. Primary owned paths: apps/issuer-demo/**.


Deliver:
- Issuer metadata, offer, token, credential, status, and public-key routes
- Clearly synthetic fixture UI
- Deterministic local signing-key lifecycle for tests

Do not include:
- Real identity proofing
- Production key management
- General issuer administration

Acceptance criteria:
1. A wallet can complete the supported offer flow
2. The UI never asks for or suggests real PII
3. Expired, reused, invalid-code, and revoked fixtures are testable

Error and security behavior:
- Test signing keys are unmistakably non-production
- Errors do not expose tokens or signing material
- Rate and size bounds exist even in the demo
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Issuer route integration tests and map the result to acceptance criterion 1.
2. Run OpenID4VCI contract test against the client package and map the result to acceptance criterion 2.
3. Run Accessibility smoke check and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
