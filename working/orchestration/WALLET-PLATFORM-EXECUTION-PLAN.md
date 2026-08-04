# Wallet Platform SDK execution plan

## Outcome

Build a modular, self-hostable wallet platform comparable in developer
experience to hosted wallet services while keeping account control, identity,
and migration provider-neutral.

## Waves

| Wave | Tasks           | Exit condition                                                                |
| ---- | --------------- | ----------------------------------------------------------------------------- |
| 13   | SSW-029–SSW-033 | Architecture, schemas, storage, Safe service adapter, and signer policy fixed |
| 14   | SSW-034–SSW-037 | Passkey, email, OIDC, and default private DID modules pass independently      |
| 15   | SSW-038–SSW-040 | Portability, asset actions, and REST/OpenAPI service integrated               |
| 16   | SSW-041–SSW-042 | TypeScript and React SDKs consume only public service contracts               |
| 17   | SSW-043–SSW-045 | Wallet app, admin console, and use-case gallery work through the SDK          |
| 18   | SSW-046–SSW-048 | Self-host stack, adversarial E2E, and final documentation complete            |

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
