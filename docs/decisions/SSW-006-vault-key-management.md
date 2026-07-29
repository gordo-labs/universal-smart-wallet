# ADR SSW-006 — Versioned vault key management

**Status:** Accepted for the local MVP boundary (2026-07-29)

## Decision

Vault records use a random 256-bit data-encryption key (DEK) and AES-GCM-256.
The DEK is wrapped by a non-exportable AES key derived at unlock time from one
of two explicit factors:

| Strategy     | Derivation                                                            | Persisted in the envelope                         | Unlock factor             |
| ------------ | --------------------------------------------------------------------- | ------------------------------------------------- | ------------------------- |
| `prf`        | HKDF-SHA-256(PRF output, random salt, domain `ssw-vault-wrap-v1`)     | strategy, salt, wrapped DEK, IVs                  | fresh WebAuthn PRF output |
| `passphrase` | PBKDF2-SHA-256(passphrase, random salt, 100,000–2,000,000 iterations) | strategy, salt, iteration count, wrapped DEK, IVs | user recovery factor      |

The passkey signature is never used as key material. PRF is an optional
capability: callers must detect it and choose `passphrase` deliberately when
it is unavailable. There is no automatic downgrade. Authentication-tag,
version, algorithm, and wrapped-key-length failures are terminal errors.

## Envelope and migration

`VaultEnvelope` is versioned (`version: 1`) and contains no plaintext DEK,
PRF output, or passphrase. The payload and wrapped DEK each use an independent
12-byte nonce. `migrateVaultEnvelope` decrypts only in memory and emits a new
envelope, allowing a future version to change KDF parameters without exposing
old factors.

PBKDF2 bounds prevent a hostile envelope from forcing unbounded work. An
implementation may raise the local minimum in a future envelope version; it
must not accept values outside the bounded range.

## Consequences

- PRF-capable devices get phishing-resistant, device-bound unlock, but a lost
  authenticator loses access unless an encrypted backup or separately stored
  recovery factor exists.
- The passphrase path works on browsers without PRF and across devices, but
  recovery depends entirely on the user's factor; a forgotten factor is
  unrecoverable by design.
- Synced envelopes are ciphertext only. An attacker with a copy still needs
  the PRF output or passphrase; rollback protection and backup freshness are
  responsibilities of SSW-007/021.
- Smart-account recovery does not recover the vault unless the encrypted
  backup flow succeeds explicitly.

## Validation

The package test suite fixes all random inputs for deterministic vectors,
round-trips both strategies, rejects tampering and unsupported versions,
checks PBKDF2 bounds, exercises migration, and verifies the explicit PRF
capability failure path.
