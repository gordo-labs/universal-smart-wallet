# SSW-052 — Build the signed off-chain trust and status registry

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 29 |
| Lane | trust |
| Dependencies | SSW-050 |
| Primary paths | `packages/trust-registry/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Register authorized issuers, schemas, keys, jurisdictions, trust marks, revocation and freshness without requiring blockchain availability.

## Deliverables

- TrustRegistryPort
- StatusPort
- Signed snapshot and cache model

## Non-goals

- Legal accreditation
- Mandatory on-chain registry
- Global trust monopoly

## Acceptance criteria

1. Unknown or stale trust is indeterminate
2. Tenant and jurisdiction policies are isolated
3. Key rotation preserves auditability

## Expected failure handling

- Never turn outage into verified
- Reject unsigned snapshots

## Validation mapped to acceptance

1. `pnpm --filter @ssw/trust-registry test`
2. `Offline freshness tests`

## Agent prompt

```text
Implement SSW-052: Build the signed off-chain trust and status registry.

Project: sovereign-smart-wallet
Objective: Register authorized issuers, schemas, keys, jurisdictions, trust marks, revocation and freshness without requiring blockchain availability.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-050.
5. Work only on SSW-052 in an atomic branch. Primary owned paths: packages/trust-registry/**.


Deliver:
- TrustRegistryPort
- StatusPort
- Signed snapshot and cache model

Do not include:
- Legal accreditation
- Mandatory on-chain registry
- Global trust monopoly

Acceptance criteria:
1. Unknown or stale trust is indeterminate
2. Tenant and jurisdiction policies are isolated
3. Key rotation preserves auditability

Error and security behavior:
- Never turn outage into verified
- Reject unsigned snapshots
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/trust-registry test and map the result to acceptance criterion 1.
2. Run Offline freshness tests and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
