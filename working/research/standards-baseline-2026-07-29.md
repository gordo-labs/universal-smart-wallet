# Standards baseline — 2026-07-29

This file records the re-checked baseline from `SSW-003` (2026-07-29). Exact
library, license, maintenance, and replacement notes live in
[`docs/decisions/SSW-003-standards-dependency-baseline.md`](../../docs/decisions/SSW-003-standards-dependency-baseline.md).

| Standard | Review status | Project treatment |
| --- | --- | --- |
| ERC-4337 | Final | Core smart-account transport, behind account adapter |
| ERC-1271 | Established ERC | Required contract signature verification |
| ERC-7579 | Draft; reference implementation reviewed 2026-07-29 | Optional pinned adapter after core account flow; pin implementation commit before coding |
| W3C VC Data Model 2.0 | Recommendation, 2025-05-15 | Semantic data model |
| W3C DID Core 1.0 | Recommendation | Stable baseline; do not claim DID 1.1 conformance yet |
| W3C DID Core 1.1 | Candidate Recommendation Snapshot, 2026-03-05 | Track only |
| OpenID4VCI 1.0 | Final with errata stream (`openid-4-verifiable-credential-issuance-1_0`) | Required issuance protocol |
| OpenID4VP 1.0 | Final with errata stream (`openid-4-verifiable-presentations-1_0`) | Required presentation protocol; use DCQL |
| SD-JWT | RFC 9901 | Stable selective-disclosure mechanism |
| SD-JWT VC | IETF `draft-ietf-oauth-sd-jwt-vc-16`, expires 2026-10-26; `dc+sd-jwt` | Version-pinned experimental credential adapter |
| WebAuthn Level 3 PRF | Defined, optional extension | Capability-detected vault wrapping only |

## Compatibility decisions to pin in SSW-003

- Node.js and pnpm supported versions.
- Next.js, TypeScript, runtime validation, Vitest, Playwright, and formatter.
- SD-JWT VC implementation and exact draft behavior (`dc+sd-jwt`, issuer
  metadata, key binding, status).
- OpenID4VCI and OpenID4VP implementation or the exact subset implemented
  in-house around standards-compliant lower-level libraries.
- Safe versus Kernel account base.
- EntryPoint version, Safe account/module versions, passkey signer deployment,
  Safe7579 adapter version, and testnet addresses.
- Foundry and Solidity versions.
- Browser support matrix for WebAuthn, PRF, IndexedDB CryptoKey persistence,
  PWA storage durability, and Playwright virtual authenticators.

## Rules

- Never depend on “latest” at runtime or in a deployment record.
- Store deployed contract code hashes and chain IDs with addresses.
- Keep standards-specific parsing and serialization behind packages/adapters.
- Every adapter needs positive fixtures, negative fixtures, and an upgrade note.
- Conformance language must name the exact profile and revision actually tested.

## Re-check evidence

- Official OpenID Foundation pages confirm OpenID4VCI 1.0 and OpenID4VP 1.0 are
  final; implementations use their errata URLs.
- IETF Datatracker confirms SD-JWT VC draft 16 is active and expires
  2026-10-26. The profile uses `dc+sd-jwt`; `vc+sd-jwt` is a legacy negative
  fixture.
- npm metadata on 2026-07-29 pins candidate packages in the ADR: `openid4vc`
  0.5.4, `@sd-jwt/decode` 0.19.0, `jose` 6.2.4, viem 2.55.10, Safe Protocol
  Kit 8.0.4, EntryPoint contracts 0.8.0, Next 16.2.12, Vitest 4.1.10, and
  Playwright 1.62.0.
- Local toolchain: Node v26.0.0, pnpm 11.5.1, Foundry 1.7.1, Solidity
  0.8.24. Node 22.x remains the supported CI baseline; Node 26 is local-only.
