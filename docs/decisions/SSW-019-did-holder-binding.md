# SSW-019 — DID control and holder binding decision

## Decision

Keep DID resolution and control proofs optional and behind provider-neutral
ports. The account address (and therefore its `did:pkh` or `did:ethr` form)
is stable across passkey rotation; a rotated passkey is an authorization
change, not a new public identity. `did:pkh` is the default representation for
chain-specific contract accounts because it makes chain selection explicit.
`did:ethr` remains an interoperable alternative where an existing resolver
requires it.

SD-JWT VC key binding remains the default holder proof and works with this
adapter disabled. When a relying party needs a DID control proof, the caller
must provide a resolver and a chain-correct control verifier. Resolver outages
are terminal for that DID-dependent operation and never silently downgrade to
bearer behavior.

## Binding and privacy

| Mode              | Holder identifier                               | Correlation                             | Use                                             |
| ----------------- | ----------------------------------------------- | --------------------------------------- | ----------------------------------------------- |
| SD-JWT JWK        | credential `cnf.jwk`                            | verifier can correlate repeated key use | baseline, no DID                                |
| Credential-scoped | hash(controller, credential id)                 | limited to one credential               | issuer policy permits stable credential binding |
| Pairwise          | hash(controller, credential id, verifier scope) | different per verifier                  | default when a holder identifier is required    |
| DID controller    | explicit DID/address                            | global and public                       | only when control is actually required          |

The pairwise and credential-scoped identifiers are opaque digests and do not
contain the account address. Inputs are synthetic and bounded. No DID document,
credential, disclosure, or private key is stored or logged by this adapter.

## Ports and failure behavior

`ResolverPort` and `ControlProofPort` are supplied by an integration. Core
tests use deterministic fixtures and no universal resolver, RPC, issuer, or
verifier service. A wrong controller or chain, malformed DID, rejected proof,
or resolver outage raises a typed `IdentityAdapterError`. The explicit
`disabledIdentityAdapter()` path is used by the base credential flow.

## Rejected alternatives

- A custom DID method would create unnecessary interoperability and resolver
  maintenance risk.
- Including a global DID in every presentation would create verifier/issuer
  correlation and is not needed for ordinary SD-JWT holder binding.
- Treating a resolver outage as a bearer presentation would weaken the holder
  guarantee and is therefore forbidden.
