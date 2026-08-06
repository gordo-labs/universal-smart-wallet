# EUDI / HAIP readiness evidence (SSW-078)

This is a version-pinned engineering inventory for the local synthetic wallet
slice. It records tested behavior, blocked implementation work, and external
evidence that this repository cannot produce. It is not a conformance result,
legal opinion, trust-service assessment, or certification. No certification
claim is emitted. No PID, EAA, QEAA,
qualified-provider, or production identity status is inferred from a label in
the code.

## Pinned profile baseline

| Profile                                   | Pin used by this report                                                   | Source/boundary                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| EUDI Architecture and Reference Framework | `ARF-1.4.0`                                                               | Historical repository baseline; select and lock the latest tagged ARF release before an external run. |
| OpenID4VCI                                | `OpenID4VCI-1.0-final+errata:openid-4-verifiable-credential-issuance-1_0` | Final protocol boundary; bounded local pre-authorized-code flow.                                      |
| OpenID4VP                                 | `OpenID4VP-1.0-final+errata:openid-4-verifiable-presentations-1_0+DCQL`   | Final protocol boundary; bounded local same-device/DCQL flow.                                         |
| HAIP                                      | `HAIP-1.0-final`                                                          | OpenID4VC high-assurance interoperability profile; external profile runs remain required.             |
| SD-JWT                                    | `RFC-9901`                                                                | JOSE/SD-JWT primitive boundary delegated to pinned libraries.                                         |
| SD-JWT VC                                 | `draft-ietf-oauth-sd-jwt-vc-16;media=dc+sd-jwt;expires=2026-10-26`        | Replaceable draft adapter; synthetic vectors only.                                                    |
| ISO mdoc                                  | `ISO/IEC-18013-5:2021;ISO/IEC-18013-7:2024`                               | Format and transport reference only; no end-to-end mdoc implementation is asserted.                   |

The exact pins are duplicated in
[`tests/conformance/eudi-haip-readiness.test.mjs`](../../tests/conformance/eudi-haip-readiness.test.mjs)
and the test fails if this report drifts from the machine-readable inventory.

## Conformance/readiness matrix

Status vocabulary is deliberately closed:

- `tested`: a local test or implementation artifact provides the stated evidence;
- `blocked`: a bounded local slice exists, but a required profile capability is not implemented or not covered;
- `external`: evidence depends on an authority, deployment, device, trust list, or interoperability run outside this repository.

| ID                    | Profile/version                                                                          | Requirement boundary                                                              | Status     | Evidence or blocker                                                               |
| --------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------- |
| ARF-ARCH-001          | EUDI ARF `ARF-1.4.0`                                                                     | Issuer–holder–verifier roles and assurance labels are separated.                  | `tested`   | SSW-049 architecture and SSW-063 deterministic journey.                           |
| ARF-PRIV-001          | EUDI ARF `ARF-1.4.0`                                                                     | Minimum disclosure and redacted receipts.                                         | `tested`   | SSW-077 privacy/redaction tests.                                                  |
| ARF-TRUST-001         | EUDI ARF `ARF-1.4.0`                                                                     | Member-State trust lists, federation metadata, and authority onboarding.          | `external` | No local authority or federation fixture.                                         |
| ARF-ASSURANCE-001     | EUDI ARF `ARF-1.4.0`                                                                     | PID/EAA/QEAA identity proofing, wallet attestation, and relying-party governance. | `external` | Requires external policy, legal, and operational evidence.                        |
| ARF-CONFORMANCE-001   | EUDI ARF `ARF-1.4.0`                                                                     | ARF test vectors and target tagged release.                                       | `external` | External conformance service and selected ARF release are not part of unit tests. |
| VCI-CORE-001          | OpenID4VCI `1.0-final`                                                                   | Metadata, offer, token, credential, and issuer service bounded flow.              | `tested`   | SSW-009/054 tests with injected HTTP and synthetic credentials.                   |
| VCI-HAIP-001          | `OpenID4VCI-1.0-final+errata:openid-4-verifiable-credential-issuance-1_0;HAIP-1.0-final` | Full HAIP issuance profile and option set.                                        | `blocked`  | Only the bounded pre-authorized-code slice is implemented.                        |
| VP-CORE-001           | OpenID4VP `1.0-final` + DCQL                                                             | Request, nonce/state, direct-post, holder binding, and minimal receipt.           | `tested`   | SSW-010/056 tests.                                                                |
| VP-HAIP-001           | `OpenID4VP-1.0-final+errata:openid-4-verifiable-presentations-1_0+DCQL;HAIP-1.0-final`   | HAIP wallet/verifier profile, signed requests, transaction data, and vectors.     | `blocked`  | Those profile paths are not fully exercised locally.                              |
| HAIP-TRUST-001        | HAIP `1.0-final`                                                                         | High-assurance issuer trust, wallet attestation, device security, and governance. | `external` | Requires external issuers, devices, trust, and relying parties.                   |
| SDJWT-CORE-001        | RFC 9901                                                                                 | Signature, disclosure, holder binding, audience, nonce, expiry, and bounds.       | `tested`   | Pinned JOSE/SD-JWT adapter tests.                                                 |
| SDJWTVC-PROFILE-001   | SD-JWT VC draft 16 `dc+sd-jwt`                                                           | Pinned media type and profile parsing; legacy media type rejected.                | `tested`   | SSW-008 positive/negative adapter vectors.                                        |
| SDJWTVC-ECOSYSTEM-001 | SD-JWT VC draft 16                                                                       | Interoperability with external issuer/verifier ecosystems.                        | `blocked`  | Local values are synthetic and the draft adapter is replaceable.                  |
| MDOC-FORMAT-001       | ISO/IEC 18013-5:2021                                                                     | mdoc format, cryptographic verification, and reader interoperability.             | `blocked`  | Domain adapter boundary exists; end-to-end implementation/vectors do not.         |
| MDOC-DEVICE-001       | ISO/IEC 18013-5:2021;18013-7:2024                                                        | Device engagement, session encryption, reader/device authentication, namespaces.  | `blocked`  | No complete native mdoc lifecycle is included.                                    |
| MDOC-HAIP-001         | `ISO/IEC-18013-5:2021;ISO/IEC-18013-7:2024;HAIP-1.0-final`                               | Device certificates, secure element, and cross-implementation runs.               | `external` | Requires external devices and interoperability environments.                      |
| CLAIMS-BOUNDARY-001   | `SSW-078-local-policy-1`                                                                 | Unsupported readiness, legal, or trust claims are not emitted.                    | `tested`   | Claims-versus-evidence test and this closed status vocabulary.                    |

Every row has either local evidence or an explicit blocker. An unknown
requirement must be added as `blocked` or `external`; it must never be inferred
from a passing unit test.

## External evidence blockers

The following gates remain outside this repository:

1. Select and hash the current tagged EUDI ARF release and run its published
   conformance vectors.
2. Run the OpenID Foundation HAIP 1.0 issuer, wallet, and verifier profiles
   against independent implementations.
3. Obtain real trust-list/federation metadata and documented authority,
   identity-proofing, device-attestation, and operational controls.
4. Complete ISO mdoc device/reader interoperability, secure-element, and
   certificate testing for the exact profile used by a deployment.
5. Obtain independent security, privacy, accessibility, and legal review for
   the intended jurisdiction and assurance level.

These are blockers or external inputs, not implied project outcomes. Fixtures
remain synthetic; core checks do not contact hosted issuer, verifier, resolver,
RPC, bundler, paymaster, trust, or certification services.

## Validation

Run the narrow SSW-078 checks from the repository root:

```text
node --test tests/conformance/eudi-haip-readiness.test.mjs
```

The test validates matrix completeness, exact version pins, status/evidence
alignment, claims boundaries, and the SSW-077 security evidence dependency.
