# SSW-035 — Build the self-hosted email OTP module

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 17 |
| Lane | authentication |
| Dependencies | SSW-030, SSW-031, SSW-033 |
| Primary paths | `packages/auth-email/**` |

## Active feature context

- working/features/wallet-platform-sdk.md

## Objective

Implement provider-neutral email OTP authentication with a generic transport port, SMTP adapter, Mailpit fixture, and short operational-signer sessions.

## Deliverables

- EmailTransportPort and SMTP adapter
- Hashed single-use OTP state machine
- Recovery, email-change, and session revocation flows

## Non-goals

- Email as an on-chain owner
- Hosted email dependency
- Claiming email-only self-custody

## Acceptance criteria

1. OTP values are random, hashed, expiring, single-use, rate-limited, and never logged
2. Responses resist account enumeration
3. Email never appears in wallet locators or on-chain data

## Expected failure handling

- Transport outage cannot create an authenticated session
- Changing email revokes prior sessions
- Sensitive operations still require passkey/recovery step-up

## Validation mapped to acceptance

1. `pnpm --filter @ssw/auth-email test`
2. `Mailpit contract tests`
3. `Brute-force, race, replay, and enumeration tests`

## Agent prompt

```text
Implement SSW-035: Build the self-hosted email OTP module.

Project: universal-smart-wallet
Objective: Implement provider-neutral email OTP authentication with a generic transport port, SMTP adapter, Mailpit fixture, and short operational-signer sessions.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-030, SSW-031, SSW-033.
5. Work only on SSW-035 in an atomic branch. Primary owned paths: packages/auth-email/**.


Deliver:
- EmailTransportPort and SMTP adapter
- Hashed single-use OTP state machine
- Recovery, email-change, and session revocation flows

Do not include:
- Email as an on-chain owner
- Hosted email dependency
- Claiming email-only self-custody

Acceptance criteria:
1. OTP values are random, hashed, expiring, single-use, rate-limited, and never logged
2. Responses resist account enumeration
3. Email never appears in wallet locators or on-chain data

Error and security behavior:
- Transport outage cannot create an authenticated session
- Changing email revokes prior sessions
- Sensitive operations still require passkey/recovery step-up
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/auth-email test and map the result to acceptance criterion 1.
2. Run Mailpit contract tests and map the result to acceptance criterion 2.
3. Run Brute-force, race, replay, and enumeration tests and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
