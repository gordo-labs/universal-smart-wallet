# SSW-077 — Add adversarial and privacy tests for institutional identity

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 40 |
| Lane | security |
| Dependencies | SSW-063 |
| Primary paths | `tests/security/identity-*.test.mjs`, `docs/audit/identity-platform-security.md` |

## Active feature context

- working/features/institutional-identity-platform.md
- working/procedures/SECURITY-REVIEW.md

## Objective

Attack assurance, tenant, key rotation, status, disclosure, QR, deep-link, offline, and mobile lifecycle boundaries.

## Deliverables

- Adversarial matrix
- Privacy/redaction scan
- Security gap report

## Non-goals

- Independent audit claim
- Fuzzing external providers
- Production PII

## Acceptance criteria

1. Assurance escalation and tenant escape fail closed
2. Logs/artifacts contain no PII or credentials
3. Randomized failures preserve seeds

## Expected failure handling

- Skipped required attack blocks green
- Outage is not a pass

## Validation mapped to acceptance

1. `pnpm test:security`
2. `Identity artifact redaction scan`

## Agent prompt

```text
Implement SSW-077: Add adversarial and privacy tests for institutional identity.

Project: universal-smart-wallet
Objective: Attack assurance, tenant, key rotation, status, disclosure, QR, deep-link, offline, and mobile lifecycle boundaries.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md, working/procedures/SECURITY-REVIEW.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-063.
5. Work only on SSW-077 in an atomic branch. Primary owned paths: tests/security/identity-*.test.mjs, docs/audit/identity-platform-security.md.


Deliver:
- Adversarial matrix
- Privacy/redaction scan
- Security gap report

Do not include:
- Independent audit claim
- Fuzzing external providers
- Production PII

Acceptance criteria:
1. Assurance escalation and tenant escape fail closed
2. Logs/artifacts contain no PII or credentials
3. Randomized failures preserve seeds

Error and security behavior:
- Skipped required attack blocks green
- Outage is not a pass
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm test:security and map the result to acceptance criterion 1.
2. Run Identity artifact redaction scan and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
