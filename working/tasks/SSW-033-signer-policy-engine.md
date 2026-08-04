# SSW-033 — Implement scoped operational-signer policies

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 13 |
| Lane | authorization |
| Dependencies | SSW-030, SSW-032 |
| Primary paths | `packages/signer-policy/**` |

## Active feature context

- working/features/wallet-platform-sdk.md

## Objective

Authorize operational signers only within contract, selector, asset, amount, frequency, chain, and TTL policies, with passkey or recovery step-up for sensitive changes.

## Deliverables

- Versioned policy schema and evaluator
- Step-up decision interface
- Revocation and bounded-session lifecycle

## Non-goals

- Authentication UI
- Owning Safe permanently
- Unbounded arbitrary calls

## Acceptance criteria

1. Email/social sessions cannot rotate owners, export, migrate, or install modules without step-up
2. Expired or revoked policies fail closed
3. Every decision has a redacted stable reason code

## Expected failure handling

- Deny unknown contracts and selectors
- Policy-store outage denies authorization
- Do not leak balances or policy internals in rejection messages

## Validation mapped to acceptance

1. `pnpm --filter @ssw/signer-policy test`
2. `Property tests for amount/TTL boundaries`
3. `Privilege escalation and replay tests`

## Agent prompt

```text
Implement SSW-033: Implement scoped operational-signer policies.

Project: sovereign-smart-wallet
Objective: Authorize operational signers only within contract, selector, asset, amount, frequency, chain, and TTL policies, with passkey or recovery step-up for sensitive changes.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-030, SSW-032.
5. Work only on SSW-033 in an atomic branch. Primary owned paths: packages/signer-policy/**.


Deliver:
- Versioned policy schema and evaluator
- Step-up decision interface
- Revocation and bounded-session lifecycle

Do not include:
- Authentication UI
- Owning Safe permanently
- Unbounded arbitrary calls

Acceptance criteria:
1. Email/social sessions cannot rotate owners, export, migrate, or install modules without step-up
2. Expired or revoked policies fail closed
3. Every decision has a redacted stable reason code

Error and security behavior:
- Deny unknown contracts and selectors
- Policy-store outage denies authorization
- Do not leak balances or policy internals in rejection messages
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/signer-policy test and map the result to acceptance criterion 1.
2. Run Property tests for amount/TTL boundaries and map the result to acceptance criterion 2.
3. Run Privilege escalation and replay tests and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
