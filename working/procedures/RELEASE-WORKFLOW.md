# Release workflow

## Repository publication

Public repository creation is `SSW-002` and can happen before a product release.
It does not make the wallet production-ready.

## Product release stages

1. `planning` — docs and task graph only.
2. `dev` — executable local components; synthetic data.
3. `alpha-local` — complete local vertical slice and adversarial tests.
4. `alpha-testnet` — opt-in testnet account and attestation flow.
5. `audit-ready` — review packet complete; still not production-approved.
6. `pilot` — only after independent review and an explicit data/network policy.

## Gate

A release must include:

- exact standards and dependency versions;
- supported browser and chain matrix;
- contract addresses plus code hashes where relevant;
- SBOM and license/secret scan;
- acceptance criteria results;
- recovery drill results;
- known limitations and unsupported claims;
- signed tag and reproducible build evidence when the build pipeline supports
  it.

No release may imply EUDI, KYC, government identity, mainnet, custody, or
production security compliance unless a later explicit program proves it.
