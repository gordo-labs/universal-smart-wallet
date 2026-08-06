# SSW-024 — Add adversarial, property, fuzz, and redaction hardening

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 9 |
| Lane | quality |
| Dependencies | SSW-014, SSW-021, SSW-022 |
| Primary paths | `tests/**`, `packages/**`, `contracts/test/**`, `docs/threat-model/**` |

## Active feature context

- working/procedures/SECURITY-REVIEW.md

## Objective

Turn the threat model into automated adversarial evidence across parsers, JOSE, replay, vault, recovery, consent, status, modules, and logs.

## Deliverables

- Cross-package property and mutation tests
- Foundry fuzz/invariant suite
- Structured redaction tests and sanitized failure artifacts

## Non-goals

- Independent audit
- Fixing unrelated performance issues
- Production monitoring backend

## Acceptance criteria

1. Every initial threat has at least one test or documented manual control
2. Fuzz/property seeds are reproducible
3. Logs, traces, screenshots, and errors exclude secrets, credentials, and undisclosed claims

## Expected failure handling

- Flaky randomized tests preserve failing seeds
- No test uses real PII or production endpoints
- A sanitizer failure fails CI rather than merely warning

## Validation mapped to acceptance

1. `pnpm test:security`
2. `forge test --root contracts with fuzz/invariants`
3. `Secret/redaction scan of generated artifacts`

## Agent prompt

```text
Implement SSW-024: Add adversarial, property, fuzz, and redaction hardening.

Project: universal-smart-wallet
Objective: Turn the threat model into automated adversarial evidence across parsers, JOSE, replay, vault, recovery, consent, status, modules, and logs.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/procedures/SECURITY-REVIEW.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-014, SSW-021, SSW-022.
5. Work only on SSW-024 in an atomic branch. Primary owned paths: tests/**, packages/**, contracts/test/**, docs/threat-model/**.


Deliver:
- Cross-package property and mutation tests
- Foundry fuzz/invariant suite
- Structured redaction tests and sanitized failure artifacts

Do not include:
- Independent audit
- Fixing unrelated performance issues
- Production monitoring backend

Acceptance criteria:
1. Every initial threat has at least one test or documented manual control
2. Fuzz/property seeds are reproducible
3. Logs, traces, screenshots, and errors exclude secrets, credentials, and undisclosed claims

Error and security behavior:
- Flaky randomized tests preserve failing seeds
- No test uses real PII or production endpoints
- A sanitizer failure fails CI rather than merely warning
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm test:security and map the result to acceptance criterion 1.
2. Run forge test --root contracts with fuzz/invariants and map the result to acceptance criterion 2.
3. Run Secret/redaction scan of generated artifacts and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
