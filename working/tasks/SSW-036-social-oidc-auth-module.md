# SSW-036 — Build the provider-neutral social OIDC module

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P1 |
| Wave | 14 |
| Lane | authentication |
| Dependencies | SSW-030, SSW-031, SSW-033 |
| Primary paths | `packages/auth-oidc/**` |

## Active feature context

- working/features/wallet-platform-sdk.md

## Objective

Implement generic OIDC/OAuth login and explicit account linking with configurable Google and Apple examples, using issuer plus subject as the canonical external identity.

## Deliverables

- OIDC discovery/JWKS and callback ports
- PKCE, state, nonce, and linking state machine
- Google and Apple configuration examples

## Non-goals

- Hard-coded provider SDK
- Using email as the canonical OIDC identity
- Social account as permanent Safe owner

## Acceptance criteria

1. Issuer, audience, nonce, state, PKCE, signature, and expiry are verified
2. Email collisions cannot merge accounts
3. Unlink and provider outage leave recovery routes intact

## Expected failure handling

- Discovery and JWKS fetching obey SSRF and size policies
- Provider outage fails closed
- Account linking always requires an authenticated existing factor

## Validation mapped to acceptance

1. `pnpm --filter @ssw/auth-oidc test`
2. `OIDC discovery/JWKS fixture tests`
3. `Issuer confusion, replay, collision, and linking tests`

## Agent prompt

```text
Implement SSW-036: Build the provider-neutral social OIDC module.

Project: sovereign-smart-wallet
Objective: Implement generic OIDC/OAuth login and explicit account linking with configurable Google and Apple examples, using issuer plus subject as the canonical external identity.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-030, SSW-031, SSW-033.
5. Work only on SSW-036 in an atomic branch. Primary owned paths: packages/auth-oidc/**.


Deliver:
- OIDC discovery/JWKS and callback ports
- PKCE, state, nonce, and linking state machine
- Google and Apple configuration examples

Do not include:
- Hard-coded provider SDK
- Using email as the canonical OIDC identity
- Social account as permanent Safe owner

Acceptance criteria:
1. Issuer, audience, nonce, state, PKCE, signature, and expiry are verified
2. Email collisions cannot merge accounts
3. Unlink and provider outage leave recovery routes intact

Error and security behavior:
- Discovery and JWKS fetching obey SSRF and size policies
- Provider outage fails closed
- Account linking always requires an authenticated existing factor
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run pnpm --filter @ssw/auth-oidc test and map the result to acceptance criterion 1.
2. Run OIDC discovery/JWKS fixture tests and map the result to acceptance criterion 2.
3. Run Issuer confusion, replay, collision, and linking tests and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
