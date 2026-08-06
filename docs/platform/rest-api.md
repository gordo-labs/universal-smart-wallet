# Self-hosted Wallet Service REST API

The reference implementation is [`apps/wallet-service`](../../apps/wallet-service)
and its OpenAPI 3.1 contract is [`openapi.json`](../../apps/wallet-service/openapi.json).

| Method | Path | Scope | Idempotency |
| --- | --- | --- | --- |
| GET | `/v1/health` | public | n/a |
| GET/POST | `/v1/wallets` | `wallets:read/write` | POST requires `Idempotency-Key` |
| GET | `/v1/wallets/{walletId}` | `wallets:read` | n/a |
| GET | `/v1/wallets/{walletId}/balances` | `wallets:read` | n/a |
| GET | `/v1/wallets/{walletId}/activity` | `wallets:read` | n/a |
| POST | `/v1/transactions` | `transactions:write` | required |
| POST | `/v1/webhooks` | `webhooks:write` | provider-specific |

Authentication accepts a short-lived JWT for browser sessions or an API key
for server automation. Tenant claims, opaque locators and strict bounded
request bodies are checked at every boundary. Policy denial returns a failure;
the service never falls back to an unsafe signer.

```bash
pnpm --filter @ssw/wallet-service test
node --test tests/platform/platform-e2e.test.mjs
```

The service stores metadata and redacted audit records only. VCs, PII,
recovery material and vault keys do not belong in its database.
