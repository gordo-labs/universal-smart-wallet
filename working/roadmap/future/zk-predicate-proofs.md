# Future — ZK predicate proofs

## Question

Can the holder prove a predicate such as age above a threshold without relying
on an issuer-provided boolean and without disclosing the source value?

## Why it is not MVP

- It introduces circuit design, trusted setup or proving-system assumptions,
  proof/version registries, performance constraints, and new audit scope.
- Credential binding, revocation, nonce, audience, and nullifier semantics must
  be integrated with the proof.
- Browser proving performance and mobile portability need measurement.
- A signed short-lived attestation already validates the product need with a
  simpler and explicit trust model.

## Graduation criteria

`SSW-028` may recommend an implementation only after comparing maintained
proof systems, circuit auditability, proof size/cost, setup assumptions,
revocation binding, correlation, and browser performance on real fixtures.

## Chain sequencing decision (2026-07-29)

- **Initial deployment target:** Base Sepolia, preserving the current EVM,
  Safe, ERC-4337, and EIP-1271 integration surface.
- **Privacy boundary:** VC payloads remain off-chain. On-chain consumers may
  receive only a proof, commitment, nullifier, issuer/schema binding, audience,
  and expiry.
- **Second target:** Scroll Sepolia, if a ZK-rollup security/portability lane is
  required after the Base flow is stable. This should reuse the same proof
  envelope and policy semantics, with a separate deployment profile and
  verifier address.
- **Longer-term privacy target:** keep an Aztec adapter as a separate,
  privacy-native path rather than coupling the EVM core to a single chain.

This sequencing does not claim that Base provides native private state. It
keeps the application ZK-ready at the verifier and proof-envelope boundary
while deferring a privacy-native chain migration until the predicate design
and threat model justify it.
