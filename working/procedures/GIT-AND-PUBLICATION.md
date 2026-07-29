# Git and publication

## Local repository

- Default branch: `main`.
- Atomic branches: `feat/SSW-###-slug`, `docs/SSW-###-slug`,
  `test/SSW-###-slug`.
- Conventional commits with the task ID in the body or PR.
- No force-push to `main`.

## Public repository

`https://github.com/gordo-labs/sovereign-smart-wallet`

The planning scaffold was published with explicit owner approval on
2026-07-29. Product releases, deployments, package publication, and any
production-readiness claim remain separate approval gates.

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

## Current governance

- Public visibility and `main` as the default branch.
- Planning validation on pushes to `main` and pull requests.
- Dependabot updates for pinned GitHub Actions.
- GitHub secret scanning, push protection, dependency alerts, automated
  security fixes, and private vulnerability reporting.
- Protected `main`; required product checks will be expanded after `SSW-001`
  adds the executable root toolchain.

Code releases are separate from repository publication and follow
`RELEASE-WORKFLOW.md`.
