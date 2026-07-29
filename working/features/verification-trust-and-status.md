# Verification, trust, and status

## What and why

The verifier turns a presentation into a typed result only after cryptographic,
protocol, status, trust, replay, holder-binding, and disclosure checks pass.

Shared verification results and policy objects carry schema versions and reject
unknown fields, unsupported operators/formats, oversized strings, and unbounded
arrays before later verification stages run.

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

## Replay-domain boundary (SSW-005)

`@ssw/credential-domain` owns challenge lifecycle without HTTP, issuer, or
signature-verification dependencies. Challenges use an injectable secure-random
port (32 bytes by default, 16-byte minimum), bounded 1–300 second TTLs, and a
30-second explicit clock-skew allowance. `InMemoryReplayStore.consume` marks a
challenge before returning, so synchronous reuse can succeed at most once. It
returns stable non-sensitive codes for unknown, expired, wrong-audience, reused,
and replay-store failures; storage failures fail closed.

## Tasks

`SSW-004`, `SSW-005`, `SSW-010`, `SSW-013`, `SSW-020`, `SSW-022`, `SSW-024`.

## SSW-013 implementation note

The local verifier demo now builds a strict `vp_token`/`direct_post` request,
tracks state and nonce, consumes state before validation, evaluates the exact
`is_over_18: true` disclosure, and issues a one-shot short-lived session. The
synthetic adapter deliberately returns one generic `verification_failed` code
for claim, consent, signature, status, and validity failures, avoiding hidden
claim-matching disclosure. No VP token contents are logged or persisted.
