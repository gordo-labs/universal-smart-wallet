export * from './generated.js';
export * from './core.js';
import { WalletClient } from './core.js';
export { WalletClient };
export const createBrowserWalletClient = (options: import('./core.js').ClientOptions) => new WalletClient(options);
