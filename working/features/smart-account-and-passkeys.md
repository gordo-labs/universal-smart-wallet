# Smart account and passkeys

## What and why

A maintained EVM smart account uses a passkey as the primary signer, supports
ERC-1271, and submits ERC-4337 UserOperations locally and on an opt-in testnet.

## Owner surfaces

- `packages/account-adapter`
- `contracts`
- `apps/wallet-web`

## Leading architecture

Evaluate Safe and Kernel, with Safe as the leading candidate because current
official documentation covers passkeys, ERC-4337, ERC-1271, and a Safe7579
adapter. The ADR—not this planning assumption—selects the dependency.

## Constraints

- Never implement the base account or P-256 verifier from scratch.
- Local tests are independent of RPC/bundler/paymaster vendors.
- Pin EntryPoint, modules, deployments, chain IDs, and contract code hashes.
- ERC-7579 is an optional Draft-standard adapter after the core flow.
- Module installation, removal, recovery, and denial-of-service paths require
  tests.

## Tasks

`SSW-015`–`SSW-018`, `SSW-021`, `SSW-024`.
