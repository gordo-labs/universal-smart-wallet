# Backlog — Sovereign Smart Wallet

Canonical atomic construction queue. Dependencies and scheduling metadata live
in [task-graph.json](orchestration/task-graph.json).

| ID | Status | Priority | Lane | Title | Detail |
| --- | --- | --- | --- | --- | --- |
| SSW-001 | Done | P0 | foundation | Bootstrap the executable monorepo foundation | [task](tasks/SSW-001-monorepo-foundation.md) |
| SSW-002 | Done | P0 | governance | Create the public GitHub repository and governance baseline | [task](tasks/SSW-002-public-repository-governance.md) |
| SSW-003 | Done | P0 | architecture | Pin the standards and dependency compatibility baseline | [task](tasks/SSW-003-standards-dependency-baseline.md) |
| SSW-004 | Done | P0 | credential-core | Implement shared runtime schemas and DCQL policy mapping | [task](tasks/SSW-004-shared-schemas-dcql-policy.md) |
| SSW-005 | Done | P0 | credential-core | Implement nonce, replay, and verification-result domain logic | [task](tasks/SSW-005-nonce-replay-verification-domain.md) |
| SSW-006 | Done | P0 | vault | Design and prove the vault key-management boundary | [task](tasks/SSW-006-vault-key-management-adr.md) |
| SSW-007 | Done | P0 | vault | Implement the encrypted vault and IndexedDB adapter | [task](tasks/SSW-007-encrypted-vault-indexeddb.md) |
| SSW-008 | Done | P0 | credential-format | Implement the version-pinned SD-JWT VC adapter | [task](tasks/SSW-008-sd-jwt-vc-adapter.md) |
| SSW-009 | Done | P0 | protocol | Implement the OpenID4VCI issuance flow | [task](tasks/SSW-009-openid4vci-flow.md) |
| SSW-010 | Done | P0 | protocol | Implement the OpenID4VP and DCQL presentation flow | [task](tasks/SSW-010-openid4vp-flow.md) |
| SSW-011 | Done | P1 | apps | Build the synthetic OpenID4VCI issuer demo | [task](tasks/SSW-011-issuer-demo.md) |
| SSW-012 | Done | P0 | apps | Build the wallet web demo | [task](tasks/SSW-012-wallet-web-demo.md) |
| SSW-013 | Done | P0 | apps | Build the OpenID4VP verifier demo | [task](tasks/SSW-013-verifier-demo.md) |
| SSW-014 | Done | P0 | integration | Integrate the deterministic local vertical slice | [task](tasks/SSW-014-local-vertical-slice-e2e.md) |
| SSW-015 | Done | P0 | account | Select the smart-account base and build the Foundry harness | [task](tasks/SSW-015-smart-account-adr-foundry.md) |
| SSW-016 | Done | P0 | account | Implement the local passkey smart account and ERC-1271 flow | [task](tasks/SSW-016-passkey-account-erc1271.md) |
| SSW-017 | Done | P1 | account | Add the opt-in ERC-4337 testnet adapter | [task](tasks/SSW-017-erc4337-testnet-adapter.md) |
| SSW-018 | Done | P1 | account | Integrate and test the pinned ERC-7579 compatibility path | [task](tasks/SSW-018-erc7579-compatibility.md) |
| SSW-019 | Done | P1 | identity | Decide and implement DID control and holder binding | [task](tasks/SSW-019-did-holder-binding.md) |
| SSW-020 | Done | P0 | verification | Implement issuer trust and credential status/revocation | [task](tasks/SSW-020-trust-status-revocation.md) |
| SSW-021 | Done | P0 | recovery | Implement account recovery and encrypted vault backup/restore | [task](tasks/SSW-021-recovery-encrypted-backup.md) |
| SSW-022 | Done | P0 | security-ux | Harden consent, phishing resistance, and privacy UX | [task](tasks/SSW-022-consent-privacy-hardening.md) |
| SSW-023 | Done | P1 | onchain | Build the short-lived on-chain attestation and access demo | [task](tasks/SSW-023-onchain-attestation-demo.md) |
| SSW-024 | Done | P0 | quality | Add adversarial, property, fuzz, and redaction hardening | [task](tasks/SSW-024-adversarial-hardening.md) |
| SSW-025 | Blocked | P0 | integration | Integrate the full local and testnet release candidate | [task](tasks/SSW-025-testnet-release-candidate.md) |
| SSW-026 | Done | P0 | security | Prepare the independent security and privacy review packet | [task](tasks/SSW-026-audit-readiness.md) |
| SSW-027 | Blocked | P1 | release | Publish the first open-source alpha release | [task](tasks/SSW-027-open-source-alpha-release.md) |
| SSW-028 | Done | P3 | research | Research a future ZK predicate-proof path | [task](tasks/SSW-028-zk-predicate-research.md) |
| SSW-029 | Done | P0 | architecture | Define the modular Wallet Platform architecture | [task](tasks/SSW-029-wallet-platform-architecture.md) |
| SSW-030 | Done | P0 | platform-core | Implement platform schemas and opaque wallet locators | [task](tasks/SSW-030-platform-schemas-wallet-locators.md) |
| SSW-031 | Done | P0 | platform-storage | Implement multi-tenant storage and redacted audit events | [task](tasks/SSW-031-platform-store-tenancy-audit.md) |
| SSW-032 | Done | P0 | account | Implement the Safe wallet-service adapter | [task](tasks/SSW-032-safe-service-adapter.md) |
| SSW-033 | Done | P0 | authorization | Implement scoped operational-signer policies | [task](tasks/SSW-033-signer-policy-engine.md) |
| SSW-034 | Done | P0 | authentication | Build the modular passkey authentication adapter | [task](tasks/SSW-034-passkey-auth-module.md) |
| SSW-035 | Done | P0 | authentication | Build the self-hosted email OTP module | [task](tasks/SSW-035-email-otp-auth-module.md) |
| SSW-036 | Done | P1 | authentication | Build the provider-neutral social OIDC module | [task](tasks/SSW-036-social-oidc-auth-module.md) |
| SSW-037 | Done | P1 | identity | Add the default private DID lifecycle | [task](tasks/SSW-037-default-private-did-lifecycle.md) |
| SSW-038 | Done | P0 | portability | Implement in-place rotation and full wallet portability | [task](tasks/SSW-038-wallet-portability-protocol.md) |
| SSW-039 | Done | P1 | assets | Implement native, token, and NFT wallet actions | [task](tasks/SSW-039-wallet-asset-actions.md) |
| SSW-040 | Done | P0 | service | Build the self-hosted Wallet Service API | [task](tasks/SSW-040-wallet-service-rest-openapi.md) |
| SSW-041 | Done | P0 | sdk | Build the browser and server TypeScript Wallet SDK | [task](tasks/SSW-041-typescript-wallet-sdk.md) |
| SSW-042 | Done | P1 | sdk | Build framework-neutral React wallet bindings | [task](tasks/SSW-042-react-wallet-sdk.md) |
| SSW-043 | Done | P0 | apps | Build the modular consumer wallet application | [task](tasks/SSW-043-consumer-wallet-app.md) |
| SSW-044 | Done | P1 | apps | Build the Wallet Platform administration console | [task](tasks/SSW-044-wallet-admin-console.md) |
| SSW-045 | Done | P1 | examples | Build executable Wallet Platform use-case examples | [task](tasks/SSW-045-wallet-use-case-gallery.md) |
| SSW-046 | Done | P1 | operations | Build the self-hosted reference stack | [task](tasks/SSW-046-self-hosted-reference-stack.md) |
| SSW-047 | Done | P0 | security | Integrate and adversarially test the Wallet Platform | [task](tasks/SSW-047-wallet-platform-security-e2e.md) |
| SSW-048 | Done | P1 | documentation | Publish complete local Wallet Platform documentation | [task](tasks/SSW-048-wallet-platform-documentation.md) |
| SSW-049 | Done | P0 | architecture | Define institutional identity, assurance, and EUDI architecture | [task](tasks/SSW-049-institutional-identity-architecture.md) |
| SSW-050 | Done | P0 | credential-core | Generalize credential templates, schemas, and lifecycle types | [task](tasks/SSW-050-credential-template-domain.md) |
| SSW-051 | Done | P0 | credential-format | Implement replaceable multiformat credential adapters | [task](tasks/SSW-051-multiformat-credential-adapters.md) |
| SSW-052 | Done | P0 | trust | Build the signed off-chain trust and status registry | [task](tasks/SSW-052-signed-trust-status-registry.md) |
| SSW-053 | Done | P0 | security | Implement institutional KMS/HSM signing ports | [task](tasks/SSW-053-institutional-kms-signer.md) |
| SSW-054 | Doing | P0 | issuer | Build the institutional credential issuer service | [task](tasks/SSW-054-institutional-issuer-service.md) |
| SSW-055 | Doing | P1 | identity | Add wallet-created self-attested credentials | [task](tasks/SSW-055-self-attested-credentials.md) |
| SSW-056 | Doing | P0 | verifier | Build the credential verification service | [task](tasks/SSW-056-credential-verifier-service.md) |
| SSW-057 | Todo | P0 | sdk | Expose issuer, holder, verifier, and scanner SDKs | [task](tasks/SSW-057-identity-sdk-surfaces.md) |
| SSW-058 | Todo | P0 | apps | Build the institutional issuer administration panel | [task](tasks/SSW-058-institutional-issuer-admin.md) |
| SSW-059 | Todo | P0 | apps | Build the individual wallet identity studio | [task](tasks/SSW-059-individual-identity-studio.md) |
| SSW-060 | Todo | P0 | scanner | Build the online and offline credential QR scanner | [task](tasks/SSW-060-credential-qr-scanner.md) |
| SSW-061 | Todo | P1 | mobile | Build the Expo React Native identity wallet and SDK | [task](tasks/SSW-061-expo-mobile-identity-wallet.md) |
| SSW-062 | Todo | P1 | examples | Add university, government, driving-school, and enterprise packs | [task](tasks/SSW-062-institutional-use-case-packs.md) |
| SSW-063 | Todo | P0 | security | Adversarially test identity flows and EUDI readiness | [task](tasks/SSW-063-institutional-identity-security-conformance.md) |
| SSW-064 | Todo | P1 | documentation | Publish institutional identity documentation and prompt catalog | [task](tasks/SSW-064-institutional-identity-documentation.md) |

## Status rules

- `Todo`: accepted and not started.
- `Doing`: one named branch/agent owns it.
- `Blocked`: a concrete unmet dependency or authority gate is recorded.
- `Done`: acceptance and validation evidence are recorded.
- `Dropped`: decision and replacement, if any, are recorded.
