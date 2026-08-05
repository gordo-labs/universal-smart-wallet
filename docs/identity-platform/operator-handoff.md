# Institutional identity operator handoff (SSW-079)

This guide is the operational handoff for the synthetic local identity slice.
It describes how an issuer, holder, verifier, scanner, mobile adapter, and
sector integrator compose the existing boundaries. It is not a deployment
guide, an audit report, a legal opinion, or a certification statement.

## Read this first

- Use synthetic credentials and local in-memory ports only.
- Use local Anvil or an explicitly configured EVM testnet for wallet flows;
  identity tests do not require RPC, issuer, verifier, resolver, trust, or
  bundler services.
- Keep issuer signing behind `IssuerSignerPort` and holder keys behind the
  holder vault/signer boundary. A provider-side key reference is metadata, not
  key material.
- Treat `self_attested` as a permanent assurance label. It cannot satisfy an
  institutional policy and cannot be upgraded by an issuer or verifier.
- A verifier may return `verified`, `rejected`, or `indeterminate`. Unknown or
  stale trust/status is never silently accepted.

The canonical architecture and assurance rules are in
[`working/features/institutional-identity-platform.md`](../../working/features/institutional-identity-platform.md).
The typed API surface is in
[`docs/identity-platform/sdk-reference.md`](sdk-reference.md).

## Operator journeys

### 1. Institutional issuer

1. Register a versioned template and issuer profile with
   `@ssw/identity-sdk/issuer`.
2. Configure reviewer scopes and an opaque KMS/HSM key reference in the issuer
   administration surface. Never upload PEM, private keys, provider tokens, or
   signing payloads.
3. Create an issuance request, obtain the required reviewer approvals, and
   create a bounded OpenID4VCI offer.
4. Exchange the single-use grant and issue through the signer port. Use an
   idempotency key only for mutations that explicitly support retries.
5. Read lifecycle metadata to reissue, suspend, or revoke. Credential content
   is not returned in admin audit events.

Passing evidence:

- SDK issuer contract and retry rules:
  [`packages/identity-sdk/test/issuer.test.mjs`](../../packages/identity-sdk/test/issuer.test.mjs)
- Review, lifecycle, and tenant isolation:
  [`apps/admin-console/test/institutional-issuer-admin.test.mjs`](../../apps/admin-console/test/institutional-issuer-admin.test.mjs)
  and [`apps/admin-console/test/issuer-lifecycle.test.mjs`](../../apps/admin-console/test/issuer-lifecycle.test.mjs)
- Issuer service contract:
  [`apps/issuer-service/openapi.json`](../../apps/issuer-service/openapi.json)

### 2. Holder wallet

1. Accept an OpenID4VCI offer only after the holder acknowledges an unknown
   issuer or the issuer matches the configured allowlist.
2. Store the credential through the encrypted vault adapter; list only
   metadata summaries by default.
3. Inspect claims locally, then approve an exact claim list and verifier
   audience before presenting.
4. Create a wallet-signed credential only through the self-attested API. Label
   it `self_attested` and show the permanent limitation in the UI.
5. Delete, export, or migrate only through explicit user actions. Exports are
   encrypted and are never included in logs or analytics.

Passing evidence:

- Holder SDK and consent:
  [`packages/identity-sdk/test/holder.test.mjs`](../../packages/identity-sdk/test/holder.test.mjs)
- React cancellation and stale-state protection:
  [`packages/wallet-sdk-react/test/index.test.mjs`](../../packages/wallet-sdk-react/test/index.test.mjs)
- Self-attested domain binding:
  [`packages/self-issued-credentials/test/index.test.mjs`](../../packages/self-issued-credentials/test/index.test.mjs)

### 3. Verifier and scanner

1. Create a verifier session with a tenant/jurisdiction policy and a bounded
   expiry.
2. Generate or receive an OpenID4VP request. Parse it with the scanner before
   any navigation or network call.
3. Ask the holder for only the requested claims. Submit the presentation once
   with the expected state and nonce.
4. Render the privacy-minimal receipt. Never display or persist the complete
   credential in the verifier receipt.
5. For an offline envelope, verify the signature, issuer trust snapshot,
   status, freshness, and replay token. Return `indeterminate` when freshness,
   trust, or status cannot be established.

Passing evidence:

- Verifier session and receipt behavior:
  [`packages/identity-sdk/test/verifier.test.mjs`](../../packages/identity-sdk/test/verifier.test.mjs)
- Bounded parser and replay boundary:
  [`packages/credential-scanner/test/index.test.mjs`](../../packages/credential-scanner/test/index.test.mjs)
- Web camera/deep-link orchestration:
  [`apps/admin-console/src/scanner/scanner.test.ts`](../../apps/admin-console/src/scanner/scanner.test.ts)
  and [`apps/wallet-app/src/scanner/scanner.test.ts`](../../apps/wallet-app/src/scanner/scanner.test.ts)
- Offline verification and freshness:
  [`packages/credential-scanner/test/offline.test.mjs`](../../packages/credential-scanner/test/offline.test.mjs)

### 4. Mobile adapter

The React Native package is framework-neutral. An Expo application supplies
platform adapters for passkeys, byte-only secure storage, camera, lifecycle,
and universal/app links. Backgrounding cancels all pending sensitive work;
secure storage has no plaintext export operation. BLE/NFC, push notifications,
and app-store publication are outside this handoff.

Passing evidence:

- Native capability ports and cancellation:
  [`packages/identity-sdk-react-native/test/index.test.mjs`](../../packages/identity-sdk-react-native/test/index.test.mjs)
- Expo composition and platform configuration:
  [`apps/wallet-mobile/test/mobile-wallet.test.mjs`](../../apps/wallet-mobile/test/mobile-wallet.test.mjs)
- Mobile lifecycle and link rejection:
  [`tests/security/identity-transport-mobile.test.mjs`](../../tests/security/identity-transport-mobile.test.mjs)
- Deterministic mobile journey:
  [`tests/identity-platform/e2e.test.mjs`](../../tests/identity-platform/e2e.test.mjs)

## KMS/HSM, trust, and offline operations

The issuer service receives an `IssuerSignerPort`; it does not know how a
production KMS or HSM stores a key. Production adapters must enforce key
version, algorithm, tenant, and active/retired state in the provider. Local
fixtures are unmistakably development-only.

Trust and status are signed off-chain records. A verifier must pin the
registry issuer, tenant, jurisdiction, schema, and validity interval. A cache
that is stale, unknown, cross-tenant, or unverifiable produces
`indeterminate`; it is not a successful verification.

The signed `ssw-offline://v1/` envelope is an offline transport, not a
blockchain attestation. It has bounded size, expiry, replay protection, and a
signed trust snapshot. The verifier must report the reason code without
echoing the envelope, claims, or key material.

Related evidence:

- [`docs/audit/identity-platform-security.md`](../audit/identity-platform-security.md)
- [`docs/identity-platform/protocols-formats.md`](protocols-formats.md#offline-envelope)
- [`packages/issuer-signer/src/index.ts`](../../packages/issuer-signer/src/index.ts)
- [`packages/trust-registry/src/index.ts`](../../packages/trust-registry/src/index.ts)

## Sector composition boundaries

Sector packs are synthetic examples that exercise the same issuer, holder, and
verifier contracts. They do not grant authority to the operator.

| Sector | Supported example | Explicit boundary |
| --- | --- | --- |
| University | Enrollment, diploma, professional qualification | A registrar cannot issue a government identity or driving licence. |
| Government | Identity, residence, permit, licence-shaped fixtures | A fixture is not a legal identity, permit, or licence. Competent-authority governance is external. |
| Driving school | Training completion | Only the competent authority may issue the driving licence. |
| Enterprise | Employment, training, access, representation | Employment or access claims do not establish regulated authority or legal representation. |

Passing evidence:

- [`packages/institutional-use-cases/test/university.test.mjs`](../../packages/institutional-use-cases/test/university.test.mjs)
- [`packages/institutional-use-cases/test/government.test.mjs`](../../packages/institutional-use-cases/test/government.test.mjs)
- [`packages/institutional-use-cases/test/driving-school.test.mjs`](../../packages/institutional-use-cases/test/driving-school.test.mjs)
- [`packages/institutional-use-cases/test/enterprise.test.mjs`](../../packages/institutional-use-cases/test/enterprise.test.mjs)
- [`docs/audit/identity-platform-e2e.md`](../audit/identity-platform-e2e.md)

## EUDI, HAIP, and claims boundary

The repository pins an engineering baseline for EUDI ARF, OpenID4VCI,
OpenID4VP, HAIP, SD-JWT VC, and ISO mdoc. The readiness matrix records each
row as `tested`, `blocked`, or `external`; it does not infer compliance from a
passing unit test. The exact evidence and blockers are in
[`docs/audit/eudi-haip-readiness.md`](../audit/eudi-haip-readiness.md).

The following statements are deliberately not made:

- EUDI Wallet, PID, EAA, QEAA, qualified-provider, KYC, or government identity
  status;
- HAIP, EUDI ARF, ISO mdoc, or any other certification/conformance result;
- independent security/privacy audit or production readiness;
- custody, mainnet, or testnet release approval;
- a general ZK predicate-proof capability. The current age example is an
  issuer-signed `is_over_18: true` claim, not a hidden-date proof.

The claims-versus-evidence check is:

```bash
node --test tests/conformance/eudi-haip-readiness.test.mjs
```

## Reproducible handoff commands

Run from the repository root:

```bash
pnpm --filter @ssw/docs build
node --test tests/docs/identity-handoff.test.mjs
node --test tests/conformance/eudi-haip-readiness.test.mjs
node scripts/verify-identity-platform.mjs
node tests/security/redaction-scan.mjs
```

The first command proves the Next.js docs compile. The remaining commands
check links and claims, the deterministic identity journey, and artifact
redaction. They are local checks and do not contact hosted services.

## Handoff and next work

SSW-079 closes the documentation lane. The graph and backlog mark the task
`Done`; implementation follow-ups remain separate and must not be inferred
from this handoff. The next unblocked operational gates are SSW-025 (explicit
disposable testnet configuration) and SSW-027 (human-approved alpha release).
Neither gate is performed by this task.
