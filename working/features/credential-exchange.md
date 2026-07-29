# Credential exchange

## What and why

The wallet receives a synthetic SD-JWT VC through OpenID4VCI 1.0 and presents
the minimum approved claims through OpenID4VP 1.0 with DCQL.

SSW-004 provides versioned runtime schemas and a narrow, fail-closed DCQL
mapping for `dc+sd-jwt`. The MVP age policy requests only the issuer-signed
`is_over_18: true` claim, never a hidden birthdate predicate.

## Owner surfaces

- `apps/issuer-demo`
- `apps/wallet-web`
- `apps/verifier-demo`
- `packages/openid4vc`
- `packages/sd-jwt-adapter`
- `packages/presentation-policy`

## User behavior

The holder sees the issuer, credential type, requested verifier, purpose,
claims, expiry, and exact disclosure before accepting. The MVP age credential
contains `is_over_18: true`; it does not disclose a birthdate or claim a hidden
predicate proof.

## Constraints

- Pin the SD-JWT VC draft behavior.
- Baseline: [`ADR SSW-003`](../../docs/decisions/SSW-003-standards-dependency-baseline.md)
  pins SD-JWT VC draft 16 (`dc+sd-jwt`) and OpenID4VC 1.0/VP 1.0 errata URLs.
- Use DCQL rather than legacy Presentation Exchange as the core 1.0 path.
- Validate issuer signature/key discovery, type, expiry, status, audience,
  state/nonce, holder binding, and disclosure constraints.
- No protocol test depends on a hosted issuer or verifier.

SSW-008 provides the pinned draft-16 `dc+sd-jwt` issue/present/verify
boundary. It uses synthetic `AgeCredential` fixtures, issuer-signed
`is_over_18: true`, bounded disclosures, and holder key binding. JOSE and
SD-JWT decoding remain delegated to maintained pinned dependencies.

SSW-009 adds the bounded OpenID4VCI 1.0 pre-authorized-code client. Final
metadata and offer names are parsed, deterministic HTTP fixtures enforce
origin/SSRF/size/timeout policy, and verification precedes vault insertion.

SSW-011 adds a deterministic synthetic issuer route harness. It serves issuer
metadata, offer, token, credential, status, and public-key documents and has
expired, reused, invalid-code, and revoked fixtures. Keys and credentials are
test-only labels; no identity proofing or production key lifecycle is implied.

SSW-010 adds the bounded same-device OpenID4VP `vp_token`/`direct_post` path.
Authorization requests require state, nonce, audience, response URI, and a
trusted verifier hook; request URI/signed-request and transaction-data hooks
fail closed. Direct-post state is consumed before verification and disclosures
must exactly match the holder-approved set.

## Tasks

`SSW-003`, `SSW-004`, `SSW-005`, `SSW-008`–`SSW-014`.
