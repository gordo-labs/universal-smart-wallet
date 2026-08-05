# SSW-056 — Build the credential verification service

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Doing |
| Priority | P0 |
| Wave | 30 |
| Lane | verifier |
| Dependencies | SSW-051, SSW-052 |
| Primary paths | `apps/verifier-service/**`, `packages/verifier-service/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Create OpenID4VP verification sessions and minimal receipts with signature, binding, policy, trust, expiry, and status checks.

## Deliverables

- Verifier REST/OpenAPI contract
- Verification policy engine
- Minimal verification receipts

## Non-goals

- Storing full presentations
- Biometric matching
- Certification claim

## Acceptance criteria

1. Results are verified/rejected/indeterminate
2. Offline stale status cannot verify
3. Only policy-requested claims reach the verifier

## Expected failure handling

- Consume state before verification
- Fail closed on trust outage

## Validation mapped to acceptance

1. `pnpm --filter @ssw/verifier-service test`
2. `OpenID4VP replay and disclosure tests`

## Agent prompt

```text
Implement SSW-056: Build the credential verification service.

Project: sovereign-smart-wallet
Objective: Create OpenID4VP verification sessions and minimal receipts with signature, binding, policy, trust, expiry, and status checks.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-051, SSW-052.
5. Work only on SSW-056 in an atomic branch. Primary owned paths: apps/verifier-service/**, packages/verifier-service/**.


Deliver:
- Verifier REST/OpenAPI contract
- Verification policy engine
- Minimal verification receipts

Do not include:
- Storing full presentations
- Biometric matching
- Certification claim

Acceptance criteria:
1. Results are verified/rejected/indeterminate
2. Offline stale status cannot verify
3. Only policy-requested claims reach the verifier

Error and security behavior:
- Consume state before verification
- Fail closed on trust outage
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/verifier-service test and map the result to acceptance criterion 1.
2. Run OpenID4VP replay and disclosure tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
