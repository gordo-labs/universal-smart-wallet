# Feasibility review

Reviewed: 2026-07-29

## Verdict

The project is technically buildable as an open-source **synthetic-data
local/testnet MVP**. The off-chain vertical slice has high feasibility because
the core transport standards are final and maintained implementations exist.

A production identity wallet has only medium feasibility at the start of this
plan. It crosses browser key management, account abstraction, credential
interoperability, recovery, issuer trust, privacy, and smart-contract security.
Those are solvable engineering problems, but not safe to collapse into one
unreviewed build prompt.

| Outcome | Feasibility now | Meaning |
| --- | --- | --- |
| Local issuer → wallet → verifier demo | High | Can be deterministic and run without chain infrastructure |
| Passkey-controlled smart account on local chain/testnet | High | Maintained Safe paths exist; integration still needs pinned versions and tests |
| Encrypted PWA vault on one supported browser/device | High | WebCrypto and IndexedDB are sufficient with a clear key strategy |
| Portable recovery across browsers/devices | Medium | WebAuthn PRF is optional; backup and fallback UX need explicit design |
| Interoperable OpenID4VC flow | Medium-high | OpenID4VCI and OpenID4VP 1.0 are final; library conformance must be proven |
| SD-JWT VC interoperability | Medium | The credential profile is still an IETF Internet-Draft |
| Stable DID across signer rotation | Medium-high | Achievable, but the method and privacy model require a spike |
| On-chain short-lived signed attestation | Medium-high | Straightforward technically; trust and correlation trade-offs are product-critical |
| Hidden numerical age predicate without issuer-derived claim | Low for MVP | Requires a dedicated ZK design; selective disclosure alone is insufficient |
| Production custody of real identity or assets | Not approved | Requires independent audit, privacy review, recovery drills, and operational controls |

## Material corrections to the source prompts

### 1. Selective disclosure is not a predicate proof

SD-JWT selective disclosure can reveal or withhold issuer-signed claims. It
cannot prove `birthdate → age >= 18` while hiding the birthdate. The MVP must
have the issuer sign a derived boolean such as `is_over_18: true`. The current
SD-JWT VC draft itself uses derived age flags in its examples. A general hidden
comparison belongs in the later ZK research task.

### 2. SD-JWT VC is not final

The base SD-JWT mechanism is RFC 9901, but the SD-JWT VC credential profile was
still draft 16 in April 2026 and explicitly marked work in progress. The project
must pin one revision, record it in metadata, keep fixtures, and isolate it
behind an adapter.

### 3. ERC-7579 is still Draft

ERC-4337 is Final, but ERC-7579 remains Draft. Use the maintained Safe7579
adapter only after the core account flow works, pin its contracts and SDKs, and
add compatibility tests. Do not let the credential core import ERC-7579 types.

### 4. A passkey is not automatically a vault encryption key

WebAuthn normally signs challenges; it does not reveal the private key. The
Level 3 PRF extension can derive symmetric material, but WebAuthn extensions are
optional and may be ignored. The vault therefore needs:

- a versioned key-wrapping interface;
- a PRF-backed strategy when supported;
- a tested fallback for browsers/authenticators without PRF;
- encrypted export/restore with a separate recovery factor;
- an explicit answer for passkey sync, loss, and account recovery.

### 5. DID is not required for OpenID4VC

OpenID4VCI, OpenID4VP, and SD-JWT VC can operate with HTTPS issuer identifiers
and JWK-based holder binding. A single public DID reused everywhere would
increase correlation. The smart account/DID relationship must therefore be a
control and recovery feature, not a mandatory identifier transmitted to every
verifier.

### 6. On-chain verification changes the trust and privacy model

A short-lived signed attestation is feasible and much simpler than arbitrary
ZK. It means the consuming contract trusts an attestor/policy key and creates a
public usage event. The contract must receive only a policy ID, scoped subject
binding or nullifier, audience/consumer, expiry, and nonce—not the credential.

## Recommended MVP boundary

### Included

- pnpm TypeScript monorepo with strict checks;
- three minimal Next.js apps;
- synthetic `AgeCredential` using an `is_over_18` claim;
- version-pinned SD-JWT VC adapter;
- OpenID4VCI 1.0 pre-authorized-code demo flow;
- OpenID4VP 1.0 with DCQL, `state`, nonce, audience, holder binding, and
  `direct_post`;
- encrypted IndexedDB vault with a versioned envelope;
- local Anvil smart account, passkey signer, and ERC-1271;
- optional, explicitly configured testnet ERC-4337 flow;
- status/revocation, trust policy, consent UI, and deterministic E2E tests.

### Excluded from the first vertical slice

- real KYC or government credentials;
- EUDI Wallet conformance claims;
- mainnet or valuable assets;
- a custom DID method or smart-account base;
- native mobile apps;
- arbitrary ZK predicates;
- silent/background presentation;
- mandatory hosted bundler, paymaster, trust registry, or resolver.

## Recommended architecture

```text
Credential plane (default, off-chain)
issuer-demo ── OpenID4VCI ──> wallet-web ── OpenID4VP/DCQL ──> verifier-demo
                                │
                                └── encrypted IndexedDB vault

Control plane (local/testnet)
passkey ──> maintained smart account ──> ERC-1271 / recovery / optional ERC-7579
                     │
                     └── optional DID control adapter

On-chain bridge (later and narrow)
verified off-chain result ──> short-lived signed attestation ──> consumer contract
```

The planes communicate through small versioned types. Credential verification
must remain testable when every blockchain and hosted-service adapter is
disabled.

## Smart-account recommendation

Safe is the leading candidate, not a pre-decided dependency. Its current
documentation covers passkey signers, ERC-4337 modules, ERC-1271 behavior, and
the Safe7579 adapter. `SSW-015` must compare Safe and Kernel against:

- license and audit history;
- deterministic deployment and local testing;
- EntryPoint version compatibility;
- passkey signer behavior and recovery;
- module installation risk;
- hosted-provider independence;
- supported testnet deployments;
- upgrade and migration path.

The project must not implement an account base or passkey verifier from scratch.

## Critical risks and controls

| Risk | Required control |
| --- | --- |
| Vault exfiltration | AES-GCM envelope, authenticated metadata, narrow crypto interface, CSP, dependency review |
| Passkey loss | Recovery flow and encrypted backup tested as product flows |
| OpenID4VP phishing | Signed/bound request validation, verifier identity display, exact disclosure preview, no silent consent |
| Replay | 128-bit-or-greater state/nonce, TTL, atomic single use, audience binding |
| Correlation | Pairwise/credential-scoped holder keys where possible; avoid global DID in presentations |
| Compromised issuer | Explicit trust policy, key rotation handling, status checks, short cache bounds |
| Malicious module | Allowlisted pinned modules, install simulation, removal/recovery tests |
| Bundler/paymaster outage | Local tests independent; provider adapters and user-visible retry/fallback |
| Supply-chain compromise | Lockfile, provenance/license scan, dependency review, pinned contract addresses |
| False security claims | Security gates, audit-readiness packet, synthetic-only warning until reviewed |

## Go/no-go gates

1. **Foundation gate:** clean install, lint, typecheck, units, and no secrets.
2. **Credential gate:** local end-to-end flow proves minimal disclosure and
   rejects signature, status, audience, nonce, holder-binding, and policy
   failures.
3. **Control gate:** local passkey smart account survives signer rotation and
   validates ERC-1271 without changing account address.
4. **Testnet gate:** explicit configuration only; outage does not break core
   tests.
5. **Privacy gate:** disclosure and correlation review complete.
6. **Release gate:** recovery drill, adversarial tests, dependency bill of
   materials, and independent review readiness.

## Official evidence

- [ERC-4337 — Final](https://eips.ethereum.org/EIPS/eip-4337)
- [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271)
- [ERC-7579 — Draft](https://eips.ethereum.org/EIPS/eip-7579)
- [Safe passkeys](https://docs.safe.global/advanced/passkeys/passkeys-safe)
- [Safe and ERC-4337](https://docs.safe.global/advanced/erc-4337/4337-safe)
- [Safe and ERC-7579](https://docs.safe.global/advanced/erc-7579/7579-safe)
- [W3C Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model/)
- [W3C DID Core](https://www.w3.org/TR/did-core/)
- [OpenID4VCI 1.0](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html)
- [OpenID4VP 1.0 and DCQL](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html)
- [SD-JWT VC draft 16](https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/16/)
- [WebAuthn Level 3 PRF extension](https://www.w3.org/TR/webauthn-3/#prf-extension)
