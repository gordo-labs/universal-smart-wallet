# TypeScript and React SDK

The SDK is provider-neutral composition. It does not implement a smart
account, cryptographic primitive, bundler, paymaster or identity provider.

Package: [`@ssw/wallet-sdk`](../../packages/wallet-sdk/src/browser.ts).

| Capability | Public surface | Passing example |
| --- | --- | --- |
| Wallet lifecycle | create/get/recover/configure/close | [`packages/wallet-sdk/test`](../../packages/wallet-sdk/test) |
| Transactions | prepare/simulate/authorize/submit/receipt | [`packages/wallet-actions/test`](../../packages/wallet-actions/test) |
| Credentials | issue/present/verify composition | [`tests/e2e/release-candidate.test.mjs`](../../tests/e2e/release-candidate.test.mjs) |
| Identity | `createPrivateDidLifecycle`, `createHolderBinding` | [`packages/identity-adapter/test`](../../packages/identity-adapter/test) |
| Portability | export/open/import/`rotateVendor` | [`packages/wallet-portability/test`](../../packages/wallet-portability/test) |

Use an opaque `wlt_v1_...` locator in URLs and logs. Revalidate it at each
service boundary with `assertWalletLocatorTenant`.

## Asset actions

[`@ssw/wallet-actions`](../../packages/wallet-actions/src/index.ts) exposes
native and ERC-20/721/1155 transfer/mint helpers, approvals, `prepareBatch`,
`previewAction`, `simulateAction` and `simulateAndAuthorize`. Actions have
bounded addresses/amounts and a human-readable consent string. Simulation
must succeed before authorization or submission.

## React bindings

[`@ssw/wallet-sdk-react`](../../packages/wallet-sdk-react/src/index.tsx) offers
framework-neutral hooks for wallet state, auth-module selection, action
preview and lock/unlock transitions. It does not own storage or network
clients. The [consumer app](apps-and-use-cases.md) composes modules
independently.

Treat schema errors, policy denials, expired sessions and portability errors as
user-visible failures. Never blindly retry a submitted UserOperation; inspect
its receipt through the Safe service adapter.
