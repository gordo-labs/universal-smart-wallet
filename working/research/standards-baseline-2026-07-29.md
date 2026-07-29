# Standards baseline — 2026-07-29

This file records review-time status. `SSW-003` must re-check and pin exact
revisions and compatible implementation versions before product code depends on
them.

| Standard | Review status | Project treatment |
| --- | --- | --- |
| ERC-4337 | Final | Core smart-account transport, behind account adapter |
| ERC-1271 | Established ERC | Required contract signature verification |
| ERC-7579 | Draft | Optional pinned adapter after core account flow |
| W3C VC Data Model 2.0 | Recommendation, 2025-05-15 | Semantic data model |
| W3C DID Core 1.0 | Recommendation | Stable baseline; do not claim DID 1.1 conformance yet |
| W3C DID Core 1.1 | Candidate Recommendation Snapshot, 2026-03-05 | Track only |
| OpenID4VCI 1.0 | Final with errata stream | Required issuance protocol |
| OpenID4VP 1.0 | Final with errata stream | Required presentation protocol; use DCQL |
| SD-JWT | RFC 9901 | Stable selective-disclosure mechanism |
| SD-JWT VC | IETF draft 16, expires 2026-10-26 | Version-pinned experimental credential adapter |
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
