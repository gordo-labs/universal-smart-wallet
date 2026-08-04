# Product map

| User need                                    | Planned capability                                                | Canonical feature                                                               |
| -------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Receive an interoperable credential          | OpenID4VCI wallet flow                                            | [Credential exchange](../features/credential-exchange.md)                       |
| Keep credentials private                     | Encrypted local vault                                             | [Encrypted vault](../features/encrypted-vault.md)                               |
| Share only requested information             | DCQL selection and SD-JWT disclosure                              | [Credential exchange](../features/credential-exchange.md)                       |
| Understand and approve a request             | Verifier identity and consent preview                             | [Verification, trust, and status](../features/verification-trust-and-status.md) |
| Control an account without a seed phrase     | Passkey smart account                                             | [Smart account and passkeys](../features/smart-account-and-passkeys.md)         |
| Recover without changing public control root | Signer rotation, recovery, backup                                 | [Identity and holder binding](../features/identity-and-holder-binding.md)       |
| Reject revoked or untrusted claims           | Status and trust policy                                           | [Verification, trust, and status](../features/verification-trust-and-status.md) |
| Gate a contract without putting PII on-chain | Scoped short-lived attestation                                    | [On-chain attestations](../features/onchain-attestations.md)                    |
| Offer a portable smart-wallet service        | Provider-neutral SDK, self-hosted API, passkey/email/OIDC modules | [Wallet Platform SDK](../features/wallet-platform-sdk.md)                       |
| Move between wallet vendors                  | Safe signer rotation or signed encrypted export/import            | [Wallet Platform SDK](../features/wallet-platform-sdk.md)                       |

## MVP persona

An advanced web user tests a synthetic membership/age credential on one
supported desktop browser and an EVM testnet. The MVP is not a regulated
identity wallet and does not handle valuable assets.
