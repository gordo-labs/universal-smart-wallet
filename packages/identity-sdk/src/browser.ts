export * from './generated.js';
export * from './core.js';
export * from './holder/index.js';

import { IdentityClient } from './core.js';
import type { IdentityClientOptions } from './core.js';

export { IdentityClient };
export const createBrowserIdentityClient = (
  options: IdentityClientOptions,
): IdentityClient => new IdentityClient(options);
