export type RuntimeEnvironment = 'local' | 'testnet';
export interface HealthStatus {
  readonly name: string;
  readonly ok: true;
}
export const foundationHealth = (name: string): HealthStatus => ({
  name,
  ok: true,
});
