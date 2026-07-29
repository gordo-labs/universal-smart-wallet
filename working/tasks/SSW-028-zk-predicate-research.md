# SSW-028 — Research a future ZK predicate-proof path

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P3 |
| Wave | 12 |
| Lane | research |
| Dependencies | SSW-023 |
| Primary paths | `working/research/**`, `working/roadmap/future/zk-predicate-proofs.md`, `docs/decisions/**` |

## Active feature context

- working/roadmap/future/zk-predicate-proofs.md

## Objective

Evaluate whether a maintained, auditable proof system can prove hidden age predicates while binding issuer, status, holder, audience, nonce, expiry, and nullifier semantics.

## Deliverables

- Comparison of candidate proof systems and circuit assumptions
- Browser performance and on-chain cost measurements on synthetic fixtures
- Go, defer, or reject ADR with a bounded implementation proposal

## Non-goals

- Production circuit
- Replacing the issuer-derived is_over_18 MVP
- Universal proof marketplace

## Acceptance criteria

1. Trusted setup, audit status, cryptographic assumptions, licensing, and maintenance are compared
2. Revocation and anti-replay binding are part of the design
3. The recommendation includes privacy/correlation and operational costs

## Expected failure handling

- Do not select a proof system on gas cost alone
- Do not claim unlinkability without a concrete transcript analysis
- Abandon candidates that require custom unaudited cryptography for the MVP

## Validation mapped to acceptance

1. `Reproducible benchmark prototype`
2. `Independent review of the research assumptions`
3. `No product dependency added unless the ADR says go`

## Agent prompt

```text
Implement SSW-028: Research a future ZK predicate-proof path.

Project: sovereign-smart-wallet
Objective: Evaluate whether a maintained, auditable proof system can prove hidden age predicates while binding issuer, status, holder, audience, nonce, expiry, and nullifier semantics.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/roadmap/future/zk-predicate-proofs.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-023.
5. Work only on SSW-028 in an atomic branch. Primary owned paths: working/research/**, working/roadmap/future/zk-predicate-proofs.md, docs/decisions/**.


Deliver:
- Comparison of candidate proof systems and circuit assumptions
- Browser performance and on-chain cost measurements on synthetic fixtures
- Go, defer, or reject ADR with a bounded implementation proposal

Do not include:
- Production circuit
- Replacing the issuer-derived is_over_18 MVP
- Universal proof marketplace

Acceptance criteria:
1. Trusted setup, audit status, cryptographic assumptions, licensing, and maintenance are compared
2. Revocation and anti-replay binding are part of the design
3. The recommendation includes privacy/correlation and operational costs

Error and security behavior:
- Do not select a proof system on gas cost alone
- Do not claim unlinkability without a concrete transcript analysis
- Abandon candidates that require custom unaudited cryptography for the MVP
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Reproducible benchmark prototype and map the result to acceptance criterion 1.
2. Run Independent review of the research assumptions and map the result to acceptance criterion 2.
3. Run No product dependency added unless the ADR says go and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
