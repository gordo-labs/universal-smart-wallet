# Contributing

This project is still in its security-sensitive construction phase.

## Start here

1. Read [AGENTS.md](AGENTS.md).
2. Pick one unblocked task from [working/BACKLOG.md](working/BACKLOG.md).
3. Read its detail document under `working/tasks/`.
4. Create one branch for that task.
5. Keep the implementation, tests, and documentation update in the same PR.

## Pull requests

- Reference the `SSW-###` task ID.
- Report every acceptance criterion as pass or fail.
- Include exact validation commands and results.
- Explain any new cryptographic, identity, chain, or hosted-service dependency.
- Do not include real credentials, secrets, PII, private keys, production RPC
  URLs, or mainnet deployments.

## Generated task documents

`working/orchestration/task-graph.json` is the source for task metadata and
agent prompts. Regenerate task files with:

```bash
node scripts/render-task-prompts.mjs
```
