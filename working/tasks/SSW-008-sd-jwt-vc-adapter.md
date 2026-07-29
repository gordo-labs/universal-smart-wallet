# SSW-008 — Implement the version-pinned SD-JWT VC adapter

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field         | Value                                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| Status        | Done                                                                           |
| Priority      | P0                                                                             |
| Wave          | 3                                                                              |
| Lane          | credential-format                                                              |
| Dependencies  | SSW-003, SSW-004                                                               |
| Primary paths | `packages/sd-jwt-adapter/**`, `packages/test-fixtures/**`, `docs/protocols/**` |

## Active feature context

- working/features/credential-exchange.md

## Objective

Wrap a maintained SD-JWT implementation for the pinned SD-JWT VC draft subset, including issuance, disclosure, key binding, issuer metadata, status references, and negative fixtures.

## Deliverables

- Narrow issue, present, and verify adapter interfaces
- Synthetic AgeCredential fixtures with is_over_18
- Draft/version metadata and upgrade notes

## Non-goals

- All credential formats
- General ZK predicates
- Production issuer trust

## Acceptance criteria

1. Undisclosed claims cannot be reconstructed from the presentation
2. Signature, digest, key-binding, algorithm, type, and expiry failures are rejected
3. Fixtures identify exact draft and media type behavior

## Expected failure handling

- Allowlist algorithms and key types
- Bound token/disclosure sizes and counts
- Fail closed on an unrecognized draft/profile version

## Validation mapped to acceptance

1. `Official or upstream test vectors where license permits`
2. `Mutation tests for disclosures and JOSE headers`
3. `Cross-package typecheck`

## Agent prompt

```text
Implement SSW-008: Implement the version-pinned SD-JWT VC adapter.

Project: sovereign-smart-wallet
Objective: Wrap a maintained SD-JWT implementation for the pinned SD-JWT VC draft subset, including issuance, disclosure, key binding, issuer metadata, status references, and negative fixtures.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/credential-exchange.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-003, SSW-004.
5. Work only on SSW-008 in an atomic branch. Primary owned paths: packages/sd-jwt-adapter/**, packages/test-fixtures/**, docs/protocols/**.


Deliver:
- Narrow issue, present, and verify adapter interfaces
- Synthetic AgeCredential fixtures with is_over_18
- Draft/version metadata and upgrade notes

Do not include:
- All credential formats
- General ZK predicates
- Production issuer trust

Acceptance criteria:
1. Undisclosed claims cannot be reconstructed from the presentation
2. Signature, digest, key-binding, algorithm, type, and expiry failures are rejected
3. Fixtures identify exact draft and media type behavior

Error and security behavior:
- Allowlist algorithms and key types
- Bound token/disclosure sizes and counts
- Fail closed on an unrecognized draft/profile version
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Official or upstream test vectors where license permits and map the result to acceptance criterion 1.
2. Run Mutation tests for disclosures and JOSE headers and map the result to acceptance criterion 2.
3. Run Cross-package typecheck and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
