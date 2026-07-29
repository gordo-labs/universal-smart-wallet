# SD-JWT VC adapter boundary (SSW-008)

The wallet uses a replaceable adapter for the IETF SD-JWT VC draft 16 profile.
This implementation accepts only `dc+sd-jwt` and the synthetic
`AgeCredential` used by the local vertical slice. It delegates JOSE signing,
verification, key import, and SD-JWT decoding to the pinned `jose` 6.2.4 and
`@sd-jwt/decode` 0.19.0 libraries; no cryptographic primitive is implemented
in this repository.

## Ports

- `issue`: issuer key + holder JWK → compact SD-JWT and bounded disclosures.
- `present`: selected disclosures + holder key + audience/nonce → key-binding
  JWT presentation.
- `verify`: issuer key and optional holder key → verified typed claims.

The adapter allowlists ES256/P-256 and EdDSA/Ed25519, requires a holder `cnf`,
checks `vct`, `_sd_alg`, issuer signature, disclosure digests, key binding,
audience, nonce, and expiry. Tokens are bounded to 16 KiB, with at most eight
disclosures of 1 KiB each. Unknown profile versions, algorithms, key curves,
malformed disclosures, and digest mutations fail closed.

The MVP age claim is issuer-signed `is_over_18: true`; selective disclosure
does not prove a hidden numerical predicate. Fixtures contain synthetic values
only and are not conformance vectors or production issuer-trust material.

## Upgrade notes

`draft-ietf-oauth-sd-jwt-vc-16` is an Internet-Draft and may change. A future
profile must be introduced as a new adapter version with new fixtures and
negative vectors. Do not silently accept `vc+sd-jwt` or draft field aliases.
