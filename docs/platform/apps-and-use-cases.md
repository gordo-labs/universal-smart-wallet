# Apps and executable use cases

The consumer wallet is [`apps/wallet-app`](../../apps/wallet-app), the tenant
administration console is [`apps/admin-console`](../../apps/admin-console),
and the executable gallery is [`apps/use-case-gallery`](../../apps/use-case-gallery).

The gallery covers passkey, email OTP, social OIDC, enterprise provisioning,
loyalty ERC-20, NFT/1155 minting, credential-gated access, private DID binding,
recovery, vendor rotation and export/import. Each case has success and
fail-closed recovery paths in [`USE_CASES`](../../apps/use-case-gallery/src/index.ts).

| Use case | Admin path | Security expectation |
| --- | --- | --- |
| Create wallet | `/admin/wallets` | opaque locator and default private DID |
| Mint/transfer tokens | `/admin/tokens` | simulate, consent, policy, submit |
| Mint NFTs | `/admin/nfts` | bounded token ID and trusted target |
| Credential access | `/admin/credentials` | pairwise holder and minimal disclosure |
| Recovery | `/admin/recovery` | extra factor and audit event |
| Portability | `/admin/portability` | explicit step-up, encrypted bundle |

```bash
pnpm --filter @ssw/use-case-gallery test
pnpm --filter @ssw/wallet-app test
pnpm --filter @ssw/admin-console test
```

The UI is a reference composition, not a custody provider. Integrators may
install only the modules they need.
