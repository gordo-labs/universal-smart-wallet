# ADR SSW-003 — Standards and dependency compatibility baseline

**Date:** 2026-07-29  
**Status:** Accepted for implementation spikes (not a conformance claim)  
**Owners:** architecture lane  
**Supersedes:** planning assumptions in `working/research/standards-baseline-2026-07-29.md`

## Decision

Use final OpenID4VCI and OpenID4VP 1.0 documents with DCQL, W3C VC Data
Model 2.0, RFC 9901 SD-JWT, and a replaceable `sd-jwt-vc-16` adapter. Keep all
standards-specific parsing and serialization behind package adapters. The
smart-account spike starts with Safe Protocol Kit `8.0.4` and ERC-4337
EntryPoint `0.8.0`; ERC-7579 remains an optional Draft adapter pinned to the
reviewed reference revision below. No protocol or account implementation is
included in this task.

## Exact standards and toolchain pins

| Area | Pin used for spikes | Status / boundary |
| --- | --- | --- |
| OpenID4VCI | 1.0 final, errata URL `openid-4-verifiable-credential-issuance-1_0` | Final; do not use draft field names |
| OpenID4VP | 1.0 final, errata URL `openid-4-verifiable-presentations-1_0`; DCQL | Final; presentation adapter only |
| SD-JWT | RFC 9901 | Final; use JOSE implementation below |
| SD-JWT VC | IETF `draft-ietf-oauth-sd-jwt-vc-16`, expires 2026-10-26; media type `dc+sd-jwt` | Draft; replaceable adapter, no conformance claim |
| ERC-4337 | EntryPoint `v0.8.0`, canonical address `0x4337084d9e255ff0702461cf8895ce9e3b5ff108` | Final transport; record chain/address/code hash at deployment |
| ERC-1271 | ERC interface revision at `eip-1271` | Established; account adapter boundary |
| ERC-7579 | ERC-7579 Draft, reference implementation commit `erc7579-implementation@main` reviewed 2026-07-29 | Draft; optional adapter, pin commit before coding |
| W3C VC Data Model | 2.0 Recommendation (`https://www.w3.org/TR/vc-data-model/`) | Semantic model only |
| DID Core | 1.0 Recommendation | Resolution is optional and replaceable |
| WebAuthn | Level 3 Working Draft; PRF extension capability-detected | PRF is optional; recovery must not require it |
| Node / pnpm | Node `22.x` LTS (CI minimum `>=22`), pnpm `11.5.1` | Node 26 is local-only validation, not support promise |
| TypeScript / formatter | TypeScript `5.9.2`, Prettier `3.6.2` | Exact root pins already in `package.json` |
| Web runtime | Next.js `16.2.12` (when SSW-012 starts) | Pin exact version; no framework in core packages |
| Validation | Vitest `4.1.10`, Playwright `1.62.0` | Add only in owning tasks |
| EVM client | viem `2.55.10` | Only `account-adapter`; replaceable port |
| Solidity | `solc 0.8.24`, Foundry `1.7.1` (local validation) | Foundry version recorded in CI/toolchain image before release |

## Compatibility matrix

| Selected library | Version | License | Maintenance / replacement |
| --- | --- | --- | --- |
| `@openid4vc/openid4vci` | `0.5.4` | Apache-2.0 | OWF Labs; wrap behind OpenID4VCI port; replace with in-house subset if draft/final fields diverge |
| `@openid4vc/openid4vp` | `0.5.4` | Apache-2.0 | OWF Labs; wrap behind OpenID4VP + DCQL port; fixtures required |
| `@sd-jwt/decode` | `0.19.0` | Apache-2.0 | OWF; use only for RFC 9901 primitives; SD-JWT VC profile logic remains ours |
| `jose` | `6.2.4` | MIT | Panva maintained; replace only via JOSE port and vectors |
| `viem` | `2.55.10` | MIT | Active; isolate from credential core |
| `@safe-global/protocol-kit` | `8.0.4` | MIT | Safe SDK; leading candidate, subject to SSW-015 spike and audit review |
| `@account-abstraction/contracts` | `0.8.0` | MIT (interfaces/utilities; verify EntryPoint core license) | eth-infinitism; EntryPoint address/code hash must be recorded per chain |
| `@openzeppelin/contracts` | `5.6.1` | MIT | Maintained primitives only; do not implement cryptography/account base |
| `next` | `16.2.12` | MIT | App-only; upgrade behind app boundary |
| `vitest` | `4.1.10` | MIT | Test-only; replace with compatible runner if needed |
| `playwright` | `1.62.0` | Apache-2.0 | Browser E2E; virtual authenticators are test fixtures, not platform guarantee |

Versions were checked against npm metadata on 2026-07-29. Runtime dependency
addition is intentionally deferred to the owning implementation tasks so this
planning branch does not add unused protocol or account code.

## Known conflicts and unsupported environments

- `openid4vc-ts` 0.5.4 must be configured for final 1.0 endpoints; do not mix
  draft-16 OID4VCI/OID4VP names with final documents.
- SD-JWT VC draft 16 uses `dc+sd-jwt`; historical `vc+sd-jwt` fixtures are
  negative tests only.
- EntryPoint 0.8 is not interchangeable with 0.6/0.7 UserOperation encodings.
  A chain is unsupported until its EntryPoint address and bytecode hash are
  pinned.
- ERC-7579 modules may not be installed on the core account path until the
  adapter is tested; no ERC-7579 conformance is claimed.
- PRF, IndexedDB CryptoKey persistence, and durable PWA storage vary by browser.
  Safari/iOS private browsing and browsers without PRF are unsupported for PRF
  wrapping but must use the recovery/non-PRF design.
- Hosted issuer, verifier, resolver, bundler, paymaster, and RPC services are
  excluded from unit tests; only local Anvil and explicitly configured testnets
  are allowed.

## License, vulnerability, and replacement process

Each dependency must retain its upstream license in the lockfile report. Before
merging implementation tasks run `pnpm licenses list` (or an equivalent
auditable SPDX report) and `pnpm audit --prod`; a failing or abandoned package
blocks the task. Replacement requires a port-compatible adapter, positive and
negative fixtures, a migration note, and updated version/code-hash records.

## Sources reviewed

- [OpenID4VCI 1.0 final](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-final.html)
- [OpenID4VP 1.0 final](https://openid.net/specs/openid-4-verifiable-presentations-1_0-final.html)
- [W3C VC Data Model 2.0](https://www.w3.org/TR/vc-data-model/)
- [SD-JWT VC draft 16](https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/16/)
- [EntryPoint releases and v0.8 address](https://github.com/eth-infinitism/account-abstraction)
- [ERC-7579 reference implementation](https://github.com/erc7579/erc7579-implementation)
- [WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/)

