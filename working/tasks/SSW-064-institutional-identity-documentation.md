# SSW-064 — Publish Identity SDK and protocol developer documentation

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P1 |
| Wave | 35 |
| Lane | documentation |
| Dependencies | SSW-057, SSW-065, SSW-066, SSW-067 |
| Primary paths | `apps/docs/**`, `docs/identity-platform/**`, `DOCS-MAP.md`, `working/orchestration/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Document public issuer, holder, verifier, scanner, transport, error, protocol, and format APIs with tested examples.

## Deliverables

- Identity developer reference
- Protocol and format guides
- Tested SDK examples

## Non-goals

- Publishing packages
- Deploying docs
- Certification claim

## Acceptance criteria

1. Every public method links to a passing example
2. Version pins and limitations are explicit
3. Generated API examples cannot drift

## Expected failure handling

- No stale copied examples
- No unsupported standards claim

## Validation mapped to acceptance

1. `pnpm --filter @ssw/docs build`
2. `Documentation and claims audit`

## Agent prompt

```text
Implement SSW-064: Publish Identity SDK and protocol developer documentation.

Project: universal-smart-wallet
Objective: Document public issuer, holder, verifier, scanner, transport, error, protocol, and format APIs with tested examples.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-057, SSW-065, SSW-066, SSW-067.
5. Work only on SSW-064 in an atomic branch. Primary owned paths: apps/docs/**, docs/identity-platform/**, DOCS-MAP.md, working/orchestration/**.


Deliver:
- Identity developer reference
- Protocol and format guides
- Tested SDK examples

Do not include:
- Publishing packages
- Deploying docs
- Certification claim

Acceptance criteria:
1. Every public method links to a passing example
2. Version pins and limitations are explicit
3. Generated API examples cannot drift

Error and security behavior:
- No stale copied examples
- No unsupported standards claim
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/docs build and map the result to acceptance criterion 1.
2. Run Documentation and claims audit and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
