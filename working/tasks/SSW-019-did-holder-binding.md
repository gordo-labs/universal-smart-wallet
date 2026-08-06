# SSW-019 — Decide and implement DID control and holder binding

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P1 |
| Wave | 5 |
| Lane | identity |
| Dependencies | SSW-008, SSW-016 |
| Primary paths | `docs/decisions/**`, `packages/identity-adapter/**`, `packages/sd-jwt-adapter/**` |

## Active feature context

- working/features/identity-and-holder-binding.md

## Objective

Compare did:pkh and did:ethr for contract-account control, decide where DID is actually needed, and implement a privacy-aware holder-binding adapter that survives passkey rotation.

## Deliverables

- DID/control/privacy ADR
- Resolver and control-proof ports with deterministic fixtures
- Credential-scoped or pairwise holder-binding strategy where supported

## Non-goals

- Custom DID method
- Global DID in every presentation
- Universal resolver dependency in core tests

## Acceptance criteria

1. Passkey rotation does not require a new public account identity
2. Base credential flow works with the DID adapter disabled
3. Correlation implications of every binding mode are documented and tested

## Expected failure handling

- Resolver outage is explicit and scoped
- Contract-account signature verification uses the correct chain
- No fallback silently replaces strong holder binding with bearer behavior

## Validation mapped to acceptance

1. `Resolver/control fixture tests`
2. `Holder-binding rotation and wrong-controller tests`
3. `Privacy review of identifiers exposed to issuer and verifier`

## Agent prompt

```text
Implement SSW-019: Decide and implement DID control and holder binding.

Project: universal-smart-wallet
Objective: Compare did:pkh and did:ethr for contract-account control, decide where DID is actually needed, and implement a privacy-aware holder-binding adapter that survives passkey rotation.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/identity-and-holder-binding.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-008, SSW-016.
5. Work only on SSW-019 in an atomic branch. Primary owned paths: docs/decisions/**, packages/identity-adapter/**, packages/sd-jwt-adapter/**.


Deliver:
- DID/control/privacy ADR
- Resolver and control-proof ports with deterministic fixtures
- Credential-scoped or pairwise holder-binding strategy where supported

Do not include:
- Custom DID method
- Global DID in every presentation
- Universal resolver dependency in core tests

Acceptance criteria:
1. Passkey rotation does not require a new public account identity
2. Base credential flow works with the DID adapter disabled
3. Correlation implications of every binding mode are documented and tested

Error and security behavior:
- Resolver outage is explicit and scoped
- Contract-account signature verification uses the correct chain
- No fallback silently replaces strong holder binding with bearer behavior
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Resolver/control fixture tests and map the result to acceptance criterion 1.
2. Run Holder-binding rotation and wrong-controller tests and map the result to acceptance criterion 2.
3. Run Privacy review of identifiers exposed to issuer and verifier and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
