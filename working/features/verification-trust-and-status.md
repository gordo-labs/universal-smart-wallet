# Verification, trust, and status

## What and why

The verifier turns a presentation into a typed result only after cryptographic,
protocol, status, trust, replay, holder-binding, and disclosure checks pass.

## Owner surfaces

- `packages/credential-domain`
- `packages/presentation-policy`
- `packages/openid4vc`
- `apps/verifier-demo`

## Verification order

1. Parse with size and time bounds.
2. Validate signed request/response structure and algorithm policy.
3. Validate issuer key and credential signature.
4. Validate type/schema, validity period, and status.
5. Validate audience, state/nonce, and one-time use.
6. Validate holder binding.
7. Evaluate the accepted policy and exact disclosures.
8. Return a short-lived, typed result or a stable error code.

## Constraints

Trust registries define governance and acceptable issuers; they are not merely
lists of addresses. Remote metadata and status retrieval must resist SSRF,
oversized responses, stale caches, and outage ambiguity.

## Tasks

`SSW-004`, `SSW-005`, `SSW-010`, `SSW-013`, `SSW-020`, `SSW-022`, `SSW-024`.
