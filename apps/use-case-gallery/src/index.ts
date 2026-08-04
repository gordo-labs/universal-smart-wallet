import { prepareErc20Mint, prepareErc721Mint, prepareErc1155Mint, prepareErc20Transfer, type WalletAction } from '@ssw/wallet-actions';
import { createPlatformFixture, type PlatformFixture } from '@ssw/test-fixtures';

export type GalleryCase = 'passkey' | 'email' | 'social' | 'enterprise' | 'loyalty-token' | 'nft-mint' | 'credential-access' | 'did-binding' | 'recovery' | 'vendor-rotation' | 'export-import';
export type GalleryExample = { readonly id: GalleryCase; readonly title: string; readonly adminPath: string; readonly success: string; readonly failure: { readonly trigger: string; readonly recovery: string } };

export const USE_CASES: readonly GalleryExample[] = [
  ['passkey', 'Passkey sign-in', 'passkey', 'Authenticate with user verification required.', 'Unsupported authenticator', 'Offer email/recovery step-up.'],
  ['email', 'Email OTP', 'email', 'Issue a short-lived operational session.', 'Expired or replayed OTP', 'Request a fresh challenge.'],
  ['social', 'Social login', 'social', 'Link an OIDC identity after state/nonce checks.', 'Issuer or nonce mismatch', 'Abort callback and restart login.'],
  ['enterprise', 'Enterprise provisioning', 'enterprise', 'Provision a tenant-scoped wallet.', 'Tenant policy denies request', 'Retry with an authorized tenant.'],
  ['loyalty-token', 'Loyalty ERC-20', 'tokens', 'Prepare a simulated ERC-20 mint/transfer.', 'Simulation or signer policy denial', 'Show policy reason and do not submit.'],
  ['nft-mint', 'NFT / ERC-1155 mint', 'nfts', 'Prepare a bounded NFT mint action.', 'Untrusted target or invalid token id', 'Reject before signing.'],
  ['credential-access', 'Credential-gated access', 'credentials', 'Present only a synthetic derived claim.', 'Expired/replayed challenge', 'Create a new verifier challenge.'],
  ['did-binding', 'Default private DID', 'identity', 'Bind a pairwise holder identifier to the wallet DID.', 'Unsupported DID method', 'Keep the wallet local and ask for a supported method.'],
  ['recovery', 'Recovery', 'recovery', 'Perform a step-up recovery ceremony.', 'Insufficient recovery factors', 'Require an additional factor.'],
  ['vendor-rotation', 'Vendor rotation', 'portability', 'Rotate control without changing the DID.', 'Non-portable vendor capability', 'Fail closed and retain old control.'],
  ['export-import', 'Export / import', 'portability', 'Transfer an encrypted migration bundle.', 'Tampered or expired bundle', 'Abort import and keep the source wallet.'],
].map(([id, title, adminPath, success, trigger, recovery]) => ({ id: id as GalleryCase, title, adminPath: `/admin/${adminPath}`, success, failure: { trigger, recovery } }));

const recipient = '0x2222222222222222222222222222222222222222' as const;
const token = '0x3333333333333333333333333333333333333333' as const;

export function cleanFixture(): PlatformFixture { return createPlatformFixture(); }

/** Return the public SDK action represented by an executable recipe. */
export function prepareExampleAction(id: GalleryCase, fixture = cleanFixture()): WalletAction | undefined {
  if (fixture.wallet.chainId === 1) throw new Error('gallery fixtures cannot target mainnet');
  switch (id) {
    case 'loyalty-token': return prepareErc20Transfer({ chainId: fixture.wallet.chainId, target: token, recipient, amount: 10n });
    case 'nft-mint': return prepareErc721Mint({ chainId: fixture.wallet.chainId, target: token, recipient, tokenId: 1n });
    case 'export-import': return prepareErc1155Mint({ chainId: fixture.wallet.chainId, target: token, recipient, tokenId: 1n, amount: 1n });
    default: return undefined;
  }
}

export function runExample(id: GalleryCase): { readonly ok: true; readonly fixture: PlatformFixture; readonly action?: WalletAction; readonly example: GalleryExample } {
  const fixture = cleanFixture();
  const example = USE_CASES.find((item) => item.id === id);
  if (!example) throw new Error('unknown gallery case');
  return { ok: true, fixture, action: prepareExampleAction(id, fixture), example };
}

export function reset(): PlatformFixture { return cleanFixture(); }
