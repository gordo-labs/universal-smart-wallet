# SSW-054 — Build the institutional credential issuer service

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 30 |
| Lane | issuer |
| Dependencies | SSW-051, SSW-052, SSW-053 |
| Primary paths | `apps/issuer-service/**`, `packages/issuer-service/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Issue, reissue, suspend, and revoke institutional credentials through tenant-scoped OpenID4VCI sessions.

## Deliverables

- Issuer REST/OpenAPI contract
- Approval and evidence workflow
- Single-use credential offers

## Non-goals

- Qualified-provider claim
- Persisting raw evidence by default
- Mainnet dependency

## Acceptance criteria

1. Authorization and pre-authorized flows work
2. Offers are expiring and single use
3. Issuance requires authorized template, key, and reviewer policy

## Expected failure handling

- Replay and tenant escape fail closed
- Ambiguous signature blocks issuance

## Validation mapped to acceptance

1. `pnpm --filter @ssw/issuer-service test`
2. `OID4VCI negative tests`

## Agent prompt

```text
Implement SSW-054: Build the institutional credential issuer service.

Project: sovereign-smart-wallet
Objective: Issue, reissue, suspend, and revoke institutional credentials through tenant-scoped OpenID4VCI sessions.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-051, SSW-052, SSW-053.
5. Work only on SSW-054 in an atomic branch. Primary owned paths: apps/issuer-service/**, packages/issuer-service/**.


Deliver:
- Issuer REST/OpenAPI contract
- Approval and evidence workflow
- Single-use credential offers

Do not include:
- Qualified-provider claim
- Persisting raw evidence by default
- Mainnet dependency

Acceptance criteria:
1. Authorization and pre-authorized flows work
2. Offers are expiring and single use
3. Issuance requires authorized template, key, and reviewer policy

Error and security behavior:
- Replay and tenant escape fail closed
- Ambiguous signature blocks issuance
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/issuer-service test and map the result to acceptance criterion 1.
2. Run OID4VCI negative tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
