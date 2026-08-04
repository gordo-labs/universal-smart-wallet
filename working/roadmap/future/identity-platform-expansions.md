# Future — identity and wallet platform expansions

The platform tasks SSW-029–SSW-048 build the provider-neutral SDK/service
foundation. The following capabilities remain explicit future adapters rather
than implied support.

## Credential and identity formats

- ISO/IEC 18013-5 and 18013-7 mdoc/mobile document support.
- W3C VC Data Model JSON-LD proof suites where an audited maintained adapter is
  available.
- BBS selective-disclosure credentials and AnonCreds interoperability.
- Additional DID methods and universal resolution behind `ResolverPort`.
- Digital Credentials API and native mobile wallet integrations.

## Privacy and ZK

- General predicate proofs beyond issuer-derived boolean claims.
- Aztec/Noir privacy-native adapter and private state.
- Scroll verification lane after the Base implementation is stable.
- Unlinkable revocation/status and independently reviewed nullifier designs.

## Authentication and custody

- Phone OTP, external-wallet, hardware-key, enterprise SSO/SAML, and SCIM
  provisioning adapters.
- Audited MPC/TSS or confidential-computing signer adapters.
- Mobile secure-enclave signers and native recovery ceremonies.
- Multi-region production KMS/HSM integrations and disaster recovery.

## Ecosystem and operations

- Additional EVM chains after deployment/code-hash verification.
- Non-EVM account models only through separate adapters.
- Production conformance suites, independent audits, SLAs, observability, and
  regulated identity-provider integrations.
- Native iOS, Android, React Native, Flutter, and server SDKs beyond TypeScript.

None of these items may be advertised as implemented until an atomic task adds
tests, compatibility evidence, security analysis, and documentation.
