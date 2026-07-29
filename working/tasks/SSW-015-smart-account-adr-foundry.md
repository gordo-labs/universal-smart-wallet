# SSW-015 — Select the smart-account base and build the Foundry harness

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field         | Value                                                              |
| ------------- | ------------------------------------------------------------------ |
| Status        | Done (branch `docs/SSW-015-smart-account-adr-foundry`)             |
| Priority      | P0                                                                 |
| Wave          | 2                                                                  |
| Lane          | account                                                            |
| Dependencies  | SSW-003                                                            |
| Primary paths | `docs/decisions/**`, `packages/account-adapter/**`, `contracts/**` |

## Active feature context

- working/features/smart-account-and-passkeys.md

## Objective

Compare Safe and Kernel, select the maintained base, pin deployments and EntryPoint compatibility, and create a local Foundry/account-adapter harness without writing a custom account base.

## Deliverables

- Decision ADR with license, audits, recovery, provider independence, and migration analysis
- Pinned ABIs, chain/deployment manifest, and code-hash verification
- Local account deployment and execution test harness

## Non-goals

- Passkey UI
- Testnet UserOperation
- Custom identity or recovery module

## Acceptance criteria

1. The selected base satisfies ERC-1271 and has a credible ERC-4337/passkey path
2. Local deployments are deterministic and code hashes are asserted
3. Hosted SDK/provider dependencies are isolated behind the account adapter

## Expected failure handling

- Reject incompatible EntryPoint/module combinations
- Do not trust an address without chain ID and code hash
- Document upgrade and module-install authority

## Validation mapped to acceptance

1. `forge test --root contracts`
2. `Account-adapter unit tests against Anvil`
3. `License and deployment-address review`

## Agent prompt

```text
Implement SSW-015: Select the smart-account base and build the Foundry harness.

Project: sovereign-smart-wallet
Objective: Compare Safe and Kernel, select the maintained base, pin deployments and EntryPoint compatibility, and create a local Foundry/account-adapter harness without writing a custom account base.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/smart-account-and-passkeys.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-003.
5. Work only on SSW-015 in an atomic branch. Primary owned paths: docs/decisions/**, packages/account-adapter/**, contracts/**.


Deliver:
- Decision ADR with license, audits, recovery, provider independence, and migration analysis
- Pinned ABIs, chain/deployment manifest, and code-hash verification
- Local account deployment and execution test harness

Do not include:
- Passkey UI
- Testnet UserOperation
- Custom identity or recovery module

Acceptance criteria:
1. The selected base satisfies ERC-1271 and has a credible ERC-4337/passkey path
2. Local deployments are deterministic and code hashes are asserted
3. Hosted SDK/provider dependencies are isolated behind the account adapter

Error and security behavior:
- Reject incompatible EntryPoint/module combinations
- Do not trust an address without chain ID and code hash
- Document upgrade and module-install authority
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run forge test --root contracts and map the result to acceptance criterion 1.
2. Run Account-adapter unit tests against Anvil and map the result to acceptance criterion 2.
3. Run License and deployment-address review and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
