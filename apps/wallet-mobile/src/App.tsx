/**
 * Minimal Expo entrypoint. The production shell injects native ports into
 * MobileWalletController; keeping this module side-effect free prevents a
 * test/export process from requesting camera, passkey, or storage access.
 */
export default function App(): null {
  return null;
}
