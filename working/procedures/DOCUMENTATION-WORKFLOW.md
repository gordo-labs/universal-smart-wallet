# Documentation workflow

## Before a task

1. Read `DOCS-MAP.md`.
2. Open the exact task and linked feature docs.
3. Check whether maps or standards baselines constrain the design.

## After a task

1. Update current behavior in the owning feature doc.
2. Update maps if ownership or dependencies changed.
3. Update both the task document and `working/BACKLOG.md`.
4. Append validation and publication traceability to monthly history.
5. Append the session result to project memory.
6. Promote only milestone-grade changes into `STATUS.md`.
7. Keep public docs free of secrets, private operations, and unsupported
   production claims.

Generated task files are derived from
`working/orchestration/task-graph.json`. Update that file and run
`node scripts/render-task-prompts.mjs`.
