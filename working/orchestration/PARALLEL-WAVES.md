# Parallel waves

| Wave | Parallel candidates | Integration note |
| --- | --- | --- |
| 0 | SSW-001 | Root foundation only |
| 1 | SSW-002, SSW-003 | Publication is approval-gated; standards spike is read-mostly |
| 2 | SSW-004, SSW-006, SSW-015 | Separate schema, vault, and account lanes |
| 3 | SSW-005, SSW-007, SSW-008, SSW-016 | Coordinate shared fixtures and crypto types |
| 4 | SSW-009, SSW-010, SSW-017, SSW-018 | Protocol and chain adapters can proceed separately |
| 5 | SSW-011, SSW-013, SSW-019, SSW-020 | App/domain/DID/status lanes |
| 6 | SSW-012 | Wallet integrates vault plus both protocol adapters |
| 7 | SSW-014, SSW-021 | Local E2E and recovery/backup can run in parallel |
| 8 | SSW-022, SSW-023 | Privacy UI and on-chain bridge |
| 9 | SSW-024 | Adversarial cross-cutting hardening |
| 10 | SSW-025 | Full release-candidate integration |
| 11 | SSW-026 | Independent review readiness |
| 12 | SSW-027, SSW-028 | Product release and later ZK research are separate |

## Collision rules

- `package.json`, lockfile, root TypeScript/lint config: foundation/integrator.
- Public schemas: `SSW-004` owner; consumers do not redefine them.
- Protocol fixtures: `SSW-008` owner with consumer PR review.
- Vault envelope/migrations: `SSW-007` owner.
- Smart-account ABI/deployments: `SSW-015`/`SSW-016` owner.
- E2E fixtures: `SSW-014` owner.
