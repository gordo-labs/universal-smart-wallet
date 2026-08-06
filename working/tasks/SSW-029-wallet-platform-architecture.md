# SSW-029 — Define the modular Wallet Platform architecture

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P0 |
| Wave | 13 |
| Lane | architecture |
| Dependencies | SSW-026 |
| Primary paths | `docs/decisions/SSW-029-*.md`, `docs/threat-model/wallet-platform-*.md`, `working/maps/**` |

## Active feature context

- working/features/wallet-platform-sdk.md

## Objective

Specify the provider-neutral SDK, self-hosted service, wallet app, admin console, authentication, signer, Safe, DID, credential, and portability boundaries before implementation.

## Deliverables

- Architecture and custody ADR
- Trust-boundary and data-flow threat model
- Dependency and build-versus-adapter matrix

## Non-goals

- Functional implementation
- Selecting a permanent hosted vendor
- Production or mainnet claims

## Acceptance criteria

1. The user-controlled Safe and revocable operational signer model is explicit
2. Email-only custody limitations and sensitive-operation step-up are explicit
3. Every provider dependency sits behind a replaceable port

## Expected failure handling

- Do not describe email possession as cryptographic self-custody
- Do not permit a vendor signer to become irremovable
- List unresolved upstream module risks as blockers

## Validation mapped to acceptance

1. `Architecture link and consistency check`
2. `Threat-model review against existing audit packet`
3. `Official-source version and license verification`

## Agent prompt

```text
Implement SSW-029: Define the modular Wallet Platform architecture.

Project: universal-smart-wallet
Objective: Specify the provider-neutral SDK, self-hosted service, wallet app, admin console, authentication, signer, Safe, DID, credential, and portability boundaries before implementation.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/wallet-platform-sdk.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-026.
5. Work only on SSW-029 in an atomic branch. Primary owned paths: docs/decisions/SSW-029-*.md, docs/threat-model/wallet-platform-*.md, working/maps/**.


Deliver:
- Architecture and custody ADR
- Trust-boundary and data-flow threat model
- Dependency and build-versus-adapter matrix

Do not include:
- Functional implementation
- Selecting a permanent hosted vendor
- Production or mainnet claims

Acceptance criteria:
1. The user-controlled Safe and revocable operational signer model is explicit
2. Email-only custody limitations and sensitive-operation step-up are explicit
3. Every provider dependency sits behind a replaceable port

Error and security behavior:
- Do not describe email possession as cryptographic self-custody
- Do not permit a vendor signer to become irremovable
- List unresolved upstream module risks as blockers
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Architecture link and consistency check and map the result to acceptance criterion 1.
2. Run Threat-model review against existing audit packet and map the result to acceptance criterion 2.
3. Run Official-source version and license verification and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
