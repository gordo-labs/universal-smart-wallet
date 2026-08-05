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
- [SSW-029 — Define the modular Wallet Platform architecture](../../working/tasks/SSW-029-wallet-platform-architecture.md)
- [SSW-030 — Implement platform schemas and opaque wallet locators](../../working/tasks/SSW-030-platform-schemas-wallet-locators.md)
- [SSW-031 — Implement multi-tenant storage and redacted audit events](../../working/tasks/SSW-031-platform-store-tenancy-audit.md)
- [SSW-032 — Implement the Safe wallet-service adapter](../../working/tasks/SSW-032-safe-service-adapter.md)
- [SSW-033 — Implement scoped operational-signer policies](../../working/tasks/SSW-033-signer-policy-engine.md)
- [SSW-034 — Build the modular passkey authentication adapter](../../working/tasks/SSW-034-passkey-auth-module.md)
- [SSW-035 — Build the self-hosted email OTP module](../../working/tasks/SSW-035-email-otp-auth-module.md)
- [SSW-036 — Build the provider-neutral social OIDC module](../../working/tasks/SSW-036-social-oidc-auth-module.md)
- [SSW-037 — Add the default private DID lifecycle](../../working/tasks/SSW-037-default-private-did-lifecycle.md)
- [SSW-038 — Implement in-place rotation and full wallet portability](../../working/tasks/SSW-038-wallet-portability-protocol.md)
- [SSW-039 — Implement native, token, and NFT wallet actions](../../working/tasks/SSW-039-wallet-asset-actions.md)
- [SSW-040 — Build the self-hosted Wallet Service API](../../working/tasks/SSW-040-wallet-service-rest-openapi.md)
- [SSW-041 — Build the browser and server TypeScript Wallet SDK](../../working/tasks/SSW-041-typescript-wallet-sdk.md)
- [SSW-042 — Build framework-neutral React wallet bindings](../../working/tasks/SSW-042-react-wallet-sdk.md)
- [SSW-043 — Build the modular consumer wallet application](../../working/tasks/SSW-043-consumer-wallet-app.md)
- [SSW-044 — Build the Wallet Platform administration console](../../working/tasks/SSW-044-wallet-admin-console.md)
- [SSW-045 — Build executable Wallet Platform use-case examples](../../working/tasks/SSW-045-wallet-use-case-gallery.md)
- [SSW-046 — Build the self-hosted reference stack](../../working/tasks/SSW-046-self-hosted-reference-stack.md)
- [SSW-047 — Integrate and adversarially test the Wallet Platform](../../working/tasks/SSW-047-wallet-platform-security-e2e.md)
- [SSW-048 — Publish complete local Wallet Platform documentation](../../working/tasks/SSW-048-wallet-platform-documentation.md)
- [SSW-049 — Define institutional identity, assurance, and EUDI architecture](../../working/tasks/SSW-049-institutional-identity-architecture.md)
- [SSW-050 — Generalize credential templates, schemas, and lifecycle types](../../working/tasks/SSW-050-credential-template-domain.md)
- [SSW-051 — Implement replaceable multiformat credential adapters](../../working/tasks/SSW-051-multiformat-credential-adapters.md)
- [SSW-052 — Build the signed off-chain trust and status registry](../../working/tasks/SSW-052-signed-trust-status-registry.md)
- [SSW-053 — Implement institutional KMS/HSM signing ports](../../working/tasks/SSW-053-institutional-kms-signer.md)
- [SSW-054 — Build the institutional credential issuer service](../../working/tasks/SSW-054-institutional-issuer-service.md)
- [SSW-055 — Add wallet-created self-attested credentials](../../working/tasks/SSW-055-self-attested-credentials.md)
- [SSW-056 — Build the credential verification service](../../working/tasks/SSW-056-credential-verifier-service.md)
- [SSW-057 — Expose issuer, holder, verifier, and scanner SDKs](../../working/tasks/SSW-057-identity-sdk-surfaces.md)
- [SSW-058 — Build the institutional issuer administration panel](../../working/tasks/SSW-058-institutional-issuer-admin.md)
- [SSW-059 — Build the individual wallet identity studio](../../working/tasks/SSW-059-individual-identity-studio.md)
- [SSW-060 — Build the online and offline credential QR scanner](../../working/tasks/SSW-060-credential-qr-scanner.md)
- [SSW-061 — Build the Expo React Native identity wallet and SDK](../../working/tasks/SSW-061-expo-mobile-identity-wallet.md)
- [SSW-062 — Add university, government, driving-school, and enterprise packs](../../working/tasks/SSW-062-institutional-use-case-packs.md)
- [SSW-063 — Adversarially test identity flows and EUDI readiness](../../working/tasks/SSW-063-institutional-identity-security-conformance.md)
- [SSW-064 — Publish institutional identity documentation and prompt catalog](../../working/tasks/SSW-064-institutional-identity-documentation.md)
