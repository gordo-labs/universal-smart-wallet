# Self-hosted reference stack

Copy `.env.platform.example` to `.env.platform` and review every value. The
compose file starts Postgres, Mailpit, local Anvil, wallet service, wallet app,
admin console, and the use-case gallery. Development credentials and Anvil are
deliberately unsafe; never expose this stack publicly.

```sh
cp .env.platform.example .env.platform
set -a; . ./.env.platform; set +a
node scripts/self-hosted-validate.mjs
docker compose --env-file .env.platform -f docker-compose.platform.yml config
docker compose --env-file .env.platform -f docker-compose.platform.yml up --build
```

The service `/health` endpoint only means the process is alive. `/ready` remains
503 until migrations have completed. To opt into Base Sepolia, set
`BASE_SEPOLIA_RPC_URL`, `BUNDLER_URL`, `PAYMASTER_URL`, and `SIGNER_ENDPOINT` to
operator-controlled endpoints and replace the local Anvil dependency. No
mainnet configuration is included.

## Backup, restore, and rotation

Use `pg_dump` against the Postgres service before upgrades and restore into a
fresh database. Rotate `POSTGRES_PASSWORD` and all provider/signer credentials
together, then recreate the service; do not commit `.env.platform` or dumps.
