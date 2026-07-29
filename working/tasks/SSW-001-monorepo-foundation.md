# SSW-001 — Bootstrap the executable monorepo foundation

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 0 |
| Lane | foundation |
| Dependencies | None |
| Primary paths | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig*`, `apps/**`, `packages/**`, `contracts/**` |

## Active feature context

- working/maps/TECHNICAL-MAP.md

## Objective

Create a minimal installable pnpm monorepo with strict TypeScript, one formatting strategy, root validation scripts, three web app shells, packages, and a Foundry workspace without fictitious contract implementations.

## Deliverables

- Pinned runtime/toolchain policy and package-manager metadata
- Root dev, build, lint, typecheck, test, and e2e scripts
- Minimal compilable app/package shells and Foundry test harness

## Non-goals

- Credential logic
- Smart-account integration
- Remote deployment or GitHub publication

## Acceptance criteria

1. A clean clone can install with the documented command
2. Root lint, typecheck, unit tests, builds, and Foundry tests pass
3. No app requires secrets or network access to validate the baseline

## Expected failure handling

- Unsupported Node or pnpm versions fail with an actionable message
- Missing optional environment values do not break baseline tests
- No empty Solidity contracts are added only to satisfy the target tree

## Validation mapped to acceptance

1. `pnpm install --frozen-lockfile`
2. `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
3. `forge test --root contracts`

## Agent prompt

```text
Implement SSW-001: Bootstrap the executable monorepo foundation.

Project: sovereign-smart-wallet
Objective: Create a minimal installable pnpm monorepo with strict TypeScript, one formatting strategy, root validation scripts, three web app shells, packages, and a Foundry workspace without fictitious contract implementations.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/maps/TECHNICAL-MAP.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: None.
5. Work only on SSW-001 in an atomic branch. Primary owned paths: package.json, pnpm-workspace.yaml, pnpm-lock.yaml, tsconfig*, apps/**, packages/**, contracts/**.


Deliver:
- Pinned runtime/toolchain policy and package-manager metadata
- Root dev, build, lint, typecheck, test, and e2e scripts
- Minimal compilable app/package shells and Foundry test harness

Do not include:
- Credential logic
- Smart-account integration
- Remote deployment or GitHub publication

Acceptance criteria:
1. A clean clone can install with the documented command
2. Root lint, typecheck, unit tests, builds, and Foundry tests pass
3. No app requires secrets or network access to validate the baseline

Error and security behavior:
- Unsupported Node or pnpm versions fail with an actionable message
- Missing optional environment values do not break baseline tests
- No empty Solidity contracts are added only to satisfy the target tree
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm install --frozen-lockfile and map the result to acceptance criterion 1.
2. Run pnpm lint && pnpm typecheck && pnpm test && pnpm build and map the result to acceptance criterion 2.
3. Run forge test --root contracts and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
