# SSW-013 — Build the OpenID4VP verifier demo

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field         | Value                   |
| ------------- | ----------------------- |
| Status        | Done                    |
| Priority      | P0                      |
| Wave          | 5                       |
| Lane          | apps                    |
| Dependencies  | SSW-010                 |
| Primary paths | `apps/verifier-demo/**` |

## Active feature context

- working/features/verification-trust-and-status.md

## Objective

Build a minimal verifier that generates a DCQL request for is_over_18, tracks state/nonce, validates the presentation off-chain, and grants a local demo session.

## Deliverables

- Request and callback endpoints
- Verification pipeline UI with safe reason codes
- Single-use access-session result

## Non-goals

- On-chain gating
- Real age decisions
- Persistent user accounts

## Acceptance criteria

1. Only a fully valid presentation grants access
2. Every validation class has a tested rejection fixture
3. A rejection reveals no hidden claim-matching information

## Expected failure handling

- Fail closed on unavailable trust/status data
- Do not distinguish consent denial from claim mismatch in a privacy-leaking way
- Never log the full vp_token

## Validation mapped to acceptance

1. `Route and domain integration tests`
2. `Replay and concurrent callback tests`
3. `Accessibility smoke check`

## Completion evidence

- Implemented `apps/verifier-demo` request and direct-post callback routes with
  DCQL generated from the age-over-18 policy.
- Added bounded synthetic VP fixtures for signature, expiry, revocation,
  status, audience/nonce, disclosure, claim, and consent failures.
- Successful verification creates a short-lived access session that is
  consumed once; all rejection paths use stable privacy-safe reason codes.
- Tests: `pnpm --filter @ssw/verifier-demo test` (13 passed), typecheck and
  build passed.

## Agent prompt

```text
Implement SSW-013: Build the OpenID4VP verifier demo.

Project: sovereign-smart-wallet
Objective: Build a minimal verifier that generates a DCQL request for is_over_18, tracks state/nonce, validates the presentation off-chain, and grants a local demo session.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/verification-trust-and-status.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-010.
5. Work only on SSW-013 in an atomic branch. Primary owned paths: apps/verifier-demo/**.


Deliver:
- Request and callback endpoints
- Verification pipeline UI with safe reason codes
- Single-use access-session result

Do not include:
- On-chain gating
- Real age decisions
- Persistent user accounts

Acceptance criteria:
1. Only a fully valid presentation grants access
2. Every validation class has a tested rejection fixture
3. A rejection reveals no hidden claim-matching information

Error and security behavior:
- Fail closed on unavailable trust/status data
- Do not distinguish consent denial from claim mismatch in a privacy-leaking way
- Never log the full vp_token
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Route and domain integration tests and map the result to acceptance criterion 1.
2. Run Replay and concurrent callback tests and map the result to acceptance criterion 2.
3. Run Accessibility smoke check and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
