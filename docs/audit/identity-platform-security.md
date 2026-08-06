# Institutional identity security evidence (SSW-077)

This document records the local adversarial evidence for the institutional
identity slice. It is a task-level test artifact, not an independent audit,
certification, or production readiness statement. All fixtures use synthetic
identifiers and local in-memory ports.

## Dependency and scope

The task graph records SSW-063 (deterministic institutional identity E2E gate)
as `Done`; SSW-077 adds negative coverage after that gate. The tests are
restricted to the identity boundaries that can accidentally turn an unknown,
stale, cross-tenant, over-disclosed, replayed, or backgrounded input into an
accepted result.

## Adversarial matrix

| Boundary            | Attack                                                                                                         | Expected fail-closed evidence                                                                   | Test                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
| Assurance           | Self-attested artifact presented to an institutional policy; issuer profile attempts `self_attested`           | `false`, `INSTITUTIONAL_ASSURANCE_REQUIRED`, or parser rejection; no assurance upgrade          | `identity-assurance-tenant.test.mjs` |
| Tenant/jurisdiction | Trust request or registry cache evaluated with a foreign tenant/jurisdiction                                   | `SNAPSHOT_INVALID` / cross-tenant rejection; never `verified`                                   | `identity-assurance-tenant.test.mjs` |
| Signer rotation     | Old key used after rotation; audit event inspected for payload and key material                                | `KEY_NOT_ACTIVE`; audit contains metadata only                                                  | `identity-assurance-tenant.test.mjs` |
| Trust/status        | Unknown key, retired-key boundary, revoked status, and stale snapshot                                          | `indeterminate` or `rejected`; stale state cannot become `verified`                             | `identity-assurance-tenant.test.mjs` |
| Disclosure          | Offline result and receipts are checked for credential payload exposure                                        | Result contains metadata only; no credential field is returned                                  | `identity-transport-mobile.test.mjs` |
| QR/deep link        | `javascript:`, hostile URI authority, duplicate parameters, malformed compact request, oversized payload       | Classifier rejects without navigation/fetch and does not echo attacker input                    | `identity-transport-mobile.test.mjs` |
| Offline             | Signature mutation, envelope replay, expired envelope, unknown status                                          | `SIGNATURE_INVALID`, `REPLAY_DETECTED`, or explicit `indeterminate` freshness/status result     | `identity-transport-mobile.test.mjs` |
| Mobile lifecycle    | Pending passkey cancelled on background; deceptive app link rejected; repeated wallet link and missing consent | `BACKGROUNDED`, `LINK_REJECTED`, `LINK_REPLAY`, or `CONSENT_REQUIRED`; messages remain redacted | `identity-transport-mobile.test.mjs` |
| Randomized failures | Deterministic field mutations across 64 seeds, executed twice                                                  | Every mutation remains non-verified and the seed is retained in the assertion/result            | `identity-transport-mobile.test.mjs` |

## Privacy and redaction scan

The new tests assert that error strings and audit records do not contain raw
links, credential claims, signing payloads, key references, or provider error
details. The repository scan remains the authoritative artifact check:

```text
node tests/security/redaction-scan.mjs
```

The scan covers generated application/package artifacts and rejects private-key
markers, secret-like assignments, PII field assignments, and compact JWT-like
tokens. Synthetic fixture labels are intentionally not treated as personal
data.

## Security gap report

The following items remain outside SSW-077 and must not be inferred as solved:

- cryptographic assurance of production KMS/HSM, issuer keys, and credential
  format adapters;
- hosted resolver, registry, RPC, bundler, paymaster, camera, and OS secure
  storage behavior;
- independent security/privacy review, EUDI/HAIP conformance, legal authority,
  or certification;
- device compromise, malicious native implementation, accessibility, and
  operational incident response;
- real PII, production issuers, or mainnet assets.

Outages are represented as explicit unavailable/indeterminate outcomes in the
underlying package tests. They are not counted as successful verification.

## Validation record

Required narrow validation for this task:

```text
node --test tests/security/identity-assurance-tenant.test.mjs tests/security/identity-transport-mobile.test.mjs
```

Expected result: 9 passing tests, 0 failures, 0 skipped. The root security
command additionally runs the complete local build, all security tests,
Foundry contract tests, and the repository redaction scan:

```text
pnpm test:security
```
