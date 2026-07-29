# SSW-003 — Pin the standards and dependency compatibility baseline

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 1 |
| Lane | architecture |
| Dependencies | SSW-001 |
| Primary paths | `docs/decisions/**`, `working/research/standards-baseline-*.md`, `package.json`, `pnpm-lock.yaml`, `contracts/foundry.toml` |

## Active feature context

- working/research/standards-baseline-2026-07-29.md

## Objective

Re-check official sources, evaluate maintained libraries, and record exact compatible versions and replaceable adapter boundaries before protocol or account code is written.

## Deliverables

- ADR covering toolchain and credential libraries
- Compatibility matrix for OpenID4VC, SD-JWT VC, Safe/Kernel, EntryPoint, ERC-7579, browsers, and Foundry
- License and maintenance-risk notes for every selected dependency

## Non-goals

- Implementing protocol flows
- Deploying contracts
- Claiming conformance without tests

## Acceptance criteria

1. Every unstable standard has an exact pinned revision
2. Every selected library has license, maintenance, and replacement notes
3. Known version conflicts and unsupported browsers/chains are explicit

## Expected failure handling

- Reject abandoned or incompatible dependencies
- Do not silently mix draft-era and final OpenID4VC field names
- Do not treat ERC-7579 or SD-JWT VC as final

## Validation mapped to acceptance

1. `Verify versions against official docs and package registries`
2. `pnpm install --frozen-lockfile`
3. `Run dependency license and vulnerability reports`

## Agent prompt

```text
Implement SSW-003: Pin the standards and dependency compatibility baseline.

Project: sovereign-smart-wallet
Objective: Re-check official sources, evaluate maintained libraries, and record exact compatible versions and replaceable adapter boundaries before protocol or account code is written.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/research/standards-baseline-2026-07-29.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-001.
5. Work only on SSW-003 in an atomic branch. Primary owned paths: docs/decisions/**, working/research/standards-baseline-*.md, package.json, pnpm-lock.yaml, contracts/foundry.toml.


Deliver:
- ADR covering toolchain and credential libraries
- Compatibility matrix for OpenID4VC, SD-JWT VC, Safe/Kernel, EntryPoint, ERC-7579, browsers, and Foundry
- License and maintenance-risk notes for every selected dependency

Do not include:
- Implementing protocol flows
- Deploying contracts
- Claiming conformance without tests

Acceptance criteria:
1. Every unstable standard has an exact pinned revision
2. Every selected library has license, maintenance, and replacement notes
3. Known version conflicts and unsupported browsers/chains are explicit

Error and security behavior:
- Reject abandoned or incompatible dependencies
- Do not silently mix draft-era and final OpenID4VC field names
- Do not treat ERC-7579 or SD-JWT VC as final
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Verify versions against official docs and package registries and map the result to acceptance criterion 1.
2. Run pnpm install --frozen-lockfile and map the result to acceptance criterion 2.
3. Run Run dependency license and vulnerability reports and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
