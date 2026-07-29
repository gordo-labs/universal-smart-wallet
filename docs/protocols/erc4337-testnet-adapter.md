# ERC-4337 testnet adapter (SSW-017)

The account adapter exposes provider-neutral `BundlerPort` and optional
`PaymasterPort` interfaces. `submitUserOperation` performs simulation,
optional sponsorship, exactly one submission, and receipt polling. It accepts
only an explicitly configured chain, account, EntryPoint 0.8.0 address, and
runtime account code hash; there is no network or provider fallback.

## Configuration

Copy `.env.example` and set `SSW_4337_ENABLED=1` only for a disposable EVM
testnet. The required values are chain ID, RPC URL, bundler URL, EntryPoint,
account, and account code hash. The canonical EntryPoint is
`0x4337084d9e255ff0702461cf8895ce9e3b5ff108`; verify the deployment manifest
and runtime code hash independently before use. Never put API keys, private
keys, passkey material, or signed payloads in logs or committed files.

Run the dependency-free gate with:

```sh
node contracts/script/erc4337-testnet-smoke.mjs
```

Without explicit configuration it exits successfully with `SKIP`, preserving
local tests. A simulation error or paymaster denial is surfaced as an
actionable typed error. Transport failure after submission is not retried, so
an already-included operation cannot be duplicated; receipt identity includes
chain, EntryPoint, sender, and transaction hash.
