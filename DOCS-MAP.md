# DOCS-MAP — Universal Smart Wallet

## Overview

- [README.md](README.md)
- [Next.js documentation app](apps/docs/README.md)
- [PROJECT.json](PROJECT.json)
- [STATUS.md](STATUS.md)
- [START_HERE.md](START_HERE.md)

## Review and source material

- [Public market landscape](docs/research/market-landscape.md)

## Threat model

- [Vault key management](docs/threat-model/SSW-006-vault-key-management.md)
- [Wallet Platform trust boundaries](docs/threat-model/wallet-platform-trust-boundaries.md)

## Architecture and protocols

- [Institutional identity developer docs](docs/identity-platform/README.md)
- [Institutional identity operator handoff](docs/identity-platform/operator-handoff.md)
- [EUDI/HAIP readiness evidence](docs/audit/eudi-haip-readiness.md)
- [SD-JWT VC adapter](docs/protocols/sd-jwt-vc-adapter.md)
- [OpenID4VCI issuance](docs/protocols/openid4vci-issuance.md)
- [OpenID4VP and credential exchange](docs/identity-platform/protocols-formats.md)
- [Synthetic issuer demo](apps/issuer-demo/src/index.ts)
- [DID control and holder binding ADR](docs/decisions/SSW-019-did-holder-binding.md)
- [Recovery and encrypted backup](docs/platform/self-hosting.md)
- [Smart account and passkeys](docs/decisions/SSW-015-smart-account-selection.md)
- [Modular passkey authentication package](packages/auth-passkey/src/index.ts)
- [ERC-7579 compatibility ADR](docs/decisions/SSW-018-erc7579-compatibility.md)
- [Wallet Platform architecture ADR](docs/decisions/SSW-029-wallet-platform-architecture.md)
- [Institutional identity and EUDI ADR](docs/decisions/SSW-049-institutional-identity-architecture.md)
- [Identity and holder binding](docs/decisions/SSW-019-did-holder-binding.md)
- [Verification, trust, and status](docs/identity-platform/protocols-formats.md)
- [On-chain attestations](docs/architecture/SSW-026-data-flow.md)

## Release candidate

- [SSW-025 acceptance report](docs/releases/SSW-025-acceptance-report.md)
- [SSW-025 support matrix](docs/releases/SSW-025-support-matrix.md)
- [SSW-025 deployment manifest](docs/releases/SSW-025-deployment-manifest.json)

## Planning boundary

Task prompts, orchestration graphs, history and memory are maintained in the
owner's local workspace and are intentionally excluded from this repository.

## Global workspace

- [Project standards](../../docs/PROJECT-STANDARDS.md)
