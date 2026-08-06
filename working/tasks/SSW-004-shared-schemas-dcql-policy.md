# SSW-004 — Implement shared runtime schemas and DCQL policy mapping

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 2 |
| Lane | credential-core |
| Dependencies | SSW-003 |
| Primary paths | `packages/shared-types/**`, `packages/presentation-policy/**` |

## Active feature context

- working/features/credential-exchange.md
- working/features/verification-trust-and-status.md

## Objective

Define versioned runtime-validated types for internal presentation policies, verification results, credential metadata, and a narrow mapping to and from OpenID4VP 1.0 DCQL.

## Deliverables

- Schemas with unknown-field and size policy
- Age-over-18 policy using is_over_18 rather than hidden birthdate comparison
- Positive and negative DCQL mapping fixtures

## Non-goals

- Cryptographic verification
- Network requests
- Legacy Presentation Exchange support

## Acceptance criteria

1. Invalid types, operators, paths, and disclosure requests are rejected
2. Round-trip mappings are deterministic for the supported subset
3. Schema versions are included in persisted or exchanged project-owned objects

## Expected failure handling

- Fail closed on unsupported operators or formats
- Bound nesting, array counts, and string sizes
- Never infer a predicate proof from selective disclosure

## Validation mapped to acceptance

1. `pnpm --filter shared-types test`
2. `pnpm --filter presentation-policy test`
3. `pnpm typecheck`

## Agent prompt

```text
Implement SSW-004: Implement shared runtime schemas and DCQL policy mapping.

Project: universal-smart-wallet
Objective: Define versioned runtime-validated types for internal presentation policies, verification results, credential metadata, and a narrow mapping to and from OpenID4VP 1.0 DCQL.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/credential-exchange.md, working/features/verification-trust-and-status.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-003.
5. Work only on SSW-004 in an atomic branch. Primary owned paths: packages/shared-types/**, packages/presentation-policy/**.


Deliver:
- Schemas with unknown-field and size policy
- Age-over-18 policy using is_over_18 rather than hidden birthdate comparison
- Positive and negative DCQL mapping fixtures

Do not include:
- Cryptographic verification
- Network requests
- Legacy Presentation Exchange support

Acceptance criteria:
1. Invalid types, operators, paths, and disclosure requests are rejected
2. Round-trip mappings are deterministic for the supported subset
3. Schema versions are included in persisted or exchanged project-owned objects

Error and security behavior:
- Fail closed on unsupported operators or formats
- Bound nesting, array counts, and string sizes
- Never infer a predicate proof from selective disclosure
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter shared-types test and map the result to acceptance criterion 1.
2. Run pnpm --filter presentation-policy test and map the result to acceptance criterion 2.
3. Run pnpm typecheck and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
