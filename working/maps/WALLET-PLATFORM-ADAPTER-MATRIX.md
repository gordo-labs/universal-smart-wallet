# Wallet Platform dependency and adapter matrix

This matrix is the implementation boundary for SSW-029 and the following
platform tasks. It distinguishes what Sovereign Smart Wallet owns from what it
must integrate behind a replaceable port. Versions are pinned where the
repository already has a compatibility decision; future adapters require a
fresh source/license review before implementation.

| Capability               | Project-owned surface                         | Adapter/port                      | Current baseline                                      | License/source evidence                                                                                                                       | Gate                                       |
| ------------------------ | --------------------------------------------- | --------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Runtime schemas/policies | `@ssw/shared-types`, credential/policy domain | None in core                      | TypeScript 5.9.2; Vitest 4.1.10                       | Repository-owned; Apache-2.0 project                                                                                                          | Unit/property tests, no provider imports   |
| Safe account             | Account lifecycle/policy boundary             | `AccountPort`, `SignerPort`       | Safe Protocol Kit 8.0.4; EntryPoint contracts 0.8.0   | MIT baseline in SSW-003/015; [Safe source](https://github.com/safe-global/safe-core-sdk), [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) | Per-chain address + runtime code hash      |
| Contract signatures      | Verification interface                        | `AccountPort`                     | ERC-1271                                              | Ethereum EIP; [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271)                                                                             | Positive/negative contract signature tests |
| Account modules          | Optional compatibility adapter                | `ModulePort`                      | ERC-7579 draft, version-pinned only                   | Draft; [ERC-7579](https://eips.ethereum.org/EIPS/eip-7579)                                                                                    | Pin implementation and audit scope         |
| Passkeys                 | Challenge/origin/policy orchestration         | `AuthProviderPort`, `SignerPort`  | WebAuthn Level 3; PRF optional                        | W3C Recommendation; [WebAuthn](https://www.w3.org/TR/webauthn-3/)                                                                             | Browser/virtual-authenticator matrix       |
| Email login              | OTP lifecycle/policy only                     | `EmailTransportPort`              | Generic SMTP; Mailpit local fixture                   | SMTP provider chosen by deployment                                                                                                            | Hash/single-use/rate-limit tests           |
| Social login             | Identity linking and session policy           | `OidcProviderPort`                | Generic OIDC; no fixed provider                       | OpenID/OAuth specs; provider terms reviewed by deployer                                                                                       | issuer/audience/nonce/PKCE/JWKS tests      |
| Metadata store           | Tenant isolation/idempotency/audit model      | `StorePort`, `AuditPort`          | In-memory + PostgreSQL planned                        | PostgreSQL PostgreSQL License; adapter package review required                                                                                | Transaction, isolation, redaction tests    |
| RPC                      | Chain binding and transaction orchestration   | `RpcPort`                         | Local Anvil; Base Sepolia first; Scroll Sepolia later | viem 2.55.10 baseline in SSW-003                                                                                                              | Endpoint/chain/code-hash checks            |
| Bundler                  | UserOperation transport                       | `BundlerPort`                     | ERC-4337-compatible provider selected per deployment  | Provider-specific; no hosted dependency in core                                                                                               | Simulation/replay/outage tests             |
| Paymaster                | Optional gas sponsorship                      | `PaymasterPort`                   | User-paid gas or test fixture by default              | Provider-specific; no default vendor                                                                                                          | Scope, quota and abuse tests               |
| Credential vault         | Client encryption, lock, recovery boundary    | `VaultPort`                       | Existing `@ssw/credential-vault`                      | Repository-owned crypto boundary; WebCrypto                                                                                                   | No plaintext service/store/log             |
| VC exchange              | Protocol flow and bounded disclosure          | `CredentialExchangePort`          | OpenID4VCI/VP 1.0; DCQL subset                        | OpenID Foundation final specs                                                                                                                 | Request/issuer/status/replay tests         |
| Credential format        | Serialization and verification                | `CredentialFormatPort`            | SD-JWT RFC 9901; SD-JWT VC draft 16                   | IETF RFC + draft; [RFC 9901](https://www.rfc-editor.org/rfc/rfc9901)                                                                          | Version-pinned fixtures and upgrade note   |
| DID control              | Local derivation/holder binding               | `DidPort`                         | `did:pkh:eip155:<chainId>:<safe>`                     | DID Core 1.0; [DID Core](https://www.w3.org/TR/did-core/)                                                                                     | No resolver dependency in core tests       |
| Status/trust             | Issuer/status policy                          | `StatusPort`, `TrustRegistryPort` | Local fixtures first                                  | Issuer/registy-specific                                                                                                                       | Fail-closed outage and replay tests        |
| KMS/HSM/signer custody   | Key handle operations only                    | `KeyManagementPort`               | Local synthetic signer fixture                        | Deployment-specific; no project custody claim                                                                                                 | Rotation, refusal and audit tests          |
| HTTP/API                 | Typed service contract                        | `HttpTransportPort`               | Fetch/undici adapter selected by app                  | Runtime-specific                                                                                                                              | Timeout, abort, idempotency tests          |
| Admin/wallet UI          | UX and consent presentation                   | SDK public interfaces             | Next.js 15.5.6, React 19.1.0 current app baseline     | MIT Next/React; package notices retained                                                                                                      | Browser accessibility/security checks      |

## Rules for adding an adapter

1. Add a port contract and deterministic fake before adding a provider package.
2. Record exact version, license/SPDX, source URL, maintenance status and
   replacement path in this matrix and the relevant ADR.
3. Keep credentials, PII, OTPs, private keys, DEKs, RPC secrets and production
   endpoints out of source, fixtures, logs and generated docs.
4. Core tests must run without hosted RPC, bundler, paymaster, issuer,
   verifier, resolver, trust registry, SMTP or OIDC services.
5. A deployment may select an adapter, but selection is configuration and does
   not change the public domain types or custody guarantees.

## Known non-selections

Crossmint, Privy and other hosted wallet/auth providers are integration
examples, not architectural dependencies. Their APIs may be wrapped by future
adapters, but the self-hosted service and SDK must remain usable without them.
