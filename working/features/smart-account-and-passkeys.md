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
- Baseline: [`ADR SSW-003`](../../docs/decisions/SSW-003-standards-dependency-baseline.md)
  records EntryPoint 0.8.0 and the Safe Protocol Kit 8.0.4 spike candidate;
  ERC-7579 remains a replaceable Draft adapter.
- ERC-7579 is an optional Draft-standard adapter after the core flow.
- Module installation, removal, recovery, and denial-of-service paths require
  tests.

## Tasks

`SSW-015`–`SSW-018`, `SSW-021`, `SSW-024`.

## SSW-021 recovery boundary (2026-07-29)

`createRecoveryController` models stable account identity, guardian threshold,
and non-bypassable block timelock before signer rotation. It is a deterministic
local policy model and test harness only; no custodial service or custom
smart-account base is introduced.

## SSW-015 decision and harness (2026-07-29)

SSW-015 selects Safe Protocol Kit `8.0.4` as the replaceable account boundary
for ERC-1271, ERC-4337, and the passkey path. EntryPoint `0.8.0` remains pinned
to the SSW-003 canonical address. `packages/account-adapter` validates chain,
address, runtime code hash, and EntryPoint compatibility before trust. The
Foundry harness proves deterministic CREATE2 deployment and code-hash checks
using a test-only external-code fixture; it does not implement an account,
passkey verifier, module, recovery path, or UserOperation.

## SSW-016 local passkey/ERC-1271 boundary (2026-07-29)

The adapter requires exact origin, RP ID, challenge, and account matches before
invoking an external pinned P-256 verifier callback; rejected and empty
signatures fail closed. It accepts assertion bytes only and has no private-key
or vault-decryption API. Cancellation and unsupported authenticators are
classified explicitly. A deterministic local account path derives an address
from chain ID, factory, RP ID, and credential ID with the
`ssw-local-account-v1` domain. The Foundry fixture covers positive and negative
ERC-1271 responses while production remains the upstream Safe deployment.
Playwright and cross-browser coverage remain follow-up integration work.

## SSW-017 ERC-4337 adapter (2026-07-29)

`@ssw/account-adapter` now exposes provider-neutral bundler/paymaster ports and
an opt-in simulation → sponsorship → single submission → receipt flow. Chain,
EntryPoint 0.8.0, account address, and runtime code hash are mandatory; no
provider or chain fallback exists. Missing environment skips the smoke gate,
while simulation, paymaster, transport, and receipt mismatches are typed and
actionable. Testnet use remains explicitly configured and non-production.

## SSW-018 ERC-7579 compatibility (2026-07-29)

The optional adapter is pinned to `erc-7579-draft-2024-03` and
`ssw-erc7579-adapter-v1`. A module manifest requires address, type, version,
and runtime code hash; delegatecall is forbidden. Local lifecycle tests cover
install/use/uninstall, reverting and reentrant modules, and owner-only recovery
removal. Safe remains the external account base and credentials do not depend
on modules. Draft migration and per-chain deployment pinning remain required
before testnet use.

## SSW-034 modular authentication adapter (2026-08-04)

`@ssw/auth-passkey` reuses the existing WebAuthn/P-256 boundary through an
injected verifier port. It provides browser registration/authentication ports,
server-side single-use challenge consumption, step-up evidence, account/DID
binding, and deterministic synthetic fixtures. Every assertion is bound to the
origin, RP ID, challenge, account, required user verification state, and pinned
verifier deployment code hash before the verifier is called.

Passkey rotation verifies and stores the replacement before revoking the old
credential, preserving the Safe account and controller DID. Removal requires a
different active replacement. Browser cancellation and unsupported authenticators
are mapped to actionable typed errors. WebAuthn PRF is capability-detected and
optional; when unavailable callers receive the explicit passphrase fallback,
never a silent downgrade. The adapter does not use signatures as vault keys and
does not persist private passkey material.
