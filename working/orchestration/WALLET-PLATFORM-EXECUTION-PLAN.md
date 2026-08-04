# Wallet Platform SDK execution plan

## Outcome

Build a modular, self-hostable wallet platform comparable in developer
experience to hosted wallet services while keeping account control, identity,
and migration provider-neutral.

## Waves

| Wave | Tasks                    | Exit condition                                              |
| ---- | ------------------------ | ----------------------------------------------------------- |
| 13   | SSW-029                  | Platform architecture and threat model fixed                |
| 14   | SSW-030                  | Public schemas and locators fixed                           |
| 15   | SSW-031, SSW-032         | Storage and Safe service adapter pass independently         |
| 16   | SSW-033, SSW-037         | Signer policy and private DID lifecycle pass independently  |
| 17   | SSW-034–SSW-036, SSW-039 | Authentication modules and asset actions pass independently |
| 18   | SSW-038                  | Both portability modes pass                                 |
| 19   | SSW-040                  | REST/OpenAPI service integrates every platform module       |
| 20   | SSW-041                  | TypeScript SDK consumes only public service contracts       |
| 21   | SSW-042                  | React bindings consume only the TypeScript SDK              |
| 22   | SSW-043, SSW-044         | Wallet app and admin console pass independently             |
| 23   | SSW-045                  | Use-case gallery passes through public SDKs                 |
| 24   | SSW-046                  | Self-hosted reference stack passes from clean state         |
| 25   | SSW-047                  | Full adversarial E2E gate passes                            |
| 26   | SSW-048                  | Documentation matches the verified implementation           |

## Critical path

```text
SSW-029 → SSW-030 → SSW-032 → SSW-033 → SSW-040
→ SSW-041 → SSW-042 → SSW-043/044 → SSW-045
→ SSW-046 → SSW-047 → SSW-048
```

SSW-031 supplies storage to SSW-040. Authentication and DID tasks join before
the service integration. Portability and asset actions join before the SDKs.

## Assignment

- Assign one task document to one subagent and isolated branch/worktree.
- Do not start a task until every `dependsOn` entry is merged.
- Tasks in the same wave may run concurrently only when their owned paths do
  not overlap.
- The integrator reruns root lint, typecheck, tests, security tests, E2E, and
  documentation build after every wave.
