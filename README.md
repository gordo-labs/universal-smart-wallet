# Sovereign Smart Wallet

Open-source project for a passkey-controlled smart account and a
privacy-preserving wallet for verifiable credentials.

## Current state

This repository is a **construction-ready planning scaffold**. It contains the
feasibility review, architecture, threat boundaries, dependency graph, atomic
tasks, and copy/paste prompts for implementation agents. It does **not** yet
contain a runnable wallet.

The first validated product slice is:

```text
create a local/testnet smart account with a passkey
→ receive a synthetic SD-JWT VC through OpenID4VCI
→ encrypt it in the browser
→ approve a minimal OpenID4VP disclosure
→ verify it off-chain
→ grant access in a demo
```

No production credentials, real PII, assets of value, mainnet deployment, or
security claims are allowed before the documented review gates are complete.

## Fast path

1. [START_HERE.md](START_HERE.md)
2. [STATUS.md](STATUS.md)
3. [DOCS-MAP.md](DOCS-MAP.md)
4. [Feasibility review](working/research/feasibility-review.md)
5. [Execution plan](working/orchestration/EXECUTION-PLAN.md)
6. [Atomic backlog](working/BACKLOG.md)

## Core architectural choice

The credential flow is off-chain by default. The smart account is a control
and authorization plane, not a place to publish identity data. DID linkage and
on-chain attestations are optional adapters around the credential core, so the
local issuer-wallet-verifier flow remains deterministic and testable without an
RPC, bundler, paymaster, or hosted identity service.

## Open source

Original project code and documentation are intended to use Apache-2.0. Third
party components retain their own licenses and must pass the dependency review
in `SSW-003`.

The public repository is
[`gordo-labs/sovereign-smart-wallet`](https://github.com/gordo-labs/sovereign-smart-wallet).
Repository publication is not a product release or a production-readiness
claim.

## Source material

The two prompts supplied by the project owner are preserved under
[`working/research/source-prompts/`](working/research/source-prompts/). The
reviewed ZIP has SHA-256:

```text
db7af947ecb35e096a4095d7a626a1d5192bf1ee4422b040c3e2df6a2695756c
```
