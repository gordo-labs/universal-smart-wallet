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
