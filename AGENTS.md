# AGENTS.md — Universal Smart Wallet

**Cursor workspace = this folder.**

## Every session

1. Read `PROJECT.json`, `STATUS.md`, and `DOCS-MAP.md`.
2. Read `working/BACKLOG.md` and the exact assigned task document.
3. Read the feature documents linked by that task.
4. Check `git status --short --branch` before editing.
5. Read today’s file under `working/memory/YYYY/MM/YYYY-MM-DD.md`.
6. Load `../../docs/PROJECT-STANDARDS.md` only when the local docs do not answer
   a documentation or project-structure question.

## Git

- `main` is the integration and release branch once the remote exists.
- One atomic task per branch: `feat/SSW-###-short-slug`,
  `docs/SSW-###-short-slug`, or `test/SSW-###-short-slug`.
- Never rebase or force-push shared `main`.
- Do not create a remote, push, deploy, publish a package, or create a release
  unless the task explicitly includes that external write and the owner has
  authorized it.
- If unrelated local work exists, do not clean or overwrite it. Use a worktree
  or request direction.

## Scope and security

- Synthetic credentials only until `SSW-026` is complete.
- Local Anvil and explicitly configured testnets only; never mainnet.
- Never store a full credential, PII, vault key, recovery secret, or passkey
  private material on-chain or in logs.
- Do not implement cryptographic primitives or a smart-account base from
  scratch. Use reviewed libraries behind narrow adapters.
- Tests must not require hosted RPC, bundler, paymaster, issuer, or verifier
  services. External integration tests are opt-in.
- Treat WebAuthn PRF as an optional capability, never as a universal browser
  guarantee.
- Treat SD-JWT VC and ERC-7579 as version-pinned, replaceable adapters while
  their specifications remain non-final.
- Selective disclosure is not a general predicate proof. The MVP age flow uses
  an issuer-signed `is_over_18: true` claim, not a hidden date comparison.

## Task completion contract

A task is complete only when:

1. every acceptance criterion has a pass/fail result;
2. the mapped tests or checks were run;
3. relevant feature, map, backlog, and history docs were updated;
4. today’s project memory contains the outcome and next handoff;
5. no unrelated file changes are included;
6. limitations, mocks, and external dependencies are reported honestly.

Use `node scripts/render-task-prompts.mjs` only after changing
`working/orchestration/task-graph.json`; generated task documents must stay in
sync with that source.
