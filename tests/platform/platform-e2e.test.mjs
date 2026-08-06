import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrivateDidLifecycle } from '../../packages/identity-adapter/dist/index.js';
import { InMemoryPlatformStore } from '../../packages/platform-store/dist/index.js';
import { createWalletLocator } from '../../packages/platform-types/dist/index.js';

test('platform vertical slice preserves tenant and private-DID boundaries', async () => {
  const store = new InMemoryPlatformStore();
  const wallet = {
    schemaVersion: 1, walletId: 'wallet-a', tenantId: 'tenant-a',
    locator: await createWalletLocator({ tenantId: 'tenant-a', walletId: 'wallet-a' }),
    chainId: 84532, address: '0x1111111111111111111111111111111111111111', status: 'active',
  };
  await store.put({ tenantId: 'tenant-a' }, 'wallet', wallet);
  assert.equal(await store.get({ tenantId: 'tenant-b' }, 'wallet', 'wallet-a'), undefined);
  const lifecycle = createPrivateDidLifecycle({ chainId: 84532, address: wallet.address });
  assert.equal(lifecycle.created.registeredOnChain, false);
  assert.equal(lifecycle.created.disclosed, false);
  assert.match(lifecycle.did.did, /^did:pkh:eip155:84532:0x/u);
});
