# SSW-006 threat-model consequences

| Event                         | PRF strategy                                                                   | Passphrase fallback                                                    | Required behavior                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Device/authenticator loss     | Envelope cannot unlock from ciphertext alone                                   | Restore on another device if the factor is known                       | Explain loss before enrollment; require encrypted backup for continuity                                  |
| Cloud/storage sync theft      | Ciphertext and KDF metadata only; offline guessing is not possible without PRF | Offline guessing is bounded by PBKDF2; weak factors remain a user risk | Never sync factors, DEKs, or plaintext; rate-limit UX and encourage strong factors                       |
| Rollback to an older envelope | Old authenticated ciphertext may open if its factor remains valid              | Same                                                                   | SSW-007 must add monotonic revision/backup freshness; envelope authentication is not rollback protection |
| Tamper/corruption             | AES-GCM tag failure is terminal                                                | AES-GCM tag failure is terminal                                        | Do not return partial plaintext or silently repair                                                       |
| Unsupported PRF               | Explicit capability error; no signature-derived downgrade                      | User explicitly chooses passphrase                                     | Surface the strategy and recovery consequences in consent UX                                             |

Out of scope for this spike: IndexedDB durability, deletion semantics,
anti-rollback metadata, backup transport, and account recovery. Those are
tracked by SSW-007, SSW-021, and SSW-022.
