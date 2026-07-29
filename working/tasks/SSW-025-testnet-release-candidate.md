# SSW-025 — Integrate the full local and testnet release candidate

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 10 |
| Lane | integration |
| Dependencies | SSW-017, SSW-018, SSW-023, SSW-024 |
| Primary paths | `tests/e2e/**`, `scripts/**`, `README.md`, `docs/**`, `working/**` |

## Active feature context

- working/procedures/RELEASE-WORKFLOW.md

## Objective

Run and document the complete synthetic flow locally and on the supported testnet, including account creation, credential exchange, recovery, status rejection, and optional attestation-gated access.

## Deliverables

- Release-candidate orchestration command and environment validation
- Browser/chain/provider support matrix
- Acceptance report with artifacts and exact deployment manifest

## Non-goals

- Mainnet
- Real credentials
- Production SLA

## Acceptance criteria

1. All local tests pass without external configuration
2. Opt-in testnet flow passes on the declared matrix
3. Recovery, revoked credential, provider outage, and attestation replay scenarios pass

## Expected failure handling

- Do not mark the RC green when any required criterion is skipped
- Classify external outage separately from product defect
- Artifacts are sanitized and reproducible

## Validation mapped to acceptance

1. `pnpm verify:rc`
2. `Opt-in testnet E2E`
3. `SBOM, license, secret, dependency, and contract code-hash checks`

## Agent prompt

```text
Implement SSW-025: Integrate the full local and testnet release candidate.

Project: sovereign-smart-wallet
Objective: Run and document the complete synthetic flow locally and on the supported testnet, including account creation, credential exchange, recovery, status rejection, and optional attestation-gated access.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/procedures/RELEASE-WORKFLOW.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-017, SSW-018, SSW-023, SSW-024.
5. Work only on SSW-025 in an atomic branch. Primary owned paths: tests/e2e/**, scripts/**, README.md, docs/**, working/**.


Deliver:
- Release-candidate orchestration command and environment validation
- Browser/chain/provider support matrix
- Acceptance report with artifacts and exact deployment manifest

Do not include:
- Mainnet
- Real credentials
- Production SLA

Acceptance criteria:
1. All local tests pass without external configuration
2. Opt-in testnet flow passes on the declared matrix
3. Recovery, revoked credential, provider outage, and attestation replay scenarios pass

Error and security behavior:
- Do not mark the RC green when any required criterion is skipped
- Classify external outage separately from product defect
- Artifacts are sanitized and reproducible
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm verify:rc and map the result to acceptance criterion 1.
2. Run Opt-in testnet E2E and map the result to acceptance criterion 2.
3. Run SBOM, license, secret, dependency, and contract code-hash checks and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
