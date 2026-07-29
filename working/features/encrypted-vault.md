# Encrypted vault

## What and why

Local encrypted storage for credentials, indexes, and consent-safe metadata.
Credentials never enter blockchain state or plaintext logs.

## Owner surfaces

- `packages/credential-vault`
- `apps/wallet-web`

## Planned behavior

- AES-GCM authenticated, versioned envelopes.
- Explicit key-wrapping strategy with capability detection.
- WebAuthn PRF path when supported.
- Safe fallback and encrypted export/restore path when PRF is unavailable.
- IndexedDB migrations, corruption detection, deletion, and bounded metadata
  indexing.

## SSW-007 implementation

`@ssw/credential-vault` now exposes AES-GCM-256 versioned envelopes with
authenticated metadata (AES-GCM additional data), bounded index records, an
in-memory adapter, and an IndexedDB adapter using one transactional object
store. The IndexedDB adapter creates schema version 1 atomically; migrations
decrypt and re-encrypt before replacing the old record, so failed migrations
retain the previous ciphertext. Corruption and wrong-key failures are surfaced
as recoverable `VaultStoreError`s without including plaintext.

SSW-006 establishes the key boundary in
[`docs/decisions/SSW-006-vault-key-management.md`](../../docs/decisions/SSW-006-vault-key-management.md): random DEK + AES-GCM, explicit PRF/HKDF or PBKDF2 wrapping, and no silent PRF downgrade. Loss, sync theft, and rollback consequences are recorded in the [threat model](../../docs/threat-model/SSW-006-vault-key-management.md).

## Constraints

Passkey signing and vault encryption are separate concerns. Smart-account
recovery does not recover the vault unless the encrypted backup flow also
succeeds.

## SSW-021 backup/restore boundary (2026-07-29)

`createVaultBackup` exports a versioned outer AES-GCM envelope whose payload
contains only already-encrypted vault records. PBKDF2 work remains bounded and
the backup sequence is authenticated; `openVaultBackup` rejects wrong factors,
corruption, and sequence rollback. Restore replaces records atomically in the
local adapters. Account recovery and vault restore remain independently
authenticated state machines.

## Tasks

`SSW-006`, `SSW-007`, `SSW-012`, `SSW-021`, `SSW-024`.
