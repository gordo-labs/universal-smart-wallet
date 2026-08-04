# Wallet Platform SDK and self-hosted service

## Outcome

Expose Sovereign Smart Wallet through modular, provider-neutral surfaces:

- a browser/server TypeScript SDK and React bindings;
- a self-hostable wallet REST service;
- a consumer wallet application;
- an administration console and executable use-case gallery;
- independent passkey, email OTP, and social OIDC authentication modules;
- in-place vendor rotation and full encrypted export/import.

## Control model

The default remains user-controllable. A passkey or explicit recovery owner
controls the Safe. Email and social authentication may authorize a scoped,
revocable operational signer, but must never become an irremovable vendor
owner. Sensitive operations require passkey or recovery step-up.

Email-only onboarding must clearly disclose that the service is operationally
custodial until the user creates or exports a recovery factor. The service must
not present email possession as cryptographic self-custody.

## Portability

Two modes are required:

1. Rotate the vendor signer/module while preserving the Safe address, DID,
   assets, and history.
2. Export a signed, versioned, encrypted bundle for import into another service
   or creation of a new wallet, with any asset movement requiring explicit
   approval.

The stable controller DID is derived locally as
`did:pkh:eip155:<chainId>:<safe-address>`. It is not published on-chain during
wallet creation and is disclosed only when a policy requires it. Pairwise
holder identifiers remain the default for credential presentations.

## Initial platform boundary

- Base Sepolia first; Scroll Sepolia is a later portability/security lane.
- Safe, ERC-1271, ERC-4337, and version-pinned ERC-7579 adapters.
- Client-side encrypted credential vault; no VC or PII in service databases.
- PostgreSQL metadata store, generic SMTP, generic OIDC, and replaceable
  signer/KMS, bundler, paymaster, and RPC ports.
- Local validation uses synthetic identities and assets only.

## Safe service adapter boundary (SSW-032)

`@ssw/safe-service-adapter` provides the provider-neutral account service
boundary. Its ports separate Safe lifecycle/call encoding, RPC deployment
inspection, ERC-4337 bundling, paymaster sponsorship, and operation signing.
The adapter requires an explicitly pinned deployment profile before any
operation is allowed. Profiles are chain-specific (`base-sepolia` 84532 and
`scroll-sepolia` 534351); factory, singleton, and EntryPoint runtime bytecode
and code hashes are checked against the profile. Missing or zero hashes are
rejected, and a Scroll profile cannot inherit Base chain metadata.

Simulation is a mandatory prerequisite to submission. Once a UserOperation has
been sent, the adapter refuses a duplicate submission and requires receipt
inspection instead. The implementation does not implement an account,
cryptography, bundler, paymaster, or provider fallback; all are replaceable
ports with local deterministic tests.

## Architecture records

- [SSW-029 architecture and custody ADR](../../docs/decisions/SSW-029-wallet-platform-architecture.md)
- [Wallet Platform trust-boundary threat model](../../docs/threat-model/wallet-platform-trust-boundaries.md)
- [Dependency and adapter matrix](../maps/WALLET-PLATFORM-ADAPTER-MATRIX.md)

The ADR is the source of truth for control/custody, provider-neutral ports,
build-versus-adapter decisions, and unresolved upstream risks. The threat
model is the source of truth for data crossing the browser, service, policy,
account, identity-provider and verifier boundaries.

## Public capability families

- Wallet lifecycle: create, get, recover, configure, and close.
- Transactions: prepare, simulate, authorize, sponsor, submit, and inspect.
- Assets: native, ERC-20, ERC-721, and ERC-1155 transfers and mint examples.
- Identity: default private DID, pairwise holder binding, credential exchange.
- Signers: passkey, email-authorized operational signer, OIDC-authorized
  operational signer, external/recovery signer.
- Portability: rotate provider, export, inspect, validate, and import bundle.

## Non-goals for the first implementation wave

- Mainnet, valuable assets, real PII, or production identity proofing.
- Inventing a smart-account base, cryptography, MPC, KMS, bundler, or paymaster.
- Claiming that email/social login alone provides self-custody.
- Shipping every credential format or DID method in the initial SDK.
