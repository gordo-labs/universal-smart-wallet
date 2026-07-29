# SSW-022 — Consent, phishing resistance, and privacy UX

## Security boundary

The wallet treats every presentation request as untrusted input. The review
surface exposes the requester, HTTPS origin, requested claim paths, exact
disclosures, purpose, credential expiry, and request-trust level as plain text.
Remote metadata is bounded and stripped of tags/control characters before it is
shown; it is never inserted as trusted HTML.

`request_uri` and signed-request objects are represented by an explicit trust
indicator. A verifier whose client and response origins differ is ambiguous;
the wallet creates a review object for auditability but `canApprove` is false
and approval raises `unsafe-request`. Same-origin unsigned local fixtures are
labelled `review`, while signed and resolver-confirmed requests are `trusted`.

Consent is never pre-checked and there is no timeout path that approves. The
holder must explicitly pass the exact credential IDs shown in the review. The
`denyPresentation`/cancel path clears pending state and returns only the stable
message “Presentation cancelled; no disclosure was sent”. The verifier maps
claim mismatch, missing disclosure, invalid signature, expiry, status, nonce,
and consent failures to the same `verification_failed` response; no hidden
claim result is observable.

## Manual threat-model walkthrough

1. Replace verifier `client_id` or `response_uri` with different HTTPS origins:
   the wallet displays `blocked` and cannot enter approval.
2. Supply HTML/control characters in a request label: the displayed value is
   plain bounded text, with markup removed.
3. Use an unsigned same-origin request: the UI displays `review` and the holder
   must explicitly approve; no automatic approval occurs.
4. Deny a request after a matching and a non-matching credential fixture: both
   paths return the same privacy-safe cancellation text.
5. Submit an altered approval set or replay a callback: the wallet/verifier
   fail closed, consume state once, and do not include claim details in errors.

## Evidence

| Control                                                 | Automated evidence                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Requester/data/purpose/expiry/trust are distinguishable | `apps/wallet-web/test/index.test.mjs` consent summary test; `verifier-demo` trust-summary test |
| Unsafe or ambiguous requests cannot be approved         | Wallet ambiguous-origin test and `requirePresentationApproval()` blocker                       |
| Denial and mismatches are privacy-safe                  | Wallet denial test; verifier failure matrix in `verifier.test.mjs`                             |
| Remote metadata is not trusted HTML                     | `sanitizeRemoteText` test and bounded text-only UI contract                                    |

All checks use synthetic local fixtures and do not contact issuer, verifier,
trust-registry, RPC, bundler, or paymaster services.
