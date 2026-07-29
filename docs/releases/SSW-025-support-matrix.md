# SSW-025 release-candidate support matrix

This matrix describes the synthetic release candidate only. It is not a
production, EUDI, KYC, custody, or mainnet support claim.

| Surface | Declared target | Evidence | Result |
| --- | --- | --- | --- |
| Runtime | Node `>=22`, pnpm `11.5.1` | `pnpm validate:toolchain` | Pass locally (Node 25.9.0) |
| Local chain | Anvil/EVM chain `31337` | `pnpm exec forge test --root contracts` | Pass |
| Local issuer/wallet/verifier | Loopback-only synthetic HTTP | `pnpm e2e:local` | Pass |
| Browser UI | Chromium, Firefox, Safari | No browser automation or WebAuthn PRF guarantee in this RC | Not claimed; manual validation required |
| Configured testnet | One explicitly configured EVM testnet with pinned chain/RPC/code hashes | `SSW_RC_TESTNET=1 pnpm verify:rc` | Not requested unless opt-in environment is present |
| Hosted issuer/verifier/resolver | Not a local dependency | outage and SSRF fixtures | Unsupported by default |
| Bundler/paymaster | ERC-4337 adapter boundary only | `SSW_RC_*` opt-in smoke | Unsupported without explicit configuration |

The testnet lane refuses missing addresses or runtime code, chain mismatches,
hash mismatches, and mainnet-like network names. Provider timeouts are reported
as an external outage and never converted to a product pass.
