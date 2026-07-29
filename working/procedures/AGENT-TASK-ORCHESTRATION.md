# Agent task orchestration

## Assignment rule

Assign exactly one `SSW-###` task to one agent/branch. An agent may take a second
task only after the first has passed its acceptance criteria and produced a
handoff.

## Parallelism

- Respect every `dependsOn` edge in `task-graph.json`.
- Tasks in the same wave are candidates for parallel work, not permission to
  edit the same files.
- Use the `touchPaths` field to detect collisions before assignment.
- Never assign two tasks that both own the same migration, public schema, ABI,
  lockfile, or root configuration without a named integrator.
- The wave integrator merges in dependency order and reruns root validation.

## Agent start

1. Send the complete prompt from the task document.
2. Give the agent an isolated branch/worktree.
3. Confirm all dependencies are merged, not merely “done elsewhere”.
4. Record the assignee and branch in the task/issue system.

## Agent handoff

The agent must return:

- changed files;
- acceptance criterion pass/fail table;
- exact commands and results;
- mocks or external dependencies;
- security/privacy implications;
- documentation updates;
- next unblocked task IDs.

## Integration gate

An integration task does not repair unfinished prerequisites silently. It stops,
records the failed dependency, and routes the defect back to the owning task.
