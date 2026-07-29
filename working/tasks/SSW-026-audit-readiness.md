# SSW-026 — Prepare the independent security and privacy review packet

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 11 |
| Lane | security |
| Dependencies | SSW-025 |
| Primary paths | `docs/architecture/**`, `docs/threat-model/**`, `docs/decisions/**`, `docs/audit/**`, `SECURITY.md` |

## Active feature context

- working/procedures/SECURITY-REVIEW.md

## Objective

Produce a reviewer-ready evidence packet covering assets, trust boundaries, key lifecycle, protocol profiles, contracts, deployments, privacy data flow, tests, known gaps, and reproducible setup.

## Deliverables

- Architecture/data-flow and threat-model packet
- Contract and dependency inventory with code hashes, licenses, and audit provenance
- Known-issues, scope, reproducibility, and reviewer checklist

## Non-goals

- Claiming an audit occurred
- Closing findings without reviewers
- Production approval

## Acceptance criteria

1. A reviewer can reproduce builds/tests from a clean clone
2. Every key, credential, identifier, log, and on-chain field has a documented lifecycle
3. Unsupported claims and remaining risks are prominent

## Expected failure handling

- Missing evidence is listed as a gap, not inferred
- No secret is included in the packet
- Threats without controls block production claims

## Validation mapped to acceptance

1. `Fresh-clone audit runbook`
2. `Documentation link check`
3. `Internal security/privacy review sign-off`

## Agent prompt

```text
Implement SSW-026: Prepare the independent security and privacy review packet.

Project: sovereign-smart-wallet
Objective: Produce a reviewer-ready evidence packet covering assets, trust boundaries, key lifecycle, protocol profiles, contracts, deployments, privacy data flow, tests, known gaps, and reproducible setup.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/procedures/SECURITY-REVIEW.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-025.
5. Work only on SSW-026 in an atomic branch. Primary owned paths: docs/architecture/**, docs/threat-model/**, docs/decisions/**, docs/audit/**, SECURITY.md.


Deliver:
- Architecture/data-flow and threat-model packet
- Contract and dependency inventory with code hashes, licenses, and audit provenance
- Known-issues, scope, reproducibility, and reviewer checklist

Do not include:
- Claiming an audit occurred
- Closing findings without reviewers
- Production approval

Acceptance criteria:
1. A reviewer can reproduce builds/tests from a clean clone
2. Every key, credential, identifier, log, and on-chain field has a documented lifecycle
3. Unsupported claims and remaining risks are prominent

Error and security behavior:
- Missing evidence is listed as a gap, not inferred
- No secret is included in the packet
- Threats without controls block production claims
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Fresh-clone audit runbook and map the result to acceptance criterion 1.
2. Run Documentation link check and map the result to acceptance criterion 2.
3. Run Internal security/privacy review sign-off and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
