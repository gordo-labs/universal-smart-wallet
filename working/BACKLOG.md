# Backlog — Sovereign Smart Wallet

Canonical atomic construction queue. Dependencies and scheduling metadata live
in [task-graph.json](orchestration/task-graph.json).

| ID | Status | Priority | Lane | Title | Detail |
| --- | --- | --- | --- | --- | --- |
| SSW-001 | Done | P0 | foundation | Bootstrap the executable monorepo foundation | [task](tasks/SSW-001-monorepo-foundation.md) |
| SSW-002 | Done | P0 | governance | Create the public GitHub repository and governance baseline | [task](tasks/SSW-002-public-repository-governance.md) |
| SSW-003 | Done | P0 | architecture | Pin the standards and dependency compatibility baseline | [task](tasks/SSW-003-standards-dependency-baseline.md) |
| SSW-004 | Todo | P0 | credential-core | Implement shared runtime schemas and DCQL policy mapping | [task](tasks/SSW-004-shared-schemas-dcql-policy.md) |
| SSW-005 | Todo | P0 | credential-core | Implement nonce, replay, and verification-result domain logic | [task](tasks/SSW-005-nonce-replay-verification-domain.md) |
| SSW-006 | Todo | P0 | vault | Design and prove the vault key-management boundary | [task](tasks/SSW-006-vault-key-management-adr.md) |
| SSW-007 | Todo | P0 | vault | Implement the encrypted vault and IndexedDB adapter | [task](tasks/SSW-007-encrypted-vault-indexeddb.md) |
| SSW-008 | Todo | P0 | credential-format | Implement the version-pinned SD-JWT VC adapter | [task](tasks/SSW-008-sd-jwt-vc-adapter.md) |
| SSW-009 | Todo | P0 | protocol | Implement the OpenID4VCI issuance flow | [task](tasks/SSW-009-openid4vci-flow.md) |
| SSW-010 | Todo | P0 | protocol | Implement the OpenID4VP and DCQL presentation flow | [task](tasks/SSW-010-openid4vp-flow.md) |
| SSW-011 | Todo | P1 | apps | Build the synthetic OpenID4VCI issuer demo | [task](tasks/SSW-011-issuer-demo.md) |
| SSW-012 | Todo | P0 | apps | Build the wallet web demo | [task](tasks/SSW-012-wallet-web-demo.md) |
| SSW-013 | Todo | P0 | apps | Build the OpenID4VP verifier demo | [task](tasks/SSW-013-verifier-demo.md) |
| SSW-014 | Todo | P0 | integration | Integrate the deterministic local vertical slice | [task](tasks/SSW-014-local-vertical-slice-e2e.md) |
| SSW-015 | Todo | P0 | account | Select the smart-account base and build the Foundry harness | [task](tasks/SSW-015-smart-account-adr-foundry.md) |
| SSW-016 | Todo | P0 | account | Implement the local passkey smart account and ERC-1271 flow | [task](tasks/SSW-016-passkey-account-erc1271.md) |
| SSW-017 | Todo | P1 | account | Add the opt-in ERC-4337 testnet adapter | [task](tasks/SSW-017-erc4337-testnet-adapter.md) |
| SSW-018 | Todo | P1 | account | Integrate and test the pinned ERC-7579 compatibility path | [task](tasks/SSW-018-erc7579-compatibility.md) |
| SSW-019 | Todo | P1 | identity | Decide and implement DID control and holder binding | [task](tasks/SSW-019-did-holder-binding.md) |
| SSW-020 | Todo | P0 | verification | Implement issuer trust and credential status/revocation | [task](tasks/SSW-020-trust-status-revocation.md) |
| SSW-021 | Todo | P0 | recovery | Implement account recovery and encrypted vault backup/restore | [task](tasks/SSW-021-recovery-encrypted-backup.md) |
| SSW-022 | Todo | P0 | security-ux | Harden consent, phishing resistance, and privacy UX | [task](tasks/SSW-022-consent-privacy-hardening.md) |
| SSW-023 | Todo | P1 | onchain | Build the short-lived on-chain attestation and access demo | [task](tasks/SSW-023-onchain-attestation-demo.md) |
| SSW-024 | Todo | P0 | quality | Add adversarial, property, fuzz, and redaction hardening | [task](tasks/SSW-024-adversarial-hardening.md) |
| SSW-025 | Todo | P0 | integration | Integrate the full local and testnet release candidate | [task](tasks/SSW-025-testnet-release-candidate.md) |
| SSW-026 | Todo | P0 | security | Prepare the independent security and privacy review packet | [task](tasks/SSW-026-audit-readiness.md) |
| SSW-027 | Todo | P1 | release | Publish the first open-source alpha release | [task](tasks/SSW-027-open-source-alpha-release.md) |
| SSW-028 | Todo | P3 | research | Research a future ZK predicate-proof path | [task](tasks/SSW-028-zk-predicate-research.md) |

## Status rules

- `Todo`: accepted and not started.
- `Doing`: one named branch/agent owns it.
- `Blocked`: a concrete unmet dependency or authority gate is recorded.
- `Done`: acceptance and validation evidence are recorded.
- `Dropped`: decision and replacement, if any, are recorded.
