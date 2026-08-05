# SSW-078 — Produce EUDI and HAIP readiness evidence

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P1 |
| Wave | 41 |
| Lane | conformance |
| Dependencies | SSW-077 |
| Primary paths | `tests/conformance/**`, `docs/audit/eudi-haip-readiness.md` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Map implemented behavior to pinned EUDI ARF, OpenID4VCI/VP, HAIP, SD-JWT VC, and mdoc requirements with tested/blocked/external status.

## Deliverables

- Conformance matrix
- Automated profile checks
- External certification blockers

## Non-goals

- Self-certification
- Legal opinion
- Qualified-provider claim

## Acceptance criteria

1. Every requirement has evidence or blocker
2. Version pins are explicit
3. No certification language is emitted

## Expected failure handling

- Unknown requirement remains blocked
- No inferred compliance

## Validation mapped to acceptance

1. `Conformance matrix validator`
2. `Claims-versus-evidence test`

## Agent prompt

```text
Implement SSW-078: Produce EUDI and HAIP readiness evidence.

Project: sovereign-smart-wallet
Objective: Map implemented behavior to pinned EUDI ARF, OpenID4VCI/VP, HAIP, SD-JWT VC, and mdoc requirements with tested/blocked/external status.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-077.
5. Work only on SSW-078 in an atomic branch. Primary owned paths: tests/conformance/**, docs/audit/eudi-haip-readiness.md.


Deliver:
- Conformance matrix
- Automated profile checks
- External certification blockers

Do not include:
- Self-certification
- Legal opinion
- Qualified-provider claim

Acceptance criteria:
1. Every requirement has evidence or blocker
2. Version pins are explicit
3. No certification language is emitted

Error and security behavior:
- Unknown requirement remains blocked
- No inferred compliance
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Conformance matrix validator and map the result to acceptance criterion 1.
2. Run Claims-versus-evidence test and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
