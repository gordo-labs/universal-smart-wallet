# ADR SSW-018 — Pinned ERC-7579 compatibility boundary

**Date:** 2026-07-29  
**Status:** Accepted for local compatibility tests  
**Depends on:** SSW-016, SSW-017, and ADR SSW-015

ERC-7579 is an optional Draft adapter pinned to `erc-7579-draft-2024-03` and
`ssw-erc7579-adapter-v1`; this is metadata, not a conformance claim. Safe
remains the upstream account. Modules require an explicit type, version,
address, and non-zero runtime code hash. Duplicate or changed hashes,
fallback/hook records without policy, and every delegatecall path are rejected.

The local harness invokes modules with `CALL`, has a reentrancy lock, and fails
closed on revert. Owner-only uninstall has a no-callback `recoverUninstall`
path if a module blocks normal removal. No credentials, recovery secrets, or
assets are passed to modules. Before testnet use, pin per-chain deployments and
re-run this suite against the then-current Draft migration target.
