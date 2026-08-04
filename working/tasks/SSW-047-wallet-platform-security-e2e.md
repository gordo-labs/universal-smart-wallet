# SSW-047 — Integrate and adversarially test the Wallet Platform

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 25 |
| Lane | security |
| Dependencies | SSW-046 |
| Primary paths | `tests/platform/**`, `tests/security/platform-*.test.mjs`, `scripts/verify-platform.mjs`, `docs/audit/wallet-platform-*.md` |

## Active feature context

- working/features/wallet-platform-sdk.md
- working/procedures/SECURITY-REVIEW.md

## Objective

Prove the complete platform flows and edge cases across auth, account, DID, assets, credentials, recovery, vendor rotation, export/import, tenancy, and provider failures.

## Deliverables

- Deterministic platform E2E command
- Adversarial/property/fuzz coverage
- Sanitized security evidence and gap report

## Non-goals

- Independent audit claim
- Mainnet testing
- Masking skipped provider integration

## Acceptance criteria

1. All supported use cases pass locally from clean state
2. Tenant escape, OTP abuse, OIDC confusion, signer escalation, replay, malicious calldata, SSRF, webhook forgery, and migration tamper fail closed
3. Logs, screenshots, traces, databases, and bundles pass secret/PII scans

## Expected failure handling

- A skipped required case blocks green status
- Preserve randomized failing seeds
- Separate external outage from product defect without treating it as a pass

## Validation mapped to acceptance

1. `node scripts/verify-platform.mjs`
2. `pnpm test:security && forge test --root contracts`
3. `Artifact, database, trace, and bundle redaction scan`

## Agent prompt

```text
Implement SSW-047: Integrate and adversarially test the Wallet Platform.

Project: sovereign-smart-wallet
Objective: Prove the complete platform flows and edge cases across auth, account, DID, assets, credentials, recovery, vendor rotation, export/import, tenancy, and provider failures.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md, working/procedures/SECURITY-REVIEW.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-046.
5. Work only on SSW-047 in an atomic branch. Primary owned paths: tests/platform/**, tests/security/platform-*.test.mjs, scripts/verify-platform.mjs, docs/audit/wallet-platform-*.md.


Deliver:
- Deterministic platform E2E command
- Adversarial/property/fuzz coverage
- Sanitized security evidence and gap report

Do not include:
- Independent audit claim
- Mainnet testing
- Masking skipped provider integration

Acceptance criteria:
1. All supported use cases pass locally from clean state
2. Tenant escape, OTP abuse, OIDC confusion, signer escalation, replay, malicious calldata, SSRF, webhook forgery, and migration tamper fail closed
3. Logs, screenshots, traces, databases, and bundles pass secret/PII scans

Error and security behavior:
- A skipped required case blocks green status
- Preserve randomized failing seeds
- Separate external outage from product defect without treating it as a pass
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run node scripts/verify-platform.mjs and map the result to acceptance criterion 1.
2. Run pnpm test:security && forge test --root contracts and map the result to acceptance criterion 2.
3. Run Artifact, database, trace, and bundle redaction scan and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
