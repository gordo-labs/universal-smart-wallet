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

## Constraints

DID is not required for the base OpenID4VC flow. Resolver outages cannot break
unrelated local credential tests. Account recovery and credential/vault
recovery are separate state machines.

## Tasks

`SSW-019`, `SSW-021`, `SSW-023`.
