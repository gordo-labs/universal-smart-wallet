# Composable compliance wallet: market thesis and validation plan

**Date:** 2026-08-07  
**Status:** opportunity hypothesis, not a regulatory or investment conclusion

## Executive conclusion

There is a credible market vector for a **portable compliance and
authorization wallet for businesses**, built on top of a smart account and a
verifiable-credential vault.

The winning proposition is not “KYC once and never check again.” Regulated
firms still own customer due diligence, sanctions decisions, suspicious-
activity escalation and ongoing monitoring. The better proposition is:

> Verify an organisation, its controllers, licences and wallet controls once;
> let it present signed, policy-scoped evidence to multiple counterparties;
> re-check only when the credential, risk policy, relationship or transaction
> context requires it.

This changes the product from another embedded-wallet API into a **portable
trust and transaction-permission layer** for businesses operating across
payments, stablecoins, tokenised assets, marketplaces and agentic commerce.

## Why the timing is plausible

### 1. Digital identity is moving from login to reusable evidence

The European Commission describes the EUDI Wallet as a way to hold and share
only the documents required for a transaction, including identity and income
evidence. The EU framework also creates a path for electronic attestations of
attributes and cross-border trust. The same direction is visible in European
Digital Credentials and the emerging European Business Wallet work.

Sources: [European Digital Identity](https://commission.europa.eu/topics/digital-economy-and-society/european-digital-identity_en),
[EUDI regulation](https://digital-strategy.ec.europa.eu/en/policies/eudi-regulation),
[European Digital Credentials](https://europass.europa.eu/en/european-digital-credentials).

### 2. Digital ID can support due diligence, but it does not remove it

FATF guidance recognises that reliable digital identity can support customer
identification, authentication and ongoing due diligence. It remains a
risk-based control: the relying institution must decide whether the identity
system, issuer, assurance level and evidence are appropriate for its use case.

Source: [FATF Guidance on Digital Identity](https://www.fatf-gafi.org/en/publications/Financialinclusionandnpoissues/Digital-identity-guidance.html).

### 3. Smart-account infrastructure is now a commodity layer

Privy, Crossmint, Turnkey, Coinbase CDP, Dynamic and Safe have made embedded
wallets, key management, passkeys, policy controls and account abstraction
available as building blocks. This lowers the technical barrier to a wallet
that can be attached to an email, passkey, organisation or delegated signer.

### 4. KYT is inherently continuous

KYT providers such as Chainalysis monitor transactions, counterparties and
exposure as conditions change. A reusable credential can reduce repeated
document collection and prove a prior assessment, but it cannot make a new
transaction safe by itself.

Source: [Chainalysis KYT](https://www.chainalysis.com/product/kyt/).

## Market structure

The current market is fragmented into five layers:

| Layer | Typical actors | What they solve | Missing composition |
| --- | --- | --- | --- |
| KYC/KYB/AML onboarding | Persona, Sumsub, Trulioo, Alloy, Middesk, Sardine | Identity, business, UBO, sanctions and fraud checks | A portable, user-controlled credential and wallet-control proof |
| Reusable identity | Blockpass, Sumsub ID, Persona reusable identity | Reuse previously verified evidence across participating platforms | Neutral interoperability across competing issuers and wallet providers |
| Embedded wallet/WaaS | Privy, Crossmint, Turnkey, Coinbase CDP, Dynamic | Login, wallets, key management, smart accounts, policies and transactions | Credential lifecycle, issuer trust, status and counterparty acceptance |
| Digital identity/VC | SpruceID, Trinsic, cheqd and EUDI ecosystem participants | DIDs, VCs, issuance, presentation and trust/status | Smart-account controls, transaction policy and on-chain risk context |
| Blockchain compliance/KYT | Chainalysis, TRM, Elliptic and similar providers | Address screening, transaction risk, monitoring and investigations | A signed, portable identity/control object that links a business to wallets and policies |

This fragmentation is the opportunity and also the integration risk. A new
company will not win by replacing every provider. It should orchestrate them
behind an open credential and policy boundary.

Relevant public examples include [Blockpass reusable KYC/KYB](https://www.blockpass.org/reusable-kyc-and-kyb/),
[Sumsub reusable KYC](https://sumsub.com/reusable-kyc/), [Privy embedded
wallets](https://docs.privy.io/wallets/overview/embedded), [Crossmint
credentials](https://www.crossmint.com/products/verifiable-credentials),
[Turnkey](https://www.turnkey.com/), [Coinbase CDP wallets](https://docs.cdp.coinbase.com/wallets/non-custodial-wallets/overview),
[SpruceID](https://spruceid.com/learn/proving-id), [Trinsic](https://trinsic.id/),
and [cheqd](https://cheqd.io/).

## The proposed product category

The most precise category is:

**Portable business trust wallet** = smart account + encrypted credential
vault + issuer/verifier network + policy engine + KYT connectors.

It is not merely:

- a consumer wallet;
- an NFT wallet;
- a KYC vendor;
- a credential issuer;
- a custodial account API; or
- a blockchain analytics dashboard.

### Core objects

The wallet should hold or reference a graph of signed, versioned objects:

1. **Organisation identity:** legal entity, jurisdiction, registration,
   business activity and organisation DID.
2. **Controller evidence:** directors, UBOs, authorised representatives and
   their relationship to the organisation.
3. **Regulatory evidence:** licence, VASP/PSP status, permissions, expiry and
   issuer trust.
4. **Risk evidence:** sanctions/PEP result, source-of-funds result, risk
   assessment method/version and assessment timestamp.
5. **Wallet-control evidence:** proof that a DID, person or authorised signer
   controls a particular smart account, without exposing private keys.
6. **Mandates and policies:** who may act, on which chains, contracts, assets,
   amounts, jurisdictions and time windows.
7. **KYT observations:** transaction and counterparty events, alerts,
   dispositions and re-screening triggers. These should normally remain with
   the compliance operator, with only bounded attestations shared.

The credential should describe **who assessed what, under which policy, at what
time, with what freshness and status**. A bare “low risk” token is not a useful
portable compliance object.

## How the reusable flow would work

```text
KYC/KYB/KYT providers
          |
          v
Issuer / compliance operator -- signs --> organisation credential set
          |                                      |
          |                                      v
          +------------------------------> Universal Smart Wallet
                                                 |
                      +--------------------------+-------------------------+
                      |                            |                        |
                verifier policy              smart-account policy      encrypted vault
                      |                            |                        |
                      v                            v                        v
                 accept/review               allow/block action       private VC payloads
```

A counterparty does not blindly accept a wallet because it contains a
credential. It evaluates:

1. issuer trust and legal role;
2. credential schema, signature, status and freshness;
3. subject-to-wallet and signer-control binding;
4. its own jurisdiction, product and risk policy;
5. current sanctions, fraud and KYT signals;
6. transaction-specific limits and escalation rules.

If the result is stale, unknown or contradictory, the wallet must return
`indeterminate` or require a new check. It must never turn an old credential
into permanent approval.

## Best initial wedge

The strongest first market is not general consumer identity. It is:

### B2B stablecoin and digital-asset operations

**Buyer:** a regulated or compliance-sensitive PSP, VASP, treasury platform,
tokenisation platform or B2B marketplace.

**Problem:** the same business, controllers and wallet permissions are checked
repeatedly by every counterparty, while every new transfer still needs KYT and
policy evaluation.

**Product:** issue an organisation credential bundle, bind it to a smart
account and expose a verifier/policy API. The business presents only the claims
needed by the next counterparty, while the platform continuously monitors
transactions and revokes or downgrades permissions when conditions change.

**Why this wedge:** the buyer already pays for compliance, the cost of
repeated onboarding is visible, and the smart account gives the credential a
real enforcement point instead of making it a passive profile.

Other promising segments:

- tokenised funds and RWA distribution;
- B2B marketplaces with escrow and payouts;
- crypto payment processors and merchant networks;
- treasury/expense wallets with delegated employees or agents;
- agentic commerce where autonomous software needs bounded authority.

## Competitive assessment

| Dimension | Existing market | Opportunity for Universal Smart Wallet |
| --- | --- | --- |
| Wallet creation | Mature and crowded | Do not compete on wallet creation alone |
| KYC/KYB checks | Mature, provider-specific | Integrate providers and make results portable |
| Reusable KYC | Emerging, usually network/vendor bound | Open VC and proof-of-control format across providers |
| KYT | Mature but continuously provider-side | Bind KYT events to wallet policies and revocation |
| Credential wallet | Identity vendors and public-wallet initiatives | Add smart-account execution, delegation and recovery |
| Business wallet | Emerging with EUDI direction | Combine legal-entity credentials with programmable on-chain controls |
| Self-hosting | Limited in hosted WaaS | Offer deployment-neutral issuer, verifier and wallet service ports |
| Interoperability | Standards exist, adoption fragmented | Make OpenID4VCI/VP, SD-JWT VC and status replaceable adapters |

The closest conceptual competitors are **Crossmint + credential issuance**,
**Blockpass/Sumsub + reusable verification**, and a future combination of
**Privy/Turnkey + a credential network**. The product should expect these
players to converge. The defensible part cannot be a UI; it must be the policy,
credential, portability and verifier network data model.

## Regulatory and trust constraints

This product must be designed as a compliance-enablement layer, not as a way
to outsource legal responsibility:

- A relying institution retains responsibility for its own CDD/KYB decision.
- Third-party reliance requires a documented legal and operational basis.
- KYT and sanctions screening remain continuous or event-triggered.
- Credentials need issuer trust, status, expiry, evidence provenance and
  revocation.
- A smart-account address is not proof of legal identity without a binding
  credential and a trusted issuer.
- GDPR/data-protection controls require minimisation, purpose limitation,
  retention rules and a plan for deletion or re-issuance.
- Risk scores should not be presented as universal truth; include method,
  timestamp, jurisdiction, policy and confidence/freshness.
- A wallet provider must not become an irremovable owner merely because it
  performed login or issued a session signer.

## Business model hypothesis

Start with B2B infrastructure pricing rather than a consumer wallet fee:

- platform fee for issuer/verifier/policy operations;
- per active organisation or wallet-control binding;
- per credential issuance/verification/presentation;
- per monitored wallet or transaction volume;
- optional enterprise fee for self-hosted support, compliance connectors and
  audit exports.

Do not sell “compliance approval” as an asset. Sell faster onboarding,
portable evidence, lower duplicate verification cost and enforceable policy.

## 90-day validation plan

### Phase 1: falsify the problem (weeks 1–3)

Interview 10–15 compliance/product leaders at PSPs, VASPs, tokenisation
platforms and B2B marketplaces. Measure:

- how often the same entity is re-verified;
- time and cost per KYB/KYC cycle;
- which evidence counterparties accept from one another;
- which changes trigger a mandatory re-check;
- the cost of false positives and manual review;
- whether the buyer would trust an external issuer or only its own check.

**Stop condition:** fewer than three buyers report repeated verification as a
material cost or no buyer can legally rely on another issuer's evidence.

### Phase 2: prove the protocol (weeks 4–7)

Build a narrow pilot:

1. one KYB/KYC provider adapter;
2. one issuer organisation;
3. one Universal Smart Wallet organisation profile;
4. one smart-account proof-of-control;
5. one verifier API;
6. one KYT adapter with a deny/review/allow policy;
7. revocation and material-change re-check flows.

Use synthetic data first, then a supervised sandbox with a real compliance
partner. Do not claim regulatory reliance until counsel and the regulated
customer approve the operating model.

### Phase 3: prove economic value (weeks 8–12)

Run the same business through two or more counterparties and compare:

- onboarding time and completion rate;
- duplicate document collection;
- manual review minutes;
- accepted credential/presentation rate;
- time to revoke or downgrade permissions;
- false-positive and false-negative review outcomes;
- percentage of transactions automatically policy-approved;
- portability when changing wallet/auth/provider infrastructure.

The product earns the right to scale only if it reduces repeated onboarding
without increasing unresolved risk or regulatory exceptions.

## Decision

**Proceed, but narrow the positioning.** The strongest claim is:

> Universal Smart Wallet gives businesses a portable, verifiable trust profile
> and a programmable transaction-control account, so counterparties can make
> faster, policy-scoped decisions without treating every interaction as a
> blank slate.

Avoid:

- “KYC once, forever”;
- “one global identity accepted everywhere”;
- “the wallet replaces compliance teams”;
- “a DID or address proves legal identity”; or
- “a credential guarantees a safe transaction.”

The next concrete product task is a **B2B compliance-wallet pilot** with one
regulated customer, one identity/KYB issuer, one KYT provider and two
counterparties. That will test the actual network effect rather than another
demo wallet.
