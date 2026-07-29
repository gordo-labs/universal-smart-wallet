# Atomic tasks

Task detail documents in this directory are generated from
`working/orchestration/task-graph.json`.

Each document includes:

- dependency and parallel-wave metadata;
- owned paths;
- objective, deliverables, and non-goals;
- verifiable acceptance criteria;
- failure handling and validation;
- a complete copy/paste agent prompt.

Regenerate after task-graph changes:

```bash
node scripts/render-task-prompts.mjs
```
