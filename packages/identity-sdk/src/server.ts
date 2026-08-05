export * from './generated.js';
export * from './core.js';

import { IdentityClient } from './core.js';
import type { ServerIdentityClientOptions } from './core.js';

export { IdentityClient };
export const createServerIdentityClient = (
  options: ServerIdentityClientOptions,
): IdentityClient =>
  new IdentityClient({
    ...options,
    headers: {
      ...options.headers,
      authorization: `ApiKey ${options.apiKey}`,
    },
  });
