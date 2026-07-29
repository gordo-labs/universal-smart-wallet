# OpenID4VCI 1.0 issuance boundary

`@ssw/openid4vc` implements the bounded pre-authorized-code grant from
OpenID4VCI 1.0 using final metadata names and a `dc+sd-jwt` credential proof.
The injected deterministic HTTP transport enforces HTTPS, same-origin
endpoints, no redirects, private-network host rejection, 32 KiB response
bounds, and a five-second timeout. Typed errors expose only a safe action.

`verifyCredential` is mandatory at the storage boundary: verification must
complete before an optional vault `put`. Authorization-code grants, hosted
services, identity proofing, OpenID4VP, and trust discovery are out of scope.
