export const adapterName = 'account-adapter';

export const ENTRY_POINT_V08 =
  '0x4337084d9e255ff0702461cf8895ce9e3b5ff108' as const;

export type AccountDeployment = {
  chainId: number;
  account: `0x${string}`;
  accountCodeHash: `0x${string}`;
  entryPoint: `0x${string}`;
  entryPointVersion: '0.8.0';
};

/** Validate deployment metadata before an adapter trusts an address. */
export function assertDeployment(deployment: AccountDeployment): void {
  if (!Number.isSafeInteger(deployment.chainId) || deployment.chainId <= 0) {
    throw new Error('invalid chain id');
  }
  if (
    !/^0x[0-9a-fA-F]{40}$/.test(deployment.account) ||
    /^0x0+$/.test(deployment.account)
  ) {
    throw new Error('account address is required');
  }
  if (
    !/^0x[0-9a-fA-F]{64}$/.test(deployment.accountCodeHash) ||
    /^0x0+$/.test(deployment.accountCodeHash)
  ) {
    throw new Error('account code hash is required');
  }
  if (deployment.entryPoint.toLowerCase() !== ENTRY_POINT_V08) {
    throw new Error('incompatible EntryPoint 0.8 deployment');
  }
  if (deployment.entryPointVersion !== '0.8.0') {
    throw new Error('unsupported EntryPoint version');
  }
}

export const selectedBase = {
  name: 'Safe smart account',
  package: '@safe-global/protocol-kit',
  version: '8.0.4',
  license: 'MIT',
  supports: ['ERC-1271', 'ERC-4337', 'passkey signer path'] as const,
};
