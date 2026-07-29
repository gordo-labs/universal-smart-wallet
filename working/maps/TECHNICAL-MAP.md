# Technical map

## Planned code surfaces

| Surface | Purpose | Default dependencies |
| --- | --- | --- |
| `apps/wallet-web` | Passkey, vault, issuance intake, presentation consent | Browser APIs plus project packages |
| `apps/issuer-demo` | Synthetic OpenID4VCI issuer | Local keys and fixtures only |
| `apps/verifier-demo` | DCQL request and off-chain verification | Local challenge/replay store |
| `apps/access-demo` | Optional on-chain policy consumer | Testnet/local chain only |
| `packages/shared-types` | Versioned runtime schemas | No app imports |
| `packages/credential-domain` | Ports and credential lifecycle | No browser or chain imports |
| `packages/credential-vault` | Encryption envelope and stores | Crypto and storage adapters |
| `packages/sd-jwt-adapter` | Version-pinned credential format | Narrow third-party adapter |
| `packages/openid4vc` | Issuance and presentation protocol adapters | HTTP and JOSE ports |
| `packages/presentation-policy` | Internal policy and DCQL mapping | Runtime schemas |
| `packages/account-adapter` | Safe/Kernel boundary | Viem/account SDK only here |
| `packages/identity-adapter` | DID resolution and holder binding | Resolver behind an interface |
| `contracts` | Foundry tests and narrow custom contracts | No credential payload storage |

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
