# SSW-022 — Harden consent, phishing resistance, and privacy UX

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 8 |
| Lane | security-ux |
| Dependencies | SSW-012, SSW-013, SSW-020 |
| Primary paths | `apps/wallet-web/**`, `apps/verifier-demo/**`, `docs/threat-model/**` |

## Active feature context

- working/features/credential-exchange.md
- working/features/verification-trust-and-status.md

## Objective

Make request trust, verifier identity, purpose, exact disclosures, expiry, status, and denial behavior understandable while preventing silent or coercive presentation.

## Deliverables

- Consent and risk-state interaction spec implemented in the apps
- Signed/request-URI trust indicators and unsafe-request blockers
- Privacy-safe denial and claim-mismatch behavior

## Non-goals

- Brand polish
- Dark-pattern conversion optimization
- Silent background credentials

## Acceptance criteria

1. The holder can distinguish requester, requested data, shared data, purpose, and expiry
2. Unsafe or ambiguous requests cannot reach approval
3. Denial does not reveal whether hidden claims matched

## Expected failure handling

- Never render remote metadata as trusted unsanitized HTML
- No pre-checked consent or approval-by-timeout
- Error details do not leak undisclosed claims

## Validation mapped to acceptance

1. `Component and accessibility tests`
2. `Phishing/mixed-origin/replay user-flow tests`
3. `Manual threat-model walkthrough`

## Agent prompt

```text
Implement SSW-022: Harden consent, phishing resistance, and privacy UX.

Project: sovereign-smart-wallet
Objective: Make request trust, verifier identity, purpose, exact disclosures, expiry, status, and denial behavior understandable while preventing silent or coercive presentation.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/credential-exchange.md, working/features/verification-trust-and-status.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-012, SSW-013, SSW-020.
5. Work only on SSW-022 in an atomic branch. Primary owned paths: apps/wallet-web/**, apps/verifier-demo/**, docs/threat-model/**.


Deliver:
- Consent and risk-state interaction spec implemented in the apps
- Signed/request-URI trust indicators and unsafe-request blockers
- Privacy-safe denial and claim-mismatch behavior

Do not include:
- Brand polish
- Dark-pattern conversion optimization
- Silent background credentials

Acceptance criteria:
1. The holder can distinguish requester, requested data, shared data, purpose, and expiry
2. Unsafe or ambiguous requests cannot reach approval
3. Denial does not reveal whether hidden claims matched

Error and security behavior:
- Never render remote metadata as trusted unsanitized HTML
- No pre-checked consent or approval-by-timeout
- Error details do not leak undisclosed claims
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Component and accessibility tests and map the result to acceptance criterion 1.
2. Run Phishing/mixed-origin/replay user-flow tests and map the result to acceptance criterion 2.
3. Run Manual threat-model walkthrough and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
