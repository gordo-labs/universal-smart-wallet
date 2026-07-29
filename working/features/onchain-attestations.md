# On-chain attestations

## What and why

An optional bridge converts a valid off-chain verification result into a
short-lived, consumer-scoped attestation that a demo contract can verify.

## Owner surfaces

- `packages/credential-domain`
- `packages/account-adapter`
- `contracts`
- `apps/access-demo`

## Minimal public data

- policy ID or hash;
- subject binding or unlinkable/nullifier-style identifier where feasible;
- intended chain and consumer contract;
- nonce;
- issued-at and expiry;
- attestor key/version;
- result boolean implied by a valid signature.

No credential, DID document, birthdate, name, issuer payload, or disclosed PII
is written on-chain.

## Constraints

The first implementation is a signed attestation, not an arbitrary ZK system.
It explicitly documents trust in the attestor and correlation created by the
transaction. ZK predicates remain later research.

## Tasks

`SSW-023`, then `SSW-028` for future ZK research.

## SSW-023 implementation boundary

The MVP uses an EIP-712 attestor signature over a version-1 envelope containing
only `chainId`, consumer address, policy hash, nullifier-style subject, nonce,
issued-at/expiry, attestor address, and an explicit attestor-key version. The
consumer contract rejects wrong chain/audience/policy, expiry, nonce reuse,
invalid signatures, and inactive or rotated attestors before emitting a
PII-free access event. Rotation and revocation are owner-gated and versioned.

The `@ssw/credential-domain` ports intentionally delegate hashing and signing
to the host wallet/attestor SDK; the access demo's signer is a deterministic
synthetic fixture and is not suitable for a testnet. A failed on-chain consume
does not mutate the off-chain verification result.
