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
