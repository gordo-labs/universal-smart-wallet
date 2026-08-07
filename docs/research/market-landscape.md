# Wallet and verifiable-identity market landscape

**Snapshot:** 2026-08-07  
**Purpose:** record adjacent products and clarify the problem Universal Smart
Wallet is solving. This is a public engineering landscape, not a feature-by-
feature procurement review. Vendor capabilities and pricing change; re-check
primary sources before making a commercial decision.

## Executive position

The market is split across two largely separate planes:

1. **Embedded-wallet and account infrastructure**: login, key custody or
   key-management, smart accounts, transaction policy, gas sponsorship and
   chain connectivity.
2. **Digital-identity infrastructure**: DIDs, issuer trust, verifiable
   credentials, status/revocation, OpenID4VCI/OpenID4VP and selective
   presentation.

Universal Smart Wallet intentionally composes both planes behind replaceable
ports, while adding a self-hosted boundary and wallet portability. The closest
analogs usually optimize one plane and integrate with the other through
partners.

## Actor map

| Actor | Primary plane | What it is building | Relation to Universal Smart Wallet |
| --- | --- | --- | --- |
| Privy | Embedded wallets | Embedded wallets, authentication, smart-wallet compatibility, policy controls and delegated sessions | Strong adjacent wallet-service competitor; Universal Smart Wallet keeps the service/provider boundary replaceable and treats VC custody/presentation as a first-class domain |
| Crossmint | Wallets + credentials | Wallet APIs plus W3C-oriented verifiable credentials, issuance, verification and revocation | Closest commercial overlap in wallet + credential workflows; its managed/onchain credential approach is a reference point, while this project emphasizes encrypted holder custody and self-hosting |
| Turnkey | Key infrastructure | Embedded wallets, passkey/email/social onboarding, hardware-isolated key operations and a policy engine | Infrastructure alternative for the signer/vault boundary; not the complete DID/VC issuer-holder-verifier model in this repository |
| Coinbase Developer Platform | Wallet infrastructure | Embedded non-custodial wallets, email/SMS/social onboarding and programmatic system wallets | Wallet and payment infrastructure alternative; identity credentials and vendor portability remain separate concerns |
| Dynamic | Authentication + wallets | Embedded wallets, login identity, recovery and external-wallet connectivity | Alternative auth/wallet onboarding layer; Universal Smart Wallet does not make an auth provider the permanent account owner |
| Safe | Smart-account control | Maintained smart-account, multisig/threshold control and account-abstraction ecosystem | Account-control substrate and adapter boundary used by this project; Safe is not an issuer, holder vault or verifier network |
| SpruceID | Digital identity | DID/VC tooling and wallet/verifier experiences using OpenID4VP-style presentation flows | Identity-first complement; Universal Smart Wallet combines similar holder consent and verification concepts with programmable account/assets |
| Trinsic | Digital identity platform | Credential issuance, verification, wallet provisioning and reusable identity infrastructure | Identity-service alternative; Universal Smart Wallet keeps issuer, holder, verifier and storage ports independently replaceable |
| cheqd | Trust and credential infrastructure | Credential/trust infrastructure, identity wallets and privacy-preserving credential ecosystems | Network/trust-layer complement; this project does not require a credential blockchain or put VC payloads on-chain |

Sources are primary product or developer documentation: [Privy embedded
wallets](https://docs.privy.io/wallets/overview/embedded), [Crossmint
verifiable credentials](https://www.crossmint.com/products/verifiable-credentials),
[Turnkey](https://www.turnkey.com/), [Coinbase CDP non-custodial
wallets](https://docs.cdp.coinbase.com/wallets/non-custodial-wallets/overview),
[Dynamic wallet security](https://docs.dynamic.xyz/wallets/embedded-wallets/architecture-security),
[Safe](https://safe.global/), [SpruceID digital identity](https://spruceid.com/learn/proving-id),
[Trinsic](https://trinsic.id/), and [cheqd](https://cheqd.io/).

## What is genuinely differentiated here

The differentiation is architectural rather than a claim that every primitive
is novel:

- **One control root, two data planes:** the smart account authorizes assets
  and actions; the encrypted vault holds credential payloads and presentation
  material. Identity data is not published in the account contract.
- **Provider-neutral by construction:** email, social login, passkeys, SMTP,
  OIDC, RPC, bundler, paymaster, KMS and account implementations are injected
  ports rather than hard-coded ownership assumptions.
- **VC-native lifecycle:** issuer trust, schema, status/revocation, expiry,
  pairwise identifiers, exact-claim consent, replay protection and
  `indeterminate` outcomes are part of the domain rather than an add-on NFT
  metadata field.
- **Portability as a security property:** a vendor can be rotated without
  silently changing the DID/control model; migration is encrypted, explicit
  and step-up protected.
- **Self-hostable operator surfaces:** an institution can run issuer,
  verifier, admin and scanner boundaries without handing all wallet control to
  a single hosted provider.

## Boundaries and non-claims

This landscape does not claim that Universal Smart Wallet is production-ready,
audited, legally authoritative, interoperable with every vendor, or a
replacement for government identity infrastructure. The current repository
uses synthetic credentials and opt-in testnet evidence. EUDI/HAIP, regulated
issuer authority, production KMS/HSM operations and external interoperability
remain separate evidence tracks.

## Revisit triggers

Refresh this document when any of the following changes:

- a vendor adds or removes VC/DID support;
- a provider changes custody, recovery or export semantics;
- OpenID4VCI/OpenID4VP, SD-JWT VC or ERC-7579 support moves profile/version;
- Universal Smart Wallet selects a production Safe deployment or another
  account implementation;
- a self-hosted deployment is validated against an external issuer/verifier.
