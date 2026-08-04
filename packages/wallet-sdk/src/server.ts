export * from './generated.js';
export * from './core.js';
import { WalletClient } from './core.js';
export { WalletClient };
export const createServerWalletClient = (options: import('./core.js').ClientOptions & { apiKey: string }) => new WalletClient(options);
