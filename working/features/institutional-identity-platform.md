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
