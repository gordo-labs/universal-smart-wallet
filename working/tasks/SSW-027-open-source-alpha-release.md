# SSW-027 — Publish the first open-source alpha release

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | In Progress |
| Priority | P1 |
| Wave | 12 |
| Lane | release |
| Dependencies | SSW-002, SSW-026 |
| Primary paths | `CHANGELOG.md`, `README.md`, `SECURITY.md`, `PROJECT.json`, `STATUS.md`, `.github/**` |

> Owner approval received in the current thread. External publication is now authorized, subject to the release checks below.

## Active feature context

- working/procedures/RELEASE-WORKFLOW.md

## Objective

After explicit release approval, publish a signed alpha tag and GitHub release with accurate maturity warnings, reproducible checks, artifacts, limitations, and no production-security claim.

## Deliverables

- Versioned changelog and release notes
- Signed tag and GitHub alpha release
- Updated current-state and support documentation

## Non-goals

- Mainnet deployment
- Production identity use
- Stable 1.0 guarantee

## Acceptance criteria

1. Release commit equals the verified RC source
2. Published artifacts and checksums are reproducible
3. Warnings clearly limit the alpha to synthetic data and local/testnet use

## Expected failure handling

- Stop before external publication without explicit approval
- Do not republish changed artifacts under the same tag
- Do not call the release audited or production-ready

## Validation mapped to acceptance

1. `Re-run release checks from the tag`
2. `Verify GitHub visibility, tag signature, checksums, and links`
3. `Inspect release archive for secrets and local artifacts`

## Agent prompt

```text
Implement SSW-027: Publish the first open-source alpha release.

Project: sovereign-smart-wallet
Objective: After explicit release approval, publish a signed alpha tag and GitHub release with accurate maturity warnings, reproducible checks, artifacts, limitations, and no production-security claim.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/procedures/RELEASE-WORKFLOW.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-002, SSW-026.
5. Work only on SSW-027 in an atomic branch. Primary owned paths: CHANGELOG.md, README.md, SECURITY.md, PROJECT.json, STATUS.md, .github/**.
6. This task performs external writes. Reconfirm explicit owner authorization before creating, pushing, publishing, or changing remote state.

Deliver:
- Versioned changelog and release notes
- Signed tag and GitHub alpha release
- Updated current-state and support documentation

Do not include:
- Mainnet deployment
- Production identity use
- Stable 1.0 guarantee

Acceptance criteria:
1. Release commit equals the verified RC source
2. Published artifacts and checksums are reproducible
3. Warnings clearly limit the alpha to synthetic data and local/testnet use

Error and security behavior:
- Stop before external publication without explicit approval
- Do not republish changed artifacts under the same tag
- Do not call the release audited or production-ready
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Re-run release checks from the tag and map the result to acceptance criterion 1.
2. Run Verify GitHub visibility, tag signature, checksums, and links and map the result to acceptance criterion 2.
3. Run Inspect release archive for secrets and local artifacts and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
