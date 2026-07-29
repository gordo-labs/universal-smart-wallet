# SSW-025 acceptance report

## Scope

The release candidate is a local, synthetic vertical slice. It does not
include mainnet, real credentials, valuable assets, production SLA, or a
cryptographic/testnet deployment. The exact local manifest is
[`SSW-025-deployment-manifest.json`](SSW-025-deployment-manifest.json); the
support boundary is in [`SSW-025-support-matrix.md`](SSW-025-support-matrix.md).

## Gate results

| Criterion                                                     | Command/evidence                                                                 | Result                                                            |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Local flow without external configuration                     | `pnpm verify:rc` → build, `pnpm e2e:local`, release scenarios, security, Foundry | **PASS**                                                          |
| Recovery, revoked status, provider outage, attestation replay | `e2e-local`, `tests/e2e/release-candidate.test.mjs`, Foundry replay/expiry tests | **PASS**                                                          |
| SBOM, license, secret, dependency lock, contract hashes       | `node scripts/rc-evidence.mjs`                                                   | **PASS** (54 packages; allowed SPDX licenses only)                |
| Opt-in testnet matrix                                         | `SSW_RC_TESTNET=1 pnpm verify:rc`                                                | **NOT REQUESTED** in the local run; RC is not alpha-testnet green |

`verify:rc` exits successfully for a local run only with the explicit status
`LOCAL_PASS_TESTNET_NOT_REQUESTED`. That status is intentionally not a release
approval. A configured testnet run is required before promoting to
`alpha-testnet`; provider timeout/configuration failures are classified as
external outage or missing configuration, while hash/chain/assertion failures
are product/deployment defects.

## Reproduction

```bash
pnpm install --frozen-lockfile
pnpm verify:rc
# Optional, only with a disposable testnet and pinned code hashes:
SSW_RC_NETWORK=sepolia SSW_RC_TESTNET=1 pnpm verify:rc
```

`SSW_RC_NETWORK=anvil` or chain `31337` is rejected by the opt-in script as
`LOCAL_NETWORK_NOT_TESTNET`; a reproducible Anvil matrix therefore cannot be
used to claim the alpha-testnet criterion.

All fixtures use synthetic values. Logs and generated artifacts are scanned for
private keys, JWTs, birth dates, recovery factors, and undisclosed claims.
