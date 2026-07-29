# Identity and holder binding

## What and why

The project links account control, public identity, credential possession, and
recovery without forcing a globally reused identifier into every presentation.

## Owner surfaces

- `packages/identity-adapter`
- `packages/account-adapter`
- `packages/sd-jwt-adapter`

## Planned behavior

- Compare `did:pkh` and `did:ethr` for a smart-contract account.
- Keep the account address stable across passkey rotation.
- Use credential-scoped or pairwise holder keys where the credential format and
  issuer policy allow.
- Prove account/DID control only when a relying party actually needs it.

## Implemented boundary (SSW-019)

- `@ssw/identity-adapter` exposes `did:pkh`/`did:ethr` constructors, parser,
  resolver and control-proof ports, and typed fail-closed errors.
- Credential-scoped and verifier-pairwise holder identifiers are deterministic
  SHA-256 digests that do not expose the account address.
- `disabledIdentityAdapter()` makes the DID opt-out explicit; SD-JWT key
  binding remains sufficient for the base credential flow.
- The controller DID is derived from the stable smart-account address, so
  passkey rotation does not change public identity.

## Constraints

DID is not required for the base OpenID4VC flow. Resolver outages cannot break
unrelated local credential tests. Account recovery and credential/vault
recovery are separate state machines.

## Tasks

`SSW-019`, `SSW-021`, `SSW-023`.

SSW-021 preserves controller/account identity while rotating signer control;
vault restore is separately authenticated and does not alter DID derivation.
