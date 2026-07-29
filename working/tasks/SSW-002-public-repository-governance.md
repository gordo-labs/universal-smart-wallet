# SSW-002 — Create the public GitHub repository and governance baseline

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 1 |
| Lane | governance |
| Dependencies | SSW-001 |
| Primary paths | `.github/**`, `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `PROJECT.json` |

> This task includes external writes. Confirm explicit owner authorization immediately before performing them.

## Active feature context

- working/procedures/GIT-AND-PUBLICATION.md

## Objective

After explicit publication approval, create the public gordo-labs repository, push the reviewed foundation, and configure minimum open-source and security governance.

## Deliverables

- Verified public remote and default branch
- CI, dependency update, secret scanning, and private vulnerability reporting configuration
- Accurate repository URLs and publication state in project docs

## Non-goals

- Product release
- Production-readiness claim
- Publishing npm packages or deployments

## Acceptance criteria

1. Repository visibility is verified as public
2. CI runs the same required root checks as local development
3. Secret scan and repository governance settings are recorded

## Expected failure handling

- Stop before any external write if approval is absent
- Do not weaken security settings merely to make CI green
- No secrets, real credentials, or local backups enter Git history

## Validation mapped to acceptance

1. `gh repo view gordo-labs/sovereign-smart-wallet`
2. `gh workflow list`
3. `Inspect branch protection and private vulnerability reporting`

## Agent prompt

```text
Implement SSW-002: Create the public GitHub repository and governance baseline.

Project: sovereign-smart-wallet
Objective: After explicit publication approval, create the public gordo-labs repository, push the reviewed foundation, and configure minimum open-source and security governance.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/procedures/GIT-AND-PUBLICATION.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-001.
5. Work only on SSW-002 in an atomic branch. Primary owned paths: .github/**, README.md, SECURITY.md, CONTRIBUTING.md, PROJECT.json.
6. This task performs external writes. Reconfirm explicit owner authorization before creating, pushing, publishing, or changing remote state.

Deliver:
- Verified public remote and default branch
- CI, dependency update, secret scanning, and private vulnerability reporting configuration
- Accurate repository URLs and publication state in project docs

Do not include:
- Product release
- Production-readiness claim
- Publishing npm packages or deployments

Acceptance criteria:
1. Repository visibility is verified as public
2. CI runs the same required root checks as local development
3. Secret scan and repository governance settings are recorded

Error and security behavior:
- Stop before any external write if approval is absent
- Do not weaken security settings merely to make CI green
- No secrets, real credentials, or local backups enter Git history
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run gh repo view gordo-labs/sovereign-smart-wallet and map the result to acceptance criterion 1.
2. Run gh workflow list and map the result to acceptance criterion 2.
3. Run Inspect branch protection and private vulnerability reporting and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
