# SSW-007 — Implement the encrypted vault and IndexedDB adapter

> Generated from `working/orchestration/task-graph.json`. Edit the graph and rerun `node scripts/render-task-prompts.mjs`.

| Field | Value |
| --- | --- |
| Status | Todo |
| Priority | P0 |
| Wave | 3 |
| Lane | vault |
| Dependencies | SSW-006 |
| Primary paths | `packages/credential-vault/**` |

## Active feature context

- working/features/encrypted-vault.md

## Objective

Implement credential encryption, authenticated metadata, indexing, deletion, corruption handling, and versioned IndexedDB migrations behind storage and crypto ports.

## Deliverables

- In-memory and IndexedDB stores
- AES-GCM versioned envelope with authenticated metadata
- Migration, deletion, and corruption-recovery tests

## Non-goals

- Credential protocol parsing
- User-interface polish
- Cloud synchronization

## Acceptance criteria

1. Raw credentials are never stored plaintext
2. Index metadata is minimized and documented
3. Tampering, partial writes, old versions, and failed migrations do not expose partial plaintext

## Expected failure handling

- Use atomic transactions for writes and migrations
- Surface recoverable versus terminal vault errors
- Never include decrypted credentials in exception messages

## Validation mapped to acceptance

1. `Unit tests with WebCrypto`
2. `Fake IndexedDB migration and transaction tests`
3. `Browser persistence smoke test`

## Agent prompt

```text
Implement SSW-007: Implement the encrypted vault and IndexedDB adapter.

Project: sovereign-smart-wallet
Objective: Implement credential encryption, authenticated metadata, indexing, deletion, corruption handling, and versioned IndexedDB migrations behind storage and crypto ports.

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: working/features/encrypted-vault.md.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: SSW-006.
5. Work only on SSW-007 in an atomic branch. Primary owned paths: packages/credential-vault/**.


Deliver:
- In-memory and IndexedDB stores
- AES-GCM versioned envelope with authenticated metadata
- Migration, deletion, and corruption-recovery tests

Do not include:
- Credential protocol parsing
- User-interface polish
- Cloud synchronization

Acceptance criteria:
1. Raw credentials are never stored plaintext
2. Index metadata is minimized and documented
3. Tampering, partial writes, old versions, and failed migrations do not expose partial plaintext

Error and security behavior:
- Use atomic transactions for writes and migrations
- Surface recoverable versus terminal vault errors
- Never include decrypted credentials in exception messages
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
1. Run Unit tests with WebCrypto and map the result to acceptance criterion 1.
2. Run Fake IndexedDB migration and transaction tests and map the result to acceptance criterion 2.
3. Run Browser persistence smoke test and map the result to acceptance criterion 3.
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
```
