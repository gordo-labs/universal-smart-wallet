# Self-hosting, custody and portability

Start from [`docker-compose.platform.yml`](../../docker-compose.platform.yml)
and [`scripts/self-hosted-validate.mjs`](../../scripts/self-hosted-validate.mjs).
PostgreSQL, SMTP, OIDC, RPC, bundler, paymaster, signer/KMS and storage are
replaceable ports rather than vendor requirements.

## Email-only onboarding

`@ssw/auth-email` sends a six-digit, single-use, salted/hashed OTP through an
injected `EmailTransportPort`. Only a salted subject hash is persisted. Email
login creates a short-lived operational session with `requiresStepUp: true`;
it cannot rotate the owner, export a wallet, install a module or migrate a
vendor. This is operational custody, not cryptographic self-custody. Display the custody warning and ask the user to add a passkey or
recovery factor before holding value.

Use Mailpit for local tests and `SmtpEmailTransport` only with a configured
SMTP client. Never put raw addresses, OTPs or provider secrets in logs.

`@ssw/auth-passkey` requires user verification, chooses WebAuthn PRF when
available and has a passphrase fallback. `@ssw/auth-oidc` validates issuer,
audience, nonce, PKCE state, discovery size/host policy and token signatures.
OIDC linking requires an authenticated recovery step-up.

## Migration and vendor rotation

`@ssw/wallet-portability` creates a versioned AES-GCM-256 bundle with AAD,
signature and expiry. `inspectMigrationBundle` validates the header;
`openMigrationBundle` decrypts through an injected vault key;
`importMigrationBundle` validates tenant, chain, digest and rollback state;
`rotateVendor` preserves the Safe address and private DID when the capability
is portable. A non-portable capability fails closed. Asset movement always
requires explicit user authorization.

```text
export -> inspect/open -> verify user approval -> import -> verify balances/history
```

Migration does not transfer plaintext keys, credentials or PII. Preserve the
source wallet until the target has been independently verified.
