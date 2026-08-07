# SSW-026 — independent review packet

## Scope and maturity

The repository is `planning`/synthetic local software with an optional EVM
testnet lane. This packet makes the current evidence reproducible; it does not
claim an audit, compliance, custody, mainnet support or production readiness.

## Reproduction

From a clean clone with Node `>=22`, pnpm `11.5.1`, and Foundry installed:

```bash
pnpm install --frozen-lockfile
pnpm validate:toolchain
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e:local
pnpm test:security
pnpm verify:rc
```

`pnpm verify:rc` must report `LOCAL_PASS_TESTNET_NOT_REQUESTED` unless the
declared testnet environment and pinned code hashes are intentionally supplied.
That result is a local gate, not alpha-testnet approval.

## Evidence index

| Area | Evidence |
| --- | --- |
| Architecture/data flow | [`docs/architecture/SSW-026-data-flow.md`](../architecture/SSW-026-data-flow.md) |
| Threat controls | [`docs/threat-model/SSW-024-adversarial-hardening.md`](../threat-model/SSW-024-adversarial-hardening.md), [`docs/threat-model/SSW-022-consent-privacy-hardening.md`](../threat-model/SSW-022-consent-privacy-hardening.md) |
| RC acceptance | [`docs/releases/SSW-025-acceptance-report.md`](../releases/SSW-025-acceptance-report.md) |
| Deployment boundary | [`docs/releases/SSW-025-deployment-manifest.json`](../releases/SSW-025-deployment-manifest.json), [`contracts/README.md`](../../contracts/README.md) |
| Protocol decisions | [`docs/decisions/`](../decisions/) |
| Automated security | [`tests/security/`](../../tests/security/), `contracts/test/AdversarialFuzz.t.sol` |
| Recovery/vault | `packages/credential-vault`, `packages/account-adapter`, `contracts/test/RecoveryHarness.t.sol` |

## Asset and key lifecycle

- Credentials are synthetic fixtures, verified before vault insertion and
  encrypted at rest. No real PII or production keys belong in the repository.
- Browser unlock material is session-bound; recovery and vault restore have
  independent success conditions.
- Issuer/attestor keys in demos are deterministic fixtures only. Testnet keys,
  RPC URLs and deployment secrets must be injected at runtime and never
  committed.
- On-chain envelopes carry policy/audience/nonce/expiry/attestor metadata and
  a subject pseudonym; credential contents and DID documents are excluded.

## Open findings and reviewer checklist

- [ ] Supply a disposable testnet deployment, RPC and code hashes, then rerun
      the opt-in SSW-025 matrix.
- [ ] Obtain independent security and privacy review; no such review is
      implied by this packet.
- [ ] Replace synthetic signing/controller boundaries only after a separate
      cryptographic and browser portability review.
- [ ] Review dependency licenses, lockfile integrity, generated artifacts and
      secret/redaction scans from a clean clone.
- [ ] Confirm recovery, status outage, replay, vault tamper and consent flows
      with a reviewer who is not the implementer.

## Explicit non-claims

This packet does not claim EUDI/KYC/government identity, custody, mainnet,
formal verification, independent audit, or production security compliance.
