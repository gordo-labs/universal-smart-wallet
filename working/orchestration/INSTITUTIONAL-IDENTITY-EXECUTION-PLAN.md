# Institutional identity execution plan

## Scope

The institutional identity platform is complete through `SSW-079` in the
local synthetic baseline. The `SSW-057`–`SSW-079` entries below remain the
atomic, copy/paste subagent contracts that document how the work was split and
how future changes must be validated; they are not a queue of unstarted work.

The source of truth is `task-graph.json`. Generated prompt documents live in
`working/tasks/`; `PROMPT-CATALOG.md` is their index.

## Dependency waves

| Wave | Tasks | Exit condition |
| --- | --- | --- |
| 31 | SSW-057 | Format-neutral SDK transport, types, errors, and cancellation fixed |
| 32 | SSW-060, SSW-065, SSW-066 | Parser, issuer SDK, and holder SDK pass independently |
| 33 | SSW-067 | Verifier and scanner SDK methods consume the parser boundary |
| 34 | SSW-058, SSW-059 | Issuer configuration and holder inbox pass independently |
| 35 | SSW-061, SSW-064, SSW-068–SSW-072 | Native ports, product modules, scanning, offline verification, and developer docs pass |
| 36 | SSW-073 | Expo wallet composes only completed capability boundaries |
| 38 | SSW-062, SSW-074–SSW-076 | Four synthetic sector packs pass independently |
| 39 | SSW-063 | Deterministic institutional identity E2E gate is green |
| 40 | SSW-077 | Adversarial and privacy gate is green |
| 41 | SSW-078 | Version-pinned EUDI/HAIP evidence has no unsupported claims |
| 42 | SSW-079 | Operator docs, examples, claims, and prompt catalog agree |

## Assignment rules and maintenance

1. For future changes, give a subagent exactly one full **Agent prompt** from
   its task document.
2. Start it only when every `dependsOn` task is Done.
3. Parallelize tasks in the same wave only when their `touchPaths` do not
   overlap; otherwise serialize or assign explicit file ownership.
4. Do not broaden non-goals, use real PII, claim certification, publish, deploy,
   or use mainnet without separate authorization.
5. After a future task is integrated, run its stated validation and regenerate
   the planning artifacts before keeping it Done. SSW-079 additionally requires
   the operator handoff and claims audit to stay synchronized.

## Critical paths

```text
SDK/product:
SSW-057 -> SSW-060 -> SSW-067 -> SSW-071/072 -> SSW-073

Issuer:
SSW-057 -> SSW-065 -> SSW-058 -> SSW-068/069

Holder:
SSW-057 -> SSW-066 -> SSW-059 -> SSW-070 -> SSW-073

Assurance:
SSW-073 + SSW-068/070 -> SSW-062/074/075/076
-> SSW-063 -> SSW-077 -> SSW-078 -> SSW-079
```

## Prompt locations

- Index: `working/orchestration/PROMPT-CATALOG.md`
- Backlog: `working/BACKLOG.md`
- Machine graph: `working/orchestration/task-graph.json`
- Individual prompts: `working/tasks/SSW-057-*.md` through
  `working/tasks/SSW-079-*.md`
