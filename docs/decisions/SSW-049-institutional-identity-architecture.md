# ADR SSW-049 — Institutional identity and EUDI architecture

**Status:** Accepted  
**Target:** EUDI/eIDAS interoperability; no certification claim

## Decision

Use a three-party issuer–holder–verifier architecture with format-neutral
domain contracts and replaceable protocol/crypto adapters. OpenID4VCI 1.0 and
OpenID4VP 1.0 are the transport baseline. HAIP 1.0 is an interoperability
profile. SD-JWT VC draft-16 remains pinned; ISO mdoc and W3C VC 2.0 Data
Integrity sit behind the same adapter boundary. Legacy JWT-VC is verify-only.

## Assurance

`self_attested`, `institutional`, `government`, `qualified`, `pid`, `eaa`, and
`qeaa` are explicit policy inputs. A verifier cannot upgrade one assurance to
another. `qualified`, PID, EAA, and QEAA labels require externally supplied
trust metadata; the software cannot infer legal status.

Individuals can sign self-attested credentials with their wallet key. An
institution that validates the claim issues a new institutional credential;
it does not mutate or coerce the original into a higher assurance level.

## Trust, keys, and status

Institutional signing keys stay behind `IssuerSignerPort` and are referenced by
opaque key identifiers. Cloud KMS, HSM, Vault, and local development signers are
adapters. The primary trust/status registry is signed, off-chain, tenant and
jurisdiction scoped. Base attestations are optional evidence, not an identity
availability dependency.

## Products

- Institutional issuer and verifier services.
- Browser/server/React/React Native SDKs.
- Issuer admin console and holder identity studio.
- Camera/image/URI scanning, online QR, and signed offline QR.
- Expo mobile wallet; BLE/NFC is deferred.

## Privacy and failure semantics

The verifier requests minimum claims and stores only a redacted receipt. Full
credentials, evidence, keys, presentations, and PII never enter logs, audit,
analytics, or blockchain. Results are `verified`, `rejected`, or
`indeterminate`. Unknown/stale trust or status is never `verified`.

## EUDI boundary

The implementation follows the current EUDI ARF and implementing standards as
an engineering target. Conformance evidence and independent legal/security
review are mandatory before any certification or qualified-provider claim.

