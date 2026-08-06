# Institutional identity developer docs

This is the public builder reference for the institutional identity surfaces
implemented in `@ssw/identity-sdk` and `@ssw/credential-scanner`. The SDK is a
format-neutral transport and policy boundary: it does not implement a wallet,
issuer key custody, camera access, cryptographic primitives, or a verifier's
legal decision.

Operators should continue with the [identity operator handoff](operator-handoff.md)
after selecting an SDK surface. It maps each journey to local evidence,
sector authority boundaries, and the claims audit.

## Choose a surface

| Integrator                      | Start here                                         | Executable evidence                                                                               |
| ------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Shared browser/server transport | [SDK reference](sdk-reference.md#shared-transport) | [`identity-sdk/test/index.test.mjs`](../../packages/identity-sdk/test/index.test.mjs)             |
| Institutional issuer            | [SDK reference](sdk-reference.md#issuer-client)    | [`identity-sdk/test/issuer.test.mjs`](../../packages/identity-sdk/test/issuer.test.mjs)           |
| Wallet holder                   | [SDK reference](sdk-reference.md#holder-client)    | [`identity-sdk/test/holder.test.mjs`](../../packages/identity-sdk/test/holder.test.mjs)           |
| Verifier backend                | [SDK reference](sdk-reference.md#verifier-client)  | [`identity-sdk/test/verifier.test.mjs`](../../packages/identity-sdk/test/verifier.test.mjs)       |
| QR/deep-link integration        | [SDK reference](sdk-reference.md#scanner-client)   | [`identity-sdk/test/scanner.test.mjs`](../../packages/identity-sdk/test/scanner.test.mjs)         |
| Pure parser or offline verifier | [Protocol and formats](protocols-formats.md)       | [`credential-scanner/test/index.test.mjs`](../../packages/credential-scanner/test/index.test.mjs) |
| Operator / sector handoff      | [Operator handoff](operator-handoff.md)            | [`tests/docs/identity-handoff.test.mjs`](../../tests/docs/identity-handoff.test.mjs)             |

## Install only the needed boundary

The repository is currently a private workspace while the alpha is being
validated. Package publication is deliberately out of scope for SSW-064. Use
workspace imports in examples:

```ts
import { createBrowserIdentityClient } from '@ssw/identity-sdk';
import { createServerIssuerClient } from '@ssw/identity-sdk/issuer/server';
import { createCredentialScannerClient } from '@ssw/identity-sdk/scanner';
```

The browser entrypoint never exports the server API-key factory. Server code
must keep API keys and bearer tokens in process memory and must not log them.

## Version and support policy

- Identity SDK contract types are schema version `1` and are generated from
  the issuer and verifier OpenAPI contracts in `apps/issuer-service` and
  `apps/verifier-service`.
- The supported scanner schemes are `openid-credential-offer:`, `openid4vp:`
  and `ssw-offline://v1/`.
- SD-JWT VC, ISO mdoc and W3C VC Data Integrity are replaceable format
  adapters. This documentation does not claim complete ecosystem
  interoperability or certification.
- OpenID4VCI/OpenID4VP behavior is limited to the implemented endpoints and
  bounded parser. Remote URIs require an explicit allow-list; the SDK never
  navigates to or fetches a scanned URI.
- Offline verification returns `indeterminate` for stale or unknown trust
  state. It is not a substitute for an online status service or a legal
  identity decision.

## Local validation

Run the same checks used by the linked examples from the repository root:

```bash
pnpm --filter @ssw/identity-sdk test
pnpm --filter @ssw/credential-scanner test
pnpm --filter @ssw/docs build
```

The tests use synthetic fixtures and injected `fetch`/vault/signature ports;
they do not require a hosted issuer, verifier, bundler, paymaster or RPC.
Anvil and Base Sepolia remain the only allowed local/testnet environments for
integration work. No mainnet, production, audit or EUDI certification claim
is made here.
