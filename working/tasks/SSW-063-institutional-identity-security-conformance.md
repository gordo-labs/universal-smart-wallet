# SSW-063 — Adversarially test identity flows and EUDI readiness

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 35 |
| Lane | security |
| Dependencies | SSW-062 |
| Primary paths | `tests/identity-platform/**`, `scripts/verify-identity-platform.mjs`, `docs/audit/identity-platform-*.md` |

## Active feature context

- working/features/institutional-identity-platform.md
- working/procedures/SECURITY-REVIEW.md

## Objective

Prove issuer-wallet-verifier and scanner flows, privacy, assurance, tenancy, status, key rotation, and EUDI/HAIP readiness gaps.

## Deliverables

- Identity E2E gate
- Adversarial matrix
- Conformance evidence and gap report

## Non-goals

- Self-certification
- Production PII
- Legal approval

## Acceptance criteria

1. All formats and sector journeys pass locally
2. Assurance escalation, replay, phishing, tenant escape, key and status attacks fail closed
3. Evidence distinguishes tested, blocked, and external conformance

## Expected failure handling

- Skipped required case blocks green
- No certification claim

## Validation mapped to acceptance

1. `node scripts/verify-identity-platform.mjs`
2. `Security and artifact redaction scan`

## Agent prompt

```text
Implement SSW-063: Adversarially test identity flows and EUDI readiness.

Project: sovereign-smart-wallet
Objective: Prove issuer-wallet-verifier and scanner flows, privacy, assurance, tenancy, status, key rotation, and EUDI/HAIP readiness gaps.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md, working/procedures/SECURITY-REVIEW.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-062.
5. Work only on SSW-063 in an atomic branch. Primary owned paths: tests/identity-platform/**, scripts/verify-identity-platform.mjs, docs/audit/identity-platform-*.md.


Deliver:
- Identity E2E gate
- Adversarial matrix
- Conformance evidence and gap report

Do not include:
- Self-certification
- Production PII
- Legal approval

Acceptance criteria:
1. All formats and sector journeys pass locally
2. Assurance escalation, replay, phishing, tenant escape, key and status attacks fail closed
3. Evidence distinguishes tested, blocked, and external conformance

Error and security behavior:
- Skipped required case blocks green
- No certification claim
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run node scripts/verify-identity-platform.mjs and map the result to acceptance criterion 1.
2. Run Security and artifact redaction scan and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
