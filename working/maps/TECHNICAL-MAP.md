# Technical map

## Planned code surfaces

The executable foundation now provides TypeScript package shells for each
planned adapter/domain surface and three network-free app shells. These shells
contain no credential, browser, RPC, or smart-account logic; later tasks fill
their narrow boundaries.

| Surface                            | Purpose                                                      | Default dependencies                     |
| ---------------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| `apps/wallet-web`                  | Passkey, vault, issuance intake, presentation consent        | Browser APIs plus project packages       |
| `apps/issuer-demo`                 | Synthetic OpenID4VCI issuer                                  | Local keys and fixtures only             |
| `apps/verifier-demo`               | DCQL request and off-chain verification                      | Local challenge/replay store             |
| `apps/access-demo`                 | Optional on-chain policy consumer                            | Testnet/local chain only                 |
| `packages/shared-types`            | Versioned runtime schemas                                    | No app imports                           |
| `packages/credential-domain`       | Credential lifecycle, challenge and replay ports             | No browser or chain imports              |
| `packages/credential-vault`        | Encryption envelope and stores                               | Crypto and storage adapters              |
| `packages/account-adapter`         | Passkey account + ERC-4337 provider-neutral ports            | Explicit testnet deployment metadata     |
| `packages/sd-jwt-adapter`          | Version-pinned credential format                             | Narrow third-party adapter               |
| `packages/credential-formats`      | Pinned multiformat registry and neutral verification         | Reviewed format crypto behind ports      |
| `packages/self-issued-credentials` | Wallet-signed self-attested credentials and policy rejection | Holder signer plus format ports only     |
| `packages/openid4vc`               | Issuance and presentation protocol adapters                  | HTTP and JOSE ports                      |
| `packages/presentation-policy`     | Internal policy and DCQL mapping                             | Runtime schemas                          |
| `packages/account-adapter`         | Safe boundary with deployment/code-hash validation           | Protocol Kit/viem only behind this port  |
| `packages/identity-adapter`        | Optional DID control and pairwise holder binding             | Resolver/control proof behind interfaces |
| `contracts`                        | Foundry tests and narrow custom contracts                    | No credential payload storage            |

## Dependency direction

```text
apps
 ├── protocol/format adapters
 ├── credential-domain
 ├── credential-vault
 └── account/identity adapters

adapters ──> shared-types + narrow ports
domain   ──> shared-types
vault    ──> shared-types + crypto/storage ports
contracts (independent ABI boundary)
```

`credential-domain`, `shared-types`, and core verification tests must not import
Next.js, IndexedDB, Safe SDKs, RPC clients, or hosted service clients.

## Wallet Platform extension (SSW-029)

The platform wave adds a provider-neutral layer around the existing surfaces:

```text
SDK / wallet app / admin console
              |
      Wallet Service API
              |
 domain types + policy + audit
       /       |        \
   VaultPort  AccountPort  AuthProviderPort
      |           |             |
 client vault  Safe/4337    passkey / SMTP / OIDC
              |
       Rpc / bundler / paymaster ports
```

The user-controlled Safe remains the cryptographic control root. Email/social
providers only produce principals and scoped operational sessions. See the
[SSW-029 ADR](../../docs/decisions/SSW-029-wallet-platform-architecture.md)
and [adapter matrix](WALLET-PLATFORM-ADAPTER-MATRIX.md) for the full boundary.

SSW-004 keeps `shared-types` dependency-free and places the supported DCQL
subset in `presentation-policy`; mapping is deterministic and fails closed on
operators, formats, paths, or disclosure shapes outside that subset.

SSW-015 adds `contracts/deployments.json` as the chain/address/hash manifest and
`contracts/test/SmartAccountHarness.t.sol` as a local-only deterministic
deployment proof. No hosted provider is required.
