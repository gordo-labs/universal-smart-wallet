# Protocols and credential formats

The identity layer separates transport, protocol envelopes, credential format
adapters, trust/status and wallet custody. This lets an issuer or verifier
replace one adapter without changing holder storage or smart-account control.

## Protocol surface

| Protocol         | Implemented boundary                                                                             | What this project does not claim                                  |
| ---------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| OpenID4VCI       | Issuer metadata, offer, authorize, token and credential endpoints                                | Complete conformance to every deployment profile or certification |
| OpenID4VP        | Verifier session, direct-post response and privacy-minimal receipt                               | That a QR scan itself proves a credential                         |
| DCQL/policy      | Opaque verifier request is carried through a typed session                                       | A generic predicate/ZK engine                                     |
| Offline envelope | Signed, bounded `ssw-offline-envelope` v1 with freshness, replay and signed trust snapshot ports | Offline verification when trust/status is stale or unknown        |

OpenID4VCI and OpenID4VP are protocol adapters. Issuer and verifier services
own policy, trust, status and signing decisions. Wallets must render a named
audience, purpose and exact claims before consent.

## Credential formats

The issuer domain accepts the following format identifiers:

| Identifier  | Status in this repository                  | Boundary                                                              |
| ----------- | ------------------------------------------ | --------------------------------------------------------------------- |
| `sd-jwt-vc` | Pinned replaceable adapter                 | Draft/profile details can change; use the adapter and fixtures only   |
| `iso-mdoc`  | Typed domain option and device-key binding | No claim that all mdoc profiles, readers or certificates interoperate |
| `w3c-vc-di` | Typed domain option                        | No claim of complete Data Integrity cryptosuite support               |

The credential artifact remains opaque at transport boundaries. Format-specific
parsing/inspection is injected through `CredentialInspector` and
`@ssw/credential-formats`; the SDK does not invent signing or verification
primitives.

## Scanner URI grammar

`@ssw/credential-scanner` accepts only bounded, strict forms:

```text
openid-credential-offer:?credential_offer=<encoded-json>
openid-credential-offer:?credential_offer_uri=https%3A%2F%2Fissuer.example%2Foffer
openid4vp://?request=<compact-signed-request>
openid4vp://?request_uri=https%3A%2F%2Fverifier.example%2Frequest
ssw-offline://v1/<base64url-envelope>
```

Remote `credential_offer_uri` and `request_uri` values are accepted only when
the caller supplies an explicit allow-list callback. Duplicate parameters,
unknown parameters, fragments, userinfo, oversized payloads, unsafe schemes
and malformed compact objects fail closed. Parsing has no I/O side effects.

Useful low-level exports and passing evidence:

| Export                                        | Purpose                             | Example                                                                                                  |
| --------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `parseCredentialInput` / `parseQrInput`       | Strict parse                        | [`credential-scanner/test/index.test.mjs:20`](../../packages/credential-scanner/test/index.test.mjs#L20) |
| `classifyCredentialInput` / `classifyQrInput` | Non-throwing camera pipeline result | [`index.test.mjs:55`](../../packages/credential-scanner/test/index.test.mjs#L55)                         |
| `classifyUriScheme` / `safeUriClassifier`     | Scheme-only classification          | [`index.test.mjs:34`](../../packages/credential-scanner/test/index.test.mjs#L34)                         |
| `InMemoryReplayTokenBoundary`                 | Local one-time replay boundary      | [`index.test.mjs:69`](../../packages/credential-scanner/test/index.test.mjs#L69)                         |
| `validateReplayToken` / `consumeReplayToken`  | Explicit replay checks              | [`index.test.mjs:69`](../../packages/credential-scanner/test/index.test.mjs#L69)                         |

## Offline envelope lifecycle

The offline module is crypto-neutral. The caller supplies an
`OfflineEnvelopeSigner`, `OfflineEnvelopeVerifier`, trust/status resolver and
optional atomic replay boundary.

```text
unsigned envelope -> createOfflineEnvelope(signer)
                  -> QR transport (opaque base64url)
                  -> parseOfflineEnvelope
                  -> verifyOfflineEnvelope(verifier, registry, freshness)
                  -> verified | rejected | indeterminate
```

`verifyOfflineEnvelope` only returns `verified` after signature, freshness,
trust, schema, key authorization, status and replay checks succeed. A stale
snapshot, unknown issuer/status, missing cache or unavailable verifier returns
`indeterminate` (or a specific rejection where the evidence is negative).
`OfflineTrustStatusCache.prime` rejects bad signatures, stale snapshots and
rollback. It has no network loader by design.

The offline signed envelope is not an on-chain attestation and does not make
the credential private by itself. Keep its opaque credential and any PII out of
logs, URLs other than the bounded QR payload, chain calldata and telemetry.

## Trust, status and claims boundaries

- A credential's issuer, schema and status are evaluated by the configured
  trust/status registry; unknown is not treated as valid.
- `self_attested` is a permanent assurance label and must not be presented as
  institutional, government, PID, EAA or QEAA assurance.
- `is_over_18: true` is an issuer-signed derived claim in the MVP. It is not a
  hidden date comparison and not a general ZK predicate proof.
- Receipts contain outcome/reason/check identifiers only. They must not contain
  full VCs, disclosures, names, dates of birth, email addresses or raw tokens.
