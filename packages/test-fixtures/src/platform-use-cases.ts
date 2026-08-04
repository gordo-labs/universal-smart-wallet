import { createPrivateDidLifecycle, type PrivateDidLifecycle } from '@ssw/identity-adapter';

/** A deterministic, valueless account used by the executable gallery. */
export const SYNTHETIC_PLATFORM_ACCOUNT = '0x1111111111111111111111111111111111111111' as const;
export const SYNTHETIC_PLATFORM_CHAIN_ID = 84532 as const; // Base Sepolia only.

export type PlatformFixture = {
  readonly version: 'ssw-platform-fixture-v1';
  readonly wallet: { readonly address: `0x${string}`; readonly chainId: number; readonly did: string };
  readonly identity: PrivateDidLifecycle;
  readonly balances: Readonly<Record<'native' | 'loyalty', bigint>>;
  readonly minted: readonly string[];
  readonly authenticated: boolean;
  readonly events: readonly string[];
  reset(): PlatformFixture;
};

export type PlatformFixtureOptions = { readonly now?: number };

/**
 * Build a clean fixture for one gallery recipe. No RPC, issuer, vendor or
 * customer data is involved. The address and chain are intentionally fixed
 * to a non-mainnet test profile.
 */
export function createPlatformFixture(_options: PlatformFixtureOptions = {}): PlatformFixture {
  const identity = createPrivateDidLifecycle({ chainId: SYNTHETIC_PLATFORM_CHAIN_ID, address: SYNTHETIC_PLATFORM_ACCOUNT });
  const state = {
    version: 'ssw-platform-fixture-v1' as const,
    wallet: { address: SYNTHETIC_PLATFORM_ACCOUNT, chainId: SYNTHETIC_PLATFORM_CHAIN_ID, did: identity.did.did },
    identity,
    balances: { native: 10n, loyalty: 1_000n } as const,
    minted: [] as string[],
    authenticated: false,
    events: [] as string[],
  };
  const snapshot = (): PlatformFixture => ({
    ...state,
    balances: { ...state.balances },
    minted: [...state.minted],
    events: [...state.events],
    reset: () => createPlatformFixture(),
  });
  return snapshot();
}

export function resetPlatformFixture(_fixture?: PlatformFixture): PlatformFixture {
  return createPlatformFixture();
}
