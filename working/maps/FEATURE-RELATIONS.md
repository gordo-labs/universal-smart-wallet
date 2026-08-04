# Feature relations

```mermaid
flowchart LR
  I[OpenID4VCI issuance] --> V[Encrypted vault]
  V --> P[OpenID4VP + DCQL presentation]
  P --> T[Trust, status, replay, consent]
  A[Passkey smart account] --> D[DID/control adapter]
  D --> H[Privacy-preserving holder binding]
  H --> P
  T --> O[Short-lived on-chain attestation]
  A --> O
  R[Recovery + encrypted backup] --> V
  R --> A
  Z[Future ZK predicates] -. later .-> O
  A --> WP[Wallet Platform SDK/service]
  WP --> AUTH[Passkey / Email / OIDC adapters]
  WP --> PORT[Vendor rotation + encrypted portability]
  WP --> ADMIN[Wallet + admin applications]
```

## Boundary rules

- Credential exchange works without the smart account or DID adapters.
- Smart-account recovery must not imply that an encrypted vault is recoverable;
  both paths require explicit tests.
- Holder binding must not force reuse of one public identifier across verifiers.
- Status/trust failures are terminal verification failures, not warnings.
- On-chain attestations consume a minimal verification result, never a
  credential or disclosed PII.
