export * from './generated.js';
export * from './core.js';
export * from './holder/index.js';

import { IdentityClient } from './core.js';
import type { IdentityClientOptions } from './core.js';

export { IdentityClient };
export const createBrowserIdentityClient = (
  options: IdentityClientOptions,
): IdentityClient => new IdentityClient(options);

export * from './issuer/browser.js';
export * from './verifier/client.js';
export * from './verifier/types.js';
export * from './scanner/index.js';
