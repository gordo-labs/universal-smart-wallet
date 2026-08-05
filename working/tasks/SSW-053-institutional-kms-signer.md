# SSW-053 — Implement institutional KMS/HSM signing ports

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 29 |
| Lane | security |
| Dependencies | SSW-049 |
| Primary paths | `packages/issuer-signer/**` |

## Active feature context

- working/features/institutional-identity-platform.md

## Objective

Provide non-exportable institutional signing, rotation, dual approval, and a clearly unsafe local development signer.

## Deliverables

- IssuerSignerPort
- KMS/HSM adapter contract
- Local development signer

## Non-goals

- Bundled cloud credentials
- Custom HSM
- Production key generation

## Acceptance criteria

1. Private keys never cross the port
2. Dual approval is enforceable
3. Rotation and disabled keys fail closed

## Expected failure handling

- Reject unapproved signing
- No retry after ambiguous signing result

## Validation mapped to acceptance

1. `pnpm --filter @ssw/issuer-signer test`
2. `Secret scan`

## Agent prompt

```text
Implement SSW-053: Implement institutional KMS/HSM signing ports.

Project: sovereign-smart-wallet
Objective: Provide non-exportable institutional signing, rotation, dual approval, and a clearly unsafe local development signer.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/institutional-identity-platform.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-049.
5. Work only on SSW-053 in an atomic branch. Primary owned paths: packages/issuer-signer/**.


Deliver:
- IssuerSignerPort
- KMS/HSM adapter contract
- Local development signer

Do not include:
- Bundled cloud credentials
- Custom HSM
- Production key generation

Acceptance criteria:
1. Private keys never cross the port
2. Dual approval is enforceable
3. Rotation and disabled keys fail closed

Error and security behavior:
- Reject unapproved signing
- No retry after ambiguous signing result
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/issuer-signer test and map the result to acceptance criterion 1.
2. Run Secret scan and map the result to acceptance criterion 2.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
