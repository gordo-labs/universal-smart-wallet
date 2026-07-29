# Execution plan

## Outcome

Build the project as three independently verifiable planes:

1. off-chain credential exchange and encrypted vault;
2. passkey smart-account control and recovery;
3. optional on-chain consumption of a minimal verified result.

The first shippable technical proof is the local off-chain vertical slice.
Blockchain infrastructure is added afterward so it cannot hide protocol or
vault defects.

## Work strategy

- One task, one branch, one agent, one acceptance report.
- Spike unstable standards and security-sensitive dependencies before feature
  implementation.
- Keep adapters replaceable and core tests infrastructure-free.
- Merge by dependency graph, not by whichever branch finishes first.
- Use an integration owner for root config, schemas, ABIs, and E2E fixtures.

## Milestones

| Milestone | Tasks | Exit |
| --- | --- | --- |
| M0 Project foundation | SSW-001–003 | Reproducible repo, governance, pinned decision inputs |
| M1 Credential core | SSW-004–010 | Typed policy, replay, vault, SD-JWT, OID4VC adapters |
| M2 Local vertical slice | SSW-011–014 | Synthetic credential flow passes browser E2E |
| M3 Account control | SSW-015–019 | Passkey account, ERC-1271/4337/7579, DID/holder decision |
| M4 Trust and recovery | SSW-020–022 | Status, backup/recovery, consent/privacy hardening |
| M5 On-chain bridge | SSW-023 | Minimal scoped attestation demo |
| M6 Hardening | SSW-024–026 | Adversarial suite, testnet RC, audit packet |
| M7 Open publication/research | SSW-002, SSW-027–028 | Public repo/release process and ZK decision |

`SSW-002` may publish the planning/foundation repository early after approval;
it does not wait for a product release.

## Critical path

```text
SSW-001 → SSW-003 → SSW-004 → SSW-008 → SSW-010
→ SSW-012/013 → SSW-014 → SSW-024 → SSW-025 → SSW-026 → SSW-027
```

The smart-account path joins before the release candidate:

```text
SSW-003 → SSW-015 → SSW-016 → SSW-017/018/019 → SSW-023 → SSW-025
```

## Definition of orchestrated completion

The plan is complete only when every required dependency is merged, not when
parallel agents merely report completion. `task-graph.json` is the machine
source for scheduling.
