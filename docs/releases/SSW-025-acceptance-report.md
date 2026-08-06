# SSW-025 acceptance report

## Scope

The release candidate is a local, synthetic vertical slice plus an explicitly
opt-in Base Sepolia smoke deployment. It does not include mainnet, real
credentials, valuable assets, or a production SLA. The exact manifest is
[`SSW-025-deployment-manifest.json`](SSW-025-deployment-manifest.json); the
support boundary is in [`SSW-025-support-matrix.md`](SSW-025-support-matrix.md).

## Gate results

| Criterion                                                     | Command/evidence                                                                 | Result                                                            |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Local flow without external configuration                     | `pnpm verify:rc` → build, `pnpm e2e:local`, release scenarios, security, Foundry | **PASS**                                                          |
| Recovery, revoked status, provider outage, attestation replay | `e2e-local`, `tests/e2e/release-candidate.test.mjs`, Foundry replay/expiry tests | **PASS**                                                          |
| SBOM, license, secret, dependency lock, contract hashes       | `node scripts/rc-evidence.mjs`                                                   | **PASS** (75 packages; allowed SPDX licenses only)                |
| Opt-in Base Sepolia matrix                                   | `SSW_RC_TESTNET=1 pnpm verify:rc` with pinned deployment values                  | **PASS** (chain 84532; runtime hashes pinned below)              |

The deployer is read from `EVM_DEV_WALLET` in the operator environment file
`/Users/sergiogordo/clawd/.env`. The file is intentionally outside the project
and must never be committed, logged, or copied into CI. Only the derived public
address and deployment evidence are recorded here.

The Base Sepolia smoke deployment is a test-only fixture; it is not a release
approval or a production Safe account. Provider timeout/configuration failures
remain external outage or missing configuration, while hash/chain/assertion
failures are product/deployment defects.

## Reproduction

```bash
pnpm install --frozen-lockfile
pnpm verify:rc
# Base Sepolia (84532), with the pinned values from the deployment manifest:
SSW_RC_NETWORK=base-sepolia SSW_RC_CHAIN_ID=84532 SSW_RC_TESTNET=1 \
  SSW_RC_RPC_URL=https://sepolia.base.org pnpm verify:rc
```

`SSW_RC_NETWORK=anvil` or chain `31337` is rejected by the opt-in script as
`LOCAL_NETWORK_NOT_TESTNET`; a reproducible Anvil matrix therefore cannot be
used to claim the alpha-testnet criterion.

All fixtures use synthetic values. Logs and generated artifacts are scanned for
private keys, JWTs, birth dates, recovery factors, and undisclosed claims.

The adversarial JOSE mutation test changes a non-padding base64url character so
that the negative assertion remains deterministic across generated signatures.
The license gate includes the permissive transitive build licenses reported by
the current Next.js/sharp toolchain (`0BSD`, `CC-BY-4.0`, and
`LGPL-3.0-or-later`) for manual dependency review.
