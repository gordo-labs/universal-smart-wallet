# Prompt catalog

Every atomic task document under `working/tasks/` ends with a self-contained
copy/paste prompt. The documents are generated from
[`task-graph.json`](task-graph.json).

## Usage

1. Confirm dependencies are merged.
2. Open the selected task document.
3. Copy the entire **Agent prompt** section.
4. Start the agent in an isolated branch/worktree.
5. Require the acceptance report before integration.

Do not send only a task title. The full prompt carries scope, non-goals, error
handling, validation, security boundaries, and handoff requirements.
## Generated task links

- [SSW-001 — Bootstrap the executable monorepo foundation](../../working/tasks/SSW-001-monorepo-foundation.md)
- [SSW-002 — Create the public GitHub repository and governance baseline](../../working/tasks/SSW-002-public-repository-governance.md)
- [SSW-003 — Pin the standards and dependency compatibility baseline](../../working/tasks/SSW-003-standards-dependency-baseline.md)
- [SSW-004 — Implement shared runtime schemas and DCQL policy mapping](../../working/tasks/SSW-004-shared-schemas-dcql-policy.md)
- [SSW-005 — Implement nonce, replay, and verification-result domain logic](../../working/tasks/SSW-005-nonce-replay-verification-domain.md)
- [SSW-006 — Design and prove the vault key-management boundary](../../working/tasks/SSW-006-vault-key-management-adr.md)
- [SSW-007 — Implement the encrypted vault and IndexedDB adapter](../../working/tasks/SSW-007-encrypted-vault-indexeddb.md)
- [SSW-008 — Implement the version-pinned SD-JWT VC adapter](../../working/tasks/SSW-008-sd-jwt-vc-adapter.md)
- [SSW-009 — Implement the OpenID4VCI issuance flow](../../working/tasks/SSW-009-openid4vci-flow.md)
- [SSW-010 — Implement the OpenID4VP and DCQL presentation flow](../../working/tasks/SSW-010-openid4vp-flow.md)
- [SSW-011 — Build the synthetic OpenID4VCI issuer demo](../../working/tasks/SSW-011-issuer-demo.md)
- [SSW-012 — Build the wallet web demo](../../working/tasks/SSW-012-wallet-web-demo.md)
- [SSW-013 — Build the OpenID4VP verifier demo](../../working/tasks/SSW-013-verifier-demo.md)
- [SSW-014 — Integrate the deterministic local vertical slice](../../working/tasks/SSW-014-local-vertical-slice-e2e.md)
- [SSW-015 — Select the smart-account base and build the Foundry harness](../../working/tasks/SSW-015-smart-account-adr-foundry.md)
- [SSW-016 — Implement the local passkey smart account and ERC-1271 flow](../../working/tasks/SSW-016-passkey-account-erc1271.md)
- [SSW-017 — Add the opt-in ERC-4337 testnet adapter](../../working/tasks/SSW-017-erc4337-testnet-adapter.md)
- [SSW-018 — Integrate and test the pinned ERC-7579 compatibility path](../../working/tasks/SSW-018-erc7579-compatibility.md)
- [SSW-019 — Decide and implement DID control and holder binding](../../working/tasks/SSW-019-did-holder-binding.md)
- [SSW-020 — Implement issuer trust and credential status/revocation](../../working/tasks/SSW-020-trust-status-revocation.md)
- [SSW-021 — Implement account recovery and encrypted vault backup/restore](../../working/tasks/SSW-021-recovery-encrypted-backup.md)
- [SSW-022 — Harden consent, phishing resistance, and privacy UX](../../working/tasks/SSW-022-consent-privacy-hardening.md)
- [SSW-023 — Build the short-lived on-chain attestation and access demo](../../working/tasks/SSW-023-onchain-attestation-demo.md)
- [SSW-024 — Add adversarial, property, fuzz, and redaction hardening](../../working/tasks/SSW-024-adversarial-hardening.md)
- [SSW-025 — Integrate the full local and testnet release candidate](../../working/tasks/SSW-025-testnet-release-candidate.md)
- [SSW-026 — Prepare the independent security and privacy review packet](../../working/tasks/SSW-026-audit-readiness.md)
- [SSW-027 — Publish the first open-source alpha release](../../working/tasks/SSW-027-open-source-alpha-release.md)
- [SSW-028 — Research a future ZK predicate-proof path](../../working/tasks/SSW-028-zk-predicate-research.md)
