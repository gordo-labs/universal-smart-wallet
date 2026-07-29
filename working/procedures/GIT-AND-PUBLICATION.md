# Git and publication

## Local repository

- Default branch: `main`.
- Atomic branches: `feat/SSW-###-slug`, `docs/SSW-###-slug`,
  `test/SSW-###-slug`.
- Conventional commits with the task ID in the body or PR.
- No force-push to `main`.

## Planned public repository

`https://github.com/gordo-labs/sovereign-smart-wallet`

At scaffold time the repository did not exist or was not accessible. Creating
the remote and pushing are explicit external writes and belong to `SSW-002`.

## Publication checklist

- explicit owner approval for public publication;
- repository visibility verified as public;
- Apache-2.0 license present;
- README and security maturity warning accurate;
- no secrets, PII, real credentials, wallet backups, or private key material;
- secret scan and dependency license scan pass;
- branch protection, private vulnerability reporting, and Dependabot/Renovate
  policy configured;
- repository URL written back to `PROJECT.json` and `STATUS.md`.

Code releases are separate from repository publication and follow
`RELEASE-WORKFLOW.md`.
