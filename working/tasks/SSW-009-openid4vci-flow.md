# SSW-009 — Implement the OpenID4VCI issuance flow

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 4 |
| Lane | protocol |
| Dependencies | SSW-008 |
| Primary paths | `packages/openid4vc/**`, `packages/test-fixtures/**`, `docs/protocols/**` |

## Active feature context

- working/features/credential-exchange.md

## Objective

Implement the bounded OpenID4VCI 1.0 pre-authorized-code flow needed by the demo, with metadata validation, proof handling, and deterministic HTTP fixtures.

## Deliverables

- Issuer metadata and credential-offer parsers
- Wallet client state machine and issuer-side test adapter
- Success, OAuth error, timeout, malformed metadata, and proof-failure fixtures

## Non-goals

- Every optional grant or wallet attestation
- Hosted authorization server
- Real identity proofing

## Acceptance criteria

1. The supported flow follows final 1.0 names and endpoints
2. Redirects and remote metadata obey SSRF/origin/size/time policies
3. The issued credential is verified before vault insertion

## Expected failure handling

- Do not follow arbitrary redirects or private-network metadata URLs
- OAuth errors map to safe user actions
- Never persist an unverified credential as valid

## Validation mapped to acceptance

1. `Protocol unit tests with deterministic HTTP adapter`
2. `Issuer-wallet contract tests`
3. `No-network test run`

## Agent prompt

```text
Implement SSW-009: Implement the OpenID4VCI issuance flow.

Project: universal-smart-wallet
Objective: Implement the bounded OpenID4VCI 1.0 pre-authorized-code flow needed by the demo, with metadata validation, proof handling, and deterministic HTTP fixtures.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/credential-exchange.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-008.
5. Work only on SSW-009 in an atomic branch. Primary owned paths: packages/openid4vc/**, packages/test-fixtures/**, docs/protocols/**.


Deliver:
- Issuer metadata and credential-offer parsers
- Wallet client state machine and issuer-side test adapter
- Success, OAuth error, timeout, malformed metadata, and proof-failure fixtures

Do not include:
- Every optional grant or wallet attestation
- Hosted authorization server
- Real identity proofing

Acceptance criteria:
1. The supported flow follows final 1.0 names and endpoints
2. Redirects and remote metadata obey SSRF/origin/size/time policies
3. The issued credential is verified before vault insertion

Error and security behavior:
- Do not follow arbitrary redirects or private-network metadata URLs
- OAuth errors map to safe user actions
- Never persist an unverified credential as valid
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Protocol unit tests with deterministic HTTP adapter and map the result to acceptance criterion 1.
2. Run Issuer-wallet contract tests and map the result to acceptance criterion 2.
3. Run No-network test run and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
