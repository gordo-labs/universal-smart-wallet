# SSW-048 — Publish complete local Wallet Platform documentation

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P1 |
| Wave | 18 |
| Lane | documentation |
| Dependencies | SSW-047 |
| Primary paths | `apps/docs/**`, `docs/platform/**`, `README.md`, `DOCS-MAP.md` |

## Active feature context

- working/features/wallet-platform-sdk.md
- working/roadmap/future/identity-platform-expansions.md

## Objective

Document the implemented SDK, API, auth modules, email self-hosting, OIDC, portability, wallet app, admin console, examples, operations, security limits, and future identity expansions.

## Deliverables

- Platform sections in the Next.js documentation app
- Generated OpenAPI/SDK reference and tested examples
- Self-hosting, migration, custody, Base-to-Scroll, and future-expansion guides

## Non-goals

- Publishing npm packages
- Deploying documentation
- Claiming unimplemented future standards

## Acceptance criteria

1. Every public method and use case links to a passing example
2. Email-only custody and portability guarantees are accurately described
3. Future formats and ZK/privacy-native adapters are clearly marked unimplemented

## Expected failure handling

- Do not copy stale examples by hand when tests can generate them
- No production-readiness or audit claim
- Broken or unsupported adapters remain visible limitations

## Validation mapped to acceptance

1. `pnpm --filter @ssw/docs build`
2. `Documentation link and code-sample tests`
3. `Claims-versus-implementation audit`

## Agent prompt

```text
Implement SSW-048: Publish complete local Wallet Platform documentation.

Project: sovereign-smart-wallet
Objective: Document the implemented SDK, API, auth modules, email self-hosting, OIDC, portability, wallet app, admin console, examples, operations, security limits, and future identity expansions.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md, working/roadmap/future/identity-platform-expansions.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-047.
5. Work only on SSW-048 in an atomic branch. Primary owned paths: apps/docs/**, docs/platform/**, README.md, DOCS-MAP.md.


Deliver:
- Platform sections in the Next.js documentation app
- Generated OpenAPI/SDK reference and tested examples
- Self-hosting, migration, custody, Base-to-Scroll, and future-expansion guides

Do not include:
- Publishing npm packages
- Deploying documentation
- Claiming unimplemented future standards

Acceptance criteria:
1. Every public method and use case links to a passing example
2. Email-only custody and portability guarantees are accurately described
3. Future formats and ZK/privacy-native adapters are clearly marked unimplemented

Error and security behavior:
- Do not copy stale examples by hand when tests can generate them
- No production-readiness or audit claim
- Broken or unsupported adapters remain visible limitations
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/docs build and map the result to acceptance criterion 1.
2. Run Documentation link and code-sample tests and map the result to acceptance criterion 2.
3. Run Claims-versus-implementation audit and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
