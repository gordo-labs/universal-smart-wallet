# Wallet Platform documentation

This is the implementation handoff for the modular Wallet Platform. It is
local-first: examples use synthetic identities and Anvil (or an explicitly
configured testnet), and every provider is an injected port.

## Choose a path

| You are building | Start here | Passing example |
| --- | --- | --- |
| Browser/server integration | [TypeScript SDK](typescript-sdk.md) | [`packages/wallet-sdk/test`](../../packages/wallet-sdk/test) |
| React wallet UI | [React bindings](typescript-sdk.md#react-bindings) | [`packages/wallet-sdk-react/test`](../../packages/wallet-sdk-react/test) |
| Hosted wallet service | [REST API](rest-api.md) | [`apps/wallet-service/test`](../../apps/wallet-service/test) |
| Email onboarding | [Self-hosting](self-hosting.md#email-only-onboarding) | [`packages/auth-email/test`](../../packages/auth-email/test) |
| Consumer/admin apps | [Apps and examples](apps-and-use-cases.md) | [`apps/use-case-gallery/test`](../../apps/use-case-gallery/test) |
| Vendor migration | [Portability](self-hosting.md#migration-and-vendor-rotation) | [`packages/wallet-portability/test`](../../packages/wallet-portability/test) |

The generated OpenAPI contract is [`apps/wallet-service/openapi.json`](../../apps/wallet-service/openapi.json).
The [SSW-029 ADR](../decisions/SSW-029-wallet-platform-architecture.md) is
authoritative for custody and provider boundaries.

Implemented modules cover tenant-scoped wallets, Safe/ERC-4337 service
adapters, passkey, email OTP and social OIDC authentication, a private default
`did:pkh`, policy-gated asset actions, encrypted portability, REST,
TypeScript/React bindings, consumer/admin apps and executable examples.

Email and social login authorize a revocable operational signer. They are not
cryptographic self-custody; export, owner rotation, migration and module
installation require passkey or recovery step-up evidence.

```bash
pnpm --filter @ssw/docs build
node --test tests/docs/platform-docs.test.mjs
pnpm test:security
pnpm verify:rc
```

`verify:rc` reports `LOCAL_PASS_TESTNET_NOT_REQUESTED` without explicit
non-local configuration. This documentation is not an audit or release
approval. Future-only formats, additional DIDs, general ZK predicates,
Aztec/Noir, mobile SDKs and production KMS/MPC are listed in
[identity-platform-expansions.md](../../working/roadmap/future/identity-platform-expansions.md).
