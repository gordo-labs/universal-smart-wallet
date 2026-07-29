# SSW-023 — Build the short-lived on-chain attestation and access demo

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Done |
| Priority | P1 |
| Wave | 8 |
| Lane | onchain |
| Dependencies | SSW-017, SSW-019, SSW-020 |
| Primary paths | `contracts/**`, `packages/credential-domain/**`, `packages/account-adapter/**`, `apps/access-demo/**` |

## Active feature context

- working/features/onchain-attestations.md

## Objective

Convert a valid off-chain result into a short-lived attestor-signed, chain/consumer/policy/nonce-scoped message and gate one local/testnet demo contract without writing credential data on-chain.

## Deliverables

- Versioned attestation envelope and signer/verifier interfaces
- Consumer contract with expiry, nonce/nullifier, policy, audience, and attestor rotation checks
- Access demo and privacy/trust documentation

## Non-goals

- Arbitrary ZK
- Credential verification in Solidity
- Permanent identity registry

## Acceptance criteria

1. Only a valid scoped unexpired unused attestation grants access
2. Chain replay, consumer replay, nonce reuse, wrong policy, and rotated/revoked attestor reject
3. Events and calldata contain no credential, DID document, or PII

## Expected failure handling

- Trust in the attestor is explicit and versioned
- Attestor compromise has a rotation/revocation path
- On-chain failure never changes the validity of the underlying off-chain credential

## Validation mapped to acceptance

1. `Foundry unit, fuzz, replay, and gas tests`
2. `Local integration from verifier result to consumer`
3. `Opt-in testnet smoke if configuration exists`

## Agent prompt

```text
Implement SSW-023: Build the short-lived on-chain attestation and access demo.

Project: sovereign-smart-wallet
Objective: Convert a valid off-chain result into a short-lived attestor-signed, chain/consumer/policy/nonce-scoped message and gate one local/testnet demo contract without writing credential data on-chain.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/onchain-attestations.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-017, SSW-019, SSW-020.
5. Work only on SSW-023 in an atomic branch. Primary owned paths: contracts/**, packages/credential-domain/**, packages/account-adapter/**, apps/access-demo/**.


Deliver:
- Versioned attestation envelope and signer/verifier interfaces
- Consumer contract with expiry, nonce/nullifier, policy, audience, and attestor rotation checks
- Access demo and privacy/trust documentation

Do not include:
- Arbitrary ZK
- Credential verification in Solidity
- Permanent identity registry

Acceptance criteria:
1. Only a valid scoped unexpired unused attestation grants access
2. Chain replay, consumer replay, nonce reuse, wrong policy, and rotated/revoked attestor reject
3. Events and calldata contain no credential, DID document, or PII

Error and security behavior:
- Trust in the attestor is explicit and versioned
- Attestor compromise has a rotation/revocation path
- On-chain failure never changes the validity of the underlying off-chain credential
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Foundry unit, fuzz, replay, and gas tests and map the result to acceptance criterion 1.
2. Run Local integration from verifier result to consumer and map the result to acceptance criterion 2.
3. Run Opt-in testnet smoke if configuration exists and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
