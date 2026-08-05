# Institutional identity platform

## Outcome

Extend the wallet platform into issuer, holder, verifier, scanner, and mobile
products for universities, governments, driving schools, enterprises, and
individuals. Institutional and self-attested credentials share transport and
wallet boundaries but never share an assurance level.

## Actor and assurance model

- Institutions create versioned templates and issue through authorized reviewer
  and non-exportable signer policies.
- Individuals may create wallet-signed credentials labeled `self_attested`.
- Verifiers apply tenant/jurisdiction policies and return `verified`, `rejected`,
  or `indeterminate`.
- PID, EAA, QEAA, institutional, and self-attested labels describe policy input;
  software never infers legal qualification.

## Protocol and format baseline

- OpenID4VCI 1.0 and OpenID4VP 1.0 for issuance and presentation.
- HAIP 1.0 as an interoperability target, not a certification claim.
- Replaceable adapters for pinned SD-JWT VC, ISO mdoc, W3C VC 2.0 Data
  Integrity, and verify-only legacy JWT-VC.
- Signed off-chain trust/status registries; Base attestations remain optional.
- EUDI ARF readiness is evidence-driven and requires external conformance and
  legal review before any certification statement.

SSW-051 implements this boundary in `@ssw/credential-formats`: every adapter
uses the same issue, inspect, verify, and present contract; exact profile and
version pins are enforced by the registry. SD-JWT VC delegates to the existing
JOSE adapter. ISO mdoc and W3C Data Integrity cryptography stay behind reviewed
library ports, while legacy JWT-VC is inspect/verify-only.

SSW-055 implements wallet-created credentials in
`@ssw/self-issued-credentials`. The signed payload fixes issuer and subject to
the holder controller and fixes assurance to `self_attested`. Wallet private
keys stay behind `HolderSignerPort`, format proofs stay behind the SSW-051
adapter boundary, and both bindings are verified before acceptance. An
institution may issue a separate credential after review; it cannot mutate or
upgrade the wallet-created credential.

## Product surfaces

- Institutional issuer and verifier REST services.
- Browser/server/React/React Native identity SDKs.
- Issuer administration modules and individual identity studio.
- Camera, image, URI, deep-link, online QR, and signed offline QR scanning.
- Expo application for iOS and Android; BLE/NFC is a later expansion.

## Privacy and security invariants

- No full credential, evidence, PII, private key, OTP, or presentation in logs,
  audit events, receipts, blockchain, or analytics.
- Institutional keys remain behind `IssuerSignerPort`; local signer fixtures are
  unmistakably development-only.
- Offline verification with stale trust/status is `indeterminate`, never
  `verified`.
- A self-attested credential cannot satisfy an institutional assurance policy.
- QR and deep-link sessions are bounded, expiring, single-use, origin checked,
  and cancelled when the app backgrounds.

## Initial sector boundaries

- Universities issue enrollment, diploma, and qualification credentials.
- Governments issue identity, residence, permit, and licence credentials.
- Driving schools issue training completion; only the competent authority may
  issue the driving licence.
- Enterprises issue employment, training, access, and representation claims.

## Remaining atomic execution

The implementation baseline now includes `SSW-060` and `SSW-066`. The remaining
work is documented, not started, as 20 atomic prompts (`SSW-058`–`SSW-079`,
excluding the completed SSW-060 and SSW-066):

- actor-specific SDKs: `SSW-065`, `SSW-067`;
- issuer, holder, and scanner product surfaces: `SSW-058`–`SSW-059`,
  `SSW-068`–`SSW-072`;
- React Native capability ports and the Expo app: `SSW-061`, `SSW-073`;
- university, government, driving-school, and enterprise packs: `SSW-062`,
  `SSW-074`–`SSW-076`;
- deterministic E2E, adversarial security, conformance, and final handoff:
  `SSW-063`, `SSW-064`, `SSW-077`–`SSW-079`.

Use the generated task document as the complete subagent prompt. Do not combine
tasks or start a task before every `dependsOn` item is Done.

## SSW-060 implementation note

`@ssw/credential-scanner` now supplies the bounded, side-effect-free parser
core. It classifies OpenID4VCI credential offers, OpenID4VP requests, and
versioned `ssw-offline://v1` envelopes; it does not fetch, navigate, start a
camera, or verify a credential. Scheme authority, parameter duplication,
duplicate JSON keys, control characters, payload size, HTTPS trust, and
base64url envelope boundaries are checked before a result is returned.
`ReplayTokenBoundary` is an explicit one-time port and the in-memory fixture
rejects unknown, expired, or already-consumed tokens. Camera/deep-link
integration and signed offline verification remain SSW-071 and SSW-072.

## SSW-057 implementation note

`@ssw/identity-sdk` now provides the shared format-neutral transport boundary
for the issuer and verifier services. Browser and server entry points are
separate: browser clients can use bearer tokens, while API-key headers are
available only from the server factory. The transport enforces absolute HTTPS
or HTTP service URLs, bounded timeout and cancellation, redacted HTTP errors,
and retries only for safe methods or explicitly idempotent mutations.

OpenAPI path constants in `src/generated.ts` are checked against both service
contracts in the package test. Actor-specific issuer, holder, verifier, UI,
and scanner methods remain intentionally deferred to `SSW-065`–`SSW-072`.

## SSW-065 implementation note

`@ssw/identity-sdk/issuer` now exposes a typed institutional issuer client for
template, issuer profile, reviewer policy, issuance-session, offer, OpenID4VCI,
credential lookup, reissue, suspend, and revoke operations. Tenant-scoped
administrative calls set `X-Tenant-Id`; server-only factories keep API-key
authorization out of browser exports. Mutation retries require an explicit
idempotency key, while authorization, token exchange, and credential issuance
are single-use and never retried because an ambiguous response must be queried
through the session/lifecycle endpoints. Authentication and service errors are
redacted by the shared transport, and signer/KMS material remains outside the
SDK boundary.

## SSW-066 implementation note

`@ssw/identity-sdk/holder` now provides a vault-backed holder client for
accepting OID4VCI offers, listing metadata-only summaries, inspecting,
self-attested creation, deletion, explicit export, and claim-specific
presentation consent. Unknown issuers require an allowlist match or an
explicit acknowledgement. The store owns encrypted export serialization;
the in-memory fixture is for synthetic tests only. Errors are stable and
redacted, and all methods accept abort signals.

`@ssw/wallet-sdk-react` adds `HolderIdentityProvider` and holder hooks. Each
operation aborts on unmount or superseding requests and clears privileged data
before a new request, so stale credentials cannot remain visible.

## SSW-058 implementation note

`apps/admin-console/src/lib/institutional-issuer-admin.ts` adds the
tenant-scoped institutional administration boundary. Template records move
through `draft`, `in_review`, `approved`, `published`, and `deprecated`; the
credential payload and version are frozen once published, and a new version is
required for edits. Reviewer, publisher, and editor scopes are explicit and
cannot cross tenant boundaries.

Signer configuration stores provider, algorithm, key version, and an opaque
provider-side key reference only. Secret-like values, PEM/private-key material,
and provider credentials are rejected before persistence. The admin reference
screen exposes lifecycle actions and redacted public signer metadata; it does
not issue credentials or implement credential lifecycle operations (those stay
in SSW-068/SSW-069).
