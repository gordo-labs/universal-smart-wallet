# Executable example index

SSW-064 keeps examples executable by linking to the tests that import the
compiled package. Run the commands below before changing a public API; a docs
snippet is considered current only when its linked test still passes.

```bash
pnpm --filter @ssw/identity-sdk test
pnpm --filter @ssw/credential-scanner test
```

## Coverage map

| Area                  | Test file                                                                                                  | What it proves                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Shared transport      | [`packages/identity-sdk/test/index.test.mjs`](../../packages/identity-sdk/test/index.test.mjs)             | Browser/server export split, auth redaction, timeout, abort, retry and OpenAPI path lockstep   |
| Issuer                | [`packages/identity-sdk/test/issuer.test.mjs`](../../packages/identity-sdk/test/issuer.test.mjs)           | Tenant boundary, every issuer operation, idempotency and auth redaction                        |
| Holder                | [`packages/identity-sdk/test/holder.test.mjs`](../../packages/identity-sdk/test/holder.test.mjs)           | Offer acknowledgement, summaries, self-attested label, claim consent, export consent and abort |
| Verifier              | [`packages/identity-sdk/test/verifier.test.mjs`](../../packages/identity-sdk/test/verifier.test.mjs)       | Outcome preservation, terminal replay behavior, ambiguous submission and receipt polling       |
| Scanner orchestration | [`packages/identity-sdk/test/scanner.test.mjs`](../../packages/identity-sdk/test/scanner.test.mjs)         | Explicit presentation acceptance and no issuance/offline submission to verifier                |
| URI parser            | [`packages/credential-scanner/test/index.test.mjs`](../../packages/credential-scanner/test/index.test.mjs) | Bounds, duplicate/unknown parameters, phishing URIs, replay and side-effect-free fuzz inputs   |

## Contract drift rule

OpenAPI path sets are checked in `packages/identity-sdk/test/index.test.mjs`;
issuer operation/method sets are checked in
`packages/identity-sdk/test/issuer.test.mjs`. If a service contract changes,
update the generated types and their tests first, then update this reference.
Do not hand-edit a method table to hide a failing drift check.

Examples use `https://*.example` hosts, synthetic IDs and opaque fixture
values. Replace the injected fetch, signer, trust registry and vault ports in
an application; never replace them with real secrets in a test fixture.
