# SSW-049 — Define institutional identity, assurance, and EUDI architecture

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 27 |
| Lane | architecture |
| Dependencies | SSW-048 |
| Primary paths | `docs/decisions/SSW-049-*.md`, `working/features/institutional-identity-platform.md` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Fix the issuer-holder-verifier architecture, assurance semantics, EUDI target, standards pins, and privacy boundaries.

## Deliverables

- Institutional identity ADR
- Assurance and actor model
- Standards and dependency profile

## Non-goals

- Certification claim
- Production issuer onboarding
- Custom cryptography

## Acceptance criteria

1. Institutional and self-attested credentials cannot be confused
2. PID/EAA/QEAA roles are explicit
3. EUDI target and unimplemented certification are explicit

## Expected failure handling

- Fail closed on unknown assurance
- No legal qualification inference

## Validation mapped to acceptance

1. `Architecture invariant tests`
2. `Documentation link check`

## Agent prompt

```text
Implement SSW-049: Define institutional identity, assurance, and EUDI architecture.

Project: universal-smart-wallet
Objective: Fix the issuer-holder-verifier architecture, assurance semantics, EUDI target, standards pins, and privacy boundaries.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-048.
5. Work only on SSW-049 in an atomic branch. Primary owned paths: docs/decisions/SSW-049-*.md, working/features/institutional-identity-platform.md.


Deliver:
- Institutional identity ADR
- Assurance and actor model
- Standards and dependency profile

Do not include:
- Certification claim
- Production issuer onboarding
- Custom cryptography

Acceptance criteria:
1. Institutional and self-attested credentials cannot be confused
2. PID/EAA/QEAA roles are explicit
3. EUDI target and unimplemented certification are explicit

Error and security behavior:
- Fail closed on unknown assurance
- No legal qualification inference
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Architecture invariant tests and map the result to acceptance criterion 1.
2. Run Documentation link check and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
