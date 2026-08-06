# Identity SDK reference

All examples below are intentionally small and point to the passing test that
exercises the public method. Keep the test links as the executable source of
truth; do not paste private credential values into application logs.

## Shared transport

Import from `@ssw/identity-sdk` in browser code and
`@ssw/identity-sdk/server` in server code.

| Public surface                                                 | Purpose                                                             | Passing example                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `createBrowserIdentityClient(options)`                         | Bearer-token client for browser-safe code                           | [`index.test.mjs:20`](../../packages/identity-sdk/test/index.test.mjs#L20)       |
| `createServerIdentityClient(options)`                          | API-key client; API key stays server-side                           | [`index.test.mjs:103`](../../packages/identity-sdk/test/index.test.mjs#L103)     |
| `IdentityClient.request(method, path, body?, options?, mode?)` | Bounded JSON/form transport, timeout, cancellation and retry policy | [`index.test.mjs:57`](../../packages/identity-sdk/test/index.test.mjs#L57)       |
| `get(path, options?)`                                          | Idempotent GET                                                      | [`index.test.mjs:28`](../../packages/identity-sdk/test/index.test.mjs#L28)       |
| `post(path, body?, options?)`                                  | POST; retries only with an idempotency key                          | [`index.test.mjs:69`](../../packages/identity-sdk/test/index.test.mjs#L69)       |
| `postForm(path, body, options?)`                               | OpenID4VP direct-post form                                          | [`verifier.test.mjs:64`](../../packages/identity-sdk/test/verifier.test.mjs#L64) |
| `health(options?)`                                             | Read service health/version                                         | [`index.test.mjs:28`](../../packages/identity-sdk/test/index.test.mjs#L28)       |
| `issuerMetadata(tenantId, issuerId, options?)`                 | Read issuer metadata                                                | [`issuer.test.mjs:59`](../../packages/identity-sdk/test/issuer.test.mjs#L59)     |
| `IdentitySdkError`                                             | Stable redacted error code/status/request-id                        | [`index.test.mjs:46`](../../packages/identity-sdk/test/index.test.mjs#L46)       |

```ts
const client = createBrowserIdentityClient({
  baseUrl: 'https://issuer.example',
  token: 'synthetic-token',
  retry: { retries: 2, baseDelayMs: 25 },
});

const health = await client.health();
// { ok: true, version: '...' }
```

Never use `token` or an API key as a browser credential when a short-lived
session token can be issued instead. Authentication failures expose only a
stable error code/message and a safe request id.

## Issuer client

Import `InstitutionalIssuerClient` or the browser/server factories from
`@ssw/identity-sdk/issuer`. Every tenant-scoped method sends an opaque
`x-tenant-id` boundary. Issuer private keys stay behind the service's signer
port; no method accepts key material.

| Method                                                       | Endpoint / role                       | Passing example                                                                |
| ------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------ |
| `registerTemplate(tenantId, input, options?)`                | `POST /v1/templates`                  | [`issuer.test.mjs:68`](../../packages/identity-sdk/test/issuer.test.mjs#L68)   |
| `registerIssuer(tenantId, input, options?)`                  | `POST /v1/issuers`                    | [`issuer.test.mjs:69`](../../packages/identity-sdk/test/issuer.test.mjs#L69)   |
| `registerReviewerPolicy(tenantId, input, options?)`          | `POST /v1/reviewer-policies`          | [`issuer.test.mjs:78`](../../packages/identity-sdk/test/issuer.test.mjs#L78)   |
| `createIssuanceRequest(tenantId, input, options?)`           | `POST /v1/issuance-requests`          | [`issuer.test.mjs:86`](../../packages/identity-sdk/test/issuer.test.mjs#L86)   |
| `getIssuanceSession(tenantId, sessionId, options?)`          | Read lifecycle state                  | [`issuer.test.mjs:87`](../../packages/identity-sdk/test/issuer.test.mjs#L87)   |
| `reviewIssuance(tenantId, sessionId, input, options?)`       | Approve/reject with review policy     | [`issuer.test.mjs:88`](../../packages/identity-sdk/test/issuer.test.mjs#L88)   |
| `createOffer(tenantId, sessionId, input, options?)`          | Create pre-authorized/auth-code offer | [`issuer.test.mjs:91`](../../packages/identity-sdk/test/issuer.test.mjs#L91)   |
| `authorize(tenantId, input, options?)`                       | OpenID4VCI authorization-code step    | [`issuer.test.mjs:94`](../../packages/identity-sdk/test/issuer.test.mjs#L94)   |
| `exchangeToken(tenantId, input, options?)`                   | Exchange a single-use grant           | [`issuer.test.mjs:97`](../../packages/identity-sdk/test/issuer.test.mjs#L97)   |
| `issueCredential(tenantId, accessToken, input, options?)`    | Consume bearer grant and issue        | [`issuer.test.mjs:104`](../../packages/identity-sdk/test/issuer.test.mjs#L104) |
| `getCredential(tenantId, credentialId, options?)`            | Read redacted status record           | [`issuer.test.mjs:108`](../../packages/identity-sdk/test/issuer.test.mjs#L108) |
| `reissueCredential(tenantId, credentialId, input, options?)` | Start a replacement issuance          | [`issuer.test.mjs:109`](../../packages/identity-sdk/test/issuer.test.mjs#L109) |
| `suspendCredential(tenantId, credentialId, options?)`        | Temporary status transition           | [`issuer.test.mjs:110`](../../packages/identity-sdk/test/issuer.test.mjs#L110) |
| `revokeCredential(tenantId, credentialId, options?)`         | Terminal status transition            | [`issuer.test.mjs:111`](../../packages/identity-sdk/test/issuer.test.mjs#L111) |

Only explicitly idempotent administrative mutations may retry. Authorization,
token exchange and credential issuance consume single-use state and are never
automatically retried, even if a caller supplies an idempotency key. See the
[issuer OpenAPI contract](../../apps/issuer-service/openapi.json).

## Holder client

`HolderCredentialClient` takes an injected `HolderStore`, issuance transport,
proof factory and presentation port. Replace `InMemoryHolderStore` with the
encrypted wallet vault in an application.

| Method / type                                              | Behavior                                                                     | Passing example                                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `acceptOffer(input, options?)`                             | Parse offer, require issuer acknowledgement, obtain proof and store artifact | [`holder.test.mjs:38`](../../packages/identity-sdk/test/holder.test.mjs#L38)   |
| `list(options?)`                                           | Return summaries without artifact values                                     | [`holder.test.mjs:28`](../../packages/identity-sdk/test/holder.test.mjs#L28)   |
| `inspect(credentialId, options?)`                          | Inspect through the injected adapter                                         | [`holder.test.mjs:124`](../../packages/identity-sdk/test/holder.test.mjs#L124) |
| `createSelfAttested(input, options?)`                      | Create a credential permanently labelled `self_attested`                     | [`holder.test.mjs:62`](../../packages/identity-sdk/test/holder.test.mjs#L62)   |
| `delete(credentialId, options?)`                           | Delete from the configured vault                                             | [`holder.test.mjs:113`](../../packages/identity-sdk/test/holder.test.mjs#L113) |
| `export({ credentialIds?, confirmExport: true, signal? })` | Explicitly consented vault export                                            | [`holder.test.mjs:113`](../../packages/identity-sdk/test/holder.test.mjs#L113) |
| `present(request, options?)`                               | Exact claim-specific consent and trusted issuer check                        | [`holder.test.mjs:71`](../../packages/identity-sdk/test/holder.test.mjs#L71)   |
| `HolderClientError`                                        | Stable errors without credential/secret values                               | [`holder.test.mjs:124`](../../packages/identity-sdk/test/holder.test.mjs#L124) |

```ts
await holder.present({
  credentialId: 'cred-1',
  claims: ['is_over_18'],
  audience: 'https://verifier.example',
  nonce: 'synthetic-nonce',
  consent: { accepted: true, claims: ['is_over_18'] },
});
```

The claim set in `consent` must equal the requested set. This is selective
disclosure orchestration, not a general zero-knowledge predicate proof.

## Verifier client

`VerifierClient` preserves the three-outcome result model and makes direct-post
response submission terminal per client instance.

| Method                                                                 | Behavior                                                              | Passing example                                                                    |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `createSession(policyId, options?)` / `createVerificationSession`      | Create a bounded verification session                                 | [`verifier.test.mjs:41`](../../packages/identity-sdk/test/verifier.test.mjs#L41)   |
| `getSession(sessionId, options?)` / `getVerificationSession`           | Read request/session state                                            | [`verifier.test.mjs:53`](../../packages/identity-sdk/test/verifier.test.mjs#L53)   |
| `submitResponse(sessionId, response, options?)` / `submitPresentation` | Submit `state` + `vp_token` exactly once                              | [`verifier.test.mjs:57`](../../packages/identity-sdk/test/verifier.test.mjs#L57)   |
| `getReceipt(receiptId, options?)` / `getVerificationReceipt`           | Read privacy-minimal receipt                                          | [`verifier.test.mjs:106`](../../packages/identity-sdk/test/verifier.test.mjs#L106) |
| `pollReceipt(receiptId, options?)` / `pollVerificationReceipt`         | Poll without losing lookup after timeout                              | [`verifier.test.mjs:106`](../../packages/identity-sdk/test/verifier.test.mjs#L106) |
| `VerificationReceipt`                                                  | `verified`, `rejected`, or `indeterminate`, with checks but no claims | [`verifier.test.mjs:57`](../../packages/identity-sdk/test/verifier.test.mjs#L57)   |

If transport status is ambiguous, `submitResponse` returns
`AMBIGUOUS_RESPONSE`; query the receipt/session instead of resubmitting. A
receipt never exposes `claims`, `disclosures`, or the raw presentation.

## Scanner client

`CredentialScannerClient` is side-effect free. It parses bounded input and can
delegate an already accepted presentation to a verifier client; it never opens
URLs, starts a camera, fetches remote content or persists a presentation.

| Method                                                   | Behavior                                              | Passing example                                                                |
| -------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `parse(input)`                                           | Strictly parse issuance, presentation or offline scan | [`scanner.test.mjs:31`](../../packages/identity-sdk/test/scanner.test.mjs#L31) |
| `classify(input)`                                        | Non-throwing classification                           | [`scanner.test.mjs:52`](../../packages/identity-sdk/test/scanner.test.mjs#L52) |
| `accept(input, expectedKind?)`                           | Explicitly accept a parsed scan                       | [`scanner.test.mjs:31`](../../packages/identity-sdk/test/scanner.test.mjs#L31) |
| `respond(accepted, sessionId, response, options?)`       | Send only an accepted presentation to verifier        | [`scanner.test.mjs:33`](../../packages/identity-sdk/test/scanner.test.mjs#L33) |
| `acceptAndRespond(input, sessionId, response, options?)` | Parse + accept + respond convenience flow             | [`scanner.test.mjs:31`](../../packages/identity-sdk/test/scanner.test.mjs#L31) |
| `createCredentialScannerClient(options?)`                | Construct parser/orchestration client                 | [`scanner.test.mjs:11`](../../packages/identity-sdk/test/scanner.test.mjs#L11) |

For lower-level integrations, the pure `@ssw/credential-scanner` exports are
listed in [protocols and formats](protocols-formats.md).
