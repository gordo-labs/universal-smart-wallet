# SSW-020 — Implement issuer trust and credential status/revocation

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 5 |
| Lane | verification |
| Dependencies | SSW-009, SSW-010 |
| Primary paths | `packages/credential-domain/**`, `packages/openid4vc/**`, `apps/issuer-demo/**`, `apps/verifier-demo/**` |

## Active feature context

- working/features/verification-trust-and-status.md

## Objective

Implement a versioned local trust policy and the pinned status mechanism with bounded fetching, cache freshness, issuer key rotation, and deterministic revocation fixtures.

## Deliverables

- Trust-bundle schema and policy evaluator
- Status fetch/cache adapter and issuer demo endpoints
- Valid, revoked, suspended, stale, unavailable, and rotated-key fixtures

## Non-goals

- Global governance marketplace
- Production trust authority
- Putting credential status or PII on-chain

## Acceptance criteria

1. Revoked/suspended credentials are rejected
2. Unknown issuer and stale/unavailable status follow explicit fail-closed policy
3. Status lookup does not leak holder-specific identifiers

## Expected failure handling

- No silent acceptance on network failure
- Issuer key rotation cannot validate with an untrusted replacement key
- Error copy distinguishes retryable infrastructure failure from invalid credential without leaking claims

## Validation mapped to acceptance

1. `Trust and status unit/contract tests`
2. `Cache/clock/rotation boundary tests`
3. `SSRF, response-size, and timeout tests`

## Agent prompt

```text
Implement SSW-020: Implement issuer trust and credential status/revocation.

Project: universal-smart-wallet
Objective: Implement a versioned local trust policy and the pinned status mechanism with bounded fetching, cache freshness, issuer key rotation, and deterministic revocation fixtures.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/verification-trust-and-status.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-009, SSW-010.
5. Work only on SSW-020 in an atomic branch. Primary owned paths: packages/credential-domain/**, packages/openid4vc/**, apps/issuer-demo/**, apps/verifier-demo/**.


Deliver:
- Trust-bundle schema and policy evaluator
- Status fetch/cache adapter and issuer demo endpoints
- Valid, revoked, suspended, stale, unavailable, and rotated-key fixtures

Do not include:
- Global governance marketplace
- Production trust authority
- Putting credential status or PII on-chain

Acceptance criteria:
1. Revoked/suspended credentials are rejected
2. Unknown issuer and stale/unavailable status follow explicit fail-closed policy
3. Status lookup does not leak holder-specific identifiers

Error and security behavior:
- No silent acceptance on network failure
- Issuer key rotation cannot validate with an untrusted replacement key
- Error copy distinguishes retryable infrastructure failure from invalid credential without leaking claims
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Trust and status unit/contract tests and map the result to acceptance criterion 1.
2. Run Cache/clock/rotation boundary tests and map the result to acceptance criterion 2.
3. Run SSRF, response-size, and timeout tests and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
