# SSW-026 — architecture and data-flow evidence

This packet describes the synthetic local/testnet boundary. It is evidence for
review, not an independent audit or a production approval.

## Components and trust boundaries

| Boundary | Components | Data crossing it | Required control |
| --- | --- | --- | --- |
| Browser session | `apps/wallet-web`, WebAuthn/PRF adapter | unlock ceremony, selected claims | no plaintext persistence outside unlocked session; lock clears session state |
| Local vault | `packages/credential-vault`, IndexedDB adapter | encrypted credential envelopes and metadata | authenticated encryption, version/rollback checks, no plaintext export |
| Protocol core | `packages/openid4vc`, `packages/presentation-policy` | bounded issuer/verifier metadata, offers, requests | origin/size/timeout limits, nonce/state/replay consumption, explicit disclosure |
| Synthetic issuer/verifier | `apps/issuer-demo`, `apps/verifier-demo` | synthetic credentials and presentations | no PII, fail-closed trust/status, generic denial reasons |
| Account control | `packages/account-adapter`, `contracts/**` | signer intents, recovery approvals, attestation result | ERC-1271 boundary, timelock/threshold recovery, scoped nonces |
| Optional chain | local Anvil or explicitly configured EVM testnet | hashes, policy/audience/nonce/expiry, no credential | pinned code hashes, chain/consumer/policy checks, replay protection |

## Data lifecycle

1. An issuer offer is parsed and bounded before a wallet requests issuance.
2. The credential is verified before encrypted vault insertion; only index
   metadata is used for listing.
3. A verifier request is displayed with purpose, expiry, requested claims and
   trust state. The holder explicitly approves an exact disclosure set.
4. The verifier consumes state/nonce once and returns a generic result. A
   short-lived attestation may bind that result to a chain, consumer, policy,
   audience and nonce without putting credentials on-chain.
5. Lock, deletion, backup restore, recovery rotation and tamper failures are
   tested as separate controls.

## Known boundary gaps

- Demo signing and browser controllers use synthetic adapters; they are not
  production JOSE/key-management implementations.
- The SSW-025 opt-in testnet matrix is not requested until deployment addresses,
  RPC and code hashes are supplied; local RC evidence is not alpha-testnet
  evidence.
- No independent security/privacy audit has occurred.
