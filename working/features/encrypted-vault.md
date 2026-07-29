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

## Constraints

Passkey signing and vault encryption are separate concerns. Smart-account
recovery does not recover the vault unless the encrypted backup flow also
succeeds.

## Tasks

`SSW-006`, `SSW-007`, `SSW-012`, `SSW-021`, `SSW-024`.
