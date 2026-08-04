# ADR SSW-029 — Modular Wallet Platform and self-hosted service boundary

**Date:** 2026-08-04  
**Status:** Accepted for platform planning  
**Depends on:** SSW-026 review packet (review-ready evidence; not an independent audit)

## Context

The next platform wave exposes the existing credential wallet and Safe
account-control primitives through a provider-neutral SDK, a self-hosted
service, a consumer wallet app, and an administration console. The platform
must remain portable between vendors and must not turn a hosted authentication
provider into the permanent owner of a user's account or identity.

This ADR is an architecture boundary only. It does not select a permanent
hosted vendor, claim production readiness, or add support for mainnet, real
identity proofing, or valuable assets.

## Decision

Use a layered, port-and-adapter architecture with a user-controlled Safe as
the default cryptographic control root. A passkey or explicit recovery owner
controls the Safe. Email and social login identify a principal and may enable a
scoped, short-lived operational signer, but can never install an irremovable
vendor owner. A passkey or recovery factor is required for sensitive actions.

The stable public identity is derived locally as
`did:pkh:eip155:<chainId>:<safe-address>`. It is not registered or written to
the chain during wallet creation. Pairwise holder identifiers remain the
default for credential presentations. Credential payloads and PII stay in the
client-side encrypted vault; the service stores only bounded metadata and
redacted audit events.

### Required layers

| Layer                        | Responsibility                                                           | Must not depend directly on                                   |
| ---------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Domain and public types      | Wallet, principal, intent, policy, DID, portability schemas              | RPC, browser, Next.js, hosted auth                            |
| SDK                          | Browser/server clients, typed errors, idempotency, step-up orchestration | A specific vendor, database, or framework                     |
| Service                      | Tenant-scoped metadata, policy decisions, transaction lifecycle, audit   | A specific SMTP/OIDC/RPC/bundler/paymaster/KMS implementation |
| Account adapter              | Safe/EntryPoint deployment, ERC-1271, ERC-4337, optional ERC-7579        | Raw provider calls outside its ports                          |
| Identity/credential adapters | DID control, OpenID4VCI/VP, SD-JWT VC, status/trust                      | Credential storage or chain infrastructure                    |
| Applications                 | Wallet UX, admin UX, use-case examples                                   | Private package internals and provider SDKs                   |

### Control and custody model

| Authenticator   | Authority                                   | Default scope                                      | Step-up requirement                                              |
| --------------- | ------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| Passkey         | Safe owner/recovery controller              | Full account authority according to Safe threshold | New credential, recovery, owner/module rotation and export       |
| Recovery factor | Explicit recovery owner                     | Recovery and owner rotation only                   | Independent recovery ceremony and policy checks                  |
| Email OTP       | Principal authentication                    | Revocable operational signer/session               | Always for sensitive operations; email alone is not self-custody |
| Social OIDC     | `issuer + subject` principal authentication | Revocable operational signer/session               | Always for sensitive operations; account linking is explicit     |
| External signer | User-selected owner or delegated signer     | Exact configured policy                            | Policy and Safe threshold rules                                  |

Email-only onboarding is operationally custodial until a user creates or
exports a recovery factor. Product copy, API responses, and admin UX must say
so plainly. The service must not call possession of an email account
cryptographic self-custody.

Operational signers are constrained by an explicit policy containing at least
chain ID, target contracts, function selectors, assets, amount limits, nonce,
TTL, rate limit, and revocation state. A vendor cannot silently broaden that
policy or make itself the sole owner. Owner rotation, module installation,
policy replacement, export, and asset migration require passkey or recovery
step-up.

### Provider-neutral ports

Every external dependency is represented by a narrow port and injected into an
adapter. The core/domain and local test suites must run with deterministic
in-memory fixtures.

| Port                     | Examples of replaceable adapters                      | Trust rule                                               |
| ------------------------ | ----------------------------------------------------- | -------------------------------------------------------- |
| `AuthProviderPort`       | WebAuthn, generic SMTP OTP, generic OIDC              | Returns a verified principal, never an owner decision    |
| `SignerPort`             | Safe signer, local test signer, HSM/KMS-backed signer | Cannot bypass policy or Safe threshold                   |
| `AccountPort`            | Safe Protocol Kit, future ERC-1271-compatible account | Chain ID, deployment and code hash are verified          |
| `RpcPort`                | viem/http, local Anvil, Base Sepolia, Scroll Sepolia  | No hosted RPC is required by core tests                  |
| `BundlerPort`            | ERC-4337 bundler implementations                      | UserOperation is simulated and chain-bound               |
| `PaymasterPort`          | Test paymaster, user-paid gas, future provider        | Sponsorship is optional and policy-scoped                |
| `StorePort`              | In-memory store, PostgreSQL                           | Tenant isolation and atomic idempotency are mandatory    |
| `VaultPort`              | Browser encrypted vault, recovery backup              | Service never receives plaintext VC or DEK               |
| `CredentialExchangePort` | OpenID4VCI/VP adapters, future formats                | Format/version is pinned and replaceable                 |
| `DidPort`                | Local `did:pkh`, resolver/control adapters            | Resolution is optional; no universal resolver dependency |
| `StatusPort`             | Local status fixture, issuer/status adapter           | Status failure is fail-closed for verification           |
| `AuditPort`              | Redacted append-only store, test collector            | Secrets, PII, VC, OTP and tokens are rejected            |

Adapters may use third-party packages only behind these ports. Version pins,
license notices, deployment addresses, and code hashes belong in the adapter
record and must be reviewed before a testnet lane.

### Data flow and portability

1. The SDK authenticates a principal through an injected provider and obtains a
   short-lived session; authentication does not choose account ownership.
2. The service resolves an opaque tenant-scoped wallet locator and loads only
   metadata. The locator must not contain email, social subject, DID, or a
   user-controlled identifier.
3. A transaction intent is policy-checked, simulated, authorized by the
   allowed signer, and sent through the injected account/RPC/bundler ports.
4. Credential exchange happens in the wallet and encrypted vault. A verifier
   receives only an approved disclosure or minimal predicate result.
5. An on-chain attestation, when enabled, contains a commitment/pseudonym,
   policy, audience, nonce and expiry—not a VC, DID document, or PII.
6. Vendor rotation either rotates the operational signer/module while
   preserving Safe/DID/assets or exports a signed, versioned, encrypted bundle
   for import elsewhere. Asset movement always requires explicit user control.

### Build versus adapter matrix

The canonical dependency and license matrix is maintained in
[`working/maps/WALLET-PLATFORM-ADAPTER-MATRIX.md`](../../working/maps/WALLET-PLATFORM-ADAPTER-MATRIX.md).
The project builds domain schemas, policies, lifecycle orchestration, storage
ports, redaction, and tests. It adapts Safe/EntryPoint, WebAuthn, SMTP/OIDC,
PostgreSQL, RPC/bundler/paymaster, KMS, OpenID, and credential formats. No
cryptographic primitive or smart-account base is implemented from scratch.

## Upstream risks and blockers

- Safe deployment/module versions, EntryPoint addresses, and runtime code
  hashes must be reverified for each chain; SSW-015's local harness is not a
  deployment or audit.
- ERC-7579 and SD-JWT VC remain version-pinned adapters while their upstream
  profiles are not final; an upgrade requires fixtures and a review note.
- WebAuthn PRF is optional. Recovery-passphrase and non-PRF behavior must
  remain first-class and independently tested.
- OIDC issuer/audience/JWKS configuration is tenant security state; a
  misconfigured provider can cause account-linking or token-substitution risk.
- SMTP, RPC, bundler, paymaster, KMS, DID resolver, status, and trust-registry
  outages must fail closed or degrade to a clearly bounded local state.
- No independent security/privacy audit has occurred; the SSW-026 packet is
  evidence for review, not approval.

## Consequences

The public SDK can offer familiar smart-wallet methods without locking the
consumer to Crossmint, Privy, a particular SMTP provider, OIDC issuer, RPC,
bundler, paymaster, database, or KMS. Self-hosting is possible with local
adapters and a PostgreSQL metadata store. The cost is explicit configuration,
adapter conformance tests, key/recovery UX, and a larger integration surface.

The first supported network remains Base Sepolia; Scroll Sepolia is a later
portability/security lane. Local Anvil and synthetic identities/assets are the
only default validation environment.

## Evidence and acceptance mapping

| Acceptance criterion                                  | Evidence                                                                 | Result |
| ----------------------------------------------------- | ------------------------------------------------------------------------ | ------ |
| User-controlled Safe and revocable operational signer | Control/custody table, policy rules, `AccountPort`/`SignerPort` boundary | PASS   |
| Email limitations and sensitive-operation step-up     | Email-only disclosure and step-up requirements; threat model             | PASS   |
| Replaceable provider dependencies                     | Port table and adapter matrix; SSW-003/015 version and license baseline  | PASS   |

This ADR is an architecture decision, not a claim that the future platform
tasks are implemented or that the system is production-ready.

## Official references

- [Safe Protocol Kit](https://github.com/safe-global/safe-core-sdk) (MIT; the
  selected account adapter remains version-pinned and replaceable).
- [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) and
  [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) account boundaries.
- [W3C DID Core](https://www.w3.org/TR/did-core/) and
  [W3C VC Data Model](https://www.w3.org/TR/vc-data-model-2.0/).
- [WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/), with PRF treated as
  optional capability.
- [OpenID4VCI](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html)
  and [OpenID4VP](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html).
