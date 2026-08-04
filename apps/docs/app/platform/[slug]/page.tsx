import Link from 'next/link';

const pages: Record<string, { title: string; intro: string; bullets: string[]; source: string }> = {
  'typescript-sdk': { title: 'TypeScript and React SDK', intro: 'Provider-neutral composition for browser, server and React integrations.', bullets: ['Wallet lifecycle and opaque tenant-bound locators.', 'Prepare, simulate, authorize and inspect transactions.', 'Passkey, email, OIDC, DID, credential and portability modules are independently injectable.'], source: 'docs/platform/typescript-sdk.md' },
  'rest-api': { title: 'Self-hosted REST API', intro: 'Tenant-scoped OpenAPI 3.1 service with JWT and API-key authentication.', bullets: ['Strict bounded bodies and idempotency keys for writes.', 'Balances, activity, transactions and webhooks are policy-gated.', 'VCs, PII and recovery material never belong in service storage.'], source: 'docs/platform/rest-api.md' },
  'self-hosting': { title: 'Self-hosting, custody and portability', intro: 'Replace SMTP, OIDC, storage, RPC, bundler, paymaster and signer providers without vendor lock-in.', bullets: ['Email is operational custody until a passkey or recovery factor is added.', 'Encrypted AES-GCM migration bundles are signed, expiring and fail closed on tamper.', 'Rotate vendors without changing the Safe address or private DID when capability permits.'], source: 'docs/platform/self-hosting.md' },
  'apps-and-use-cases': { title: 'Apps and use cases', intro: 'Reference consumer wallet, admin console and executable gallery.', bullets: ['Passkey, email, social, enterprise, token, NFT, credential, DID, recovery and migration flows.', 'Each use case includes a success path and a fail-closed recovery path.', 'Synthetic fixtures only; install modules independently.'], source: 'docs/platform/apps-and-use-cases.md' },
  'security-and-operations': { title: 'Security and operations limits', intro: 'Adversarial tests and release gates make boundaries explicit.', bullets: ['Tenant escape, OTP abuse, OIDC SSRF, replay, signer escalation and migration tamper are covered.', 'SSW-025 still needs an explicit non-local testnet run.', 'SSW-027 publication requires human approval; no audit or production claim.'], source: 'docs/platform/security-and-operations.md' },
};

export function generateStaticParams() { return Object.keys(pages).map((slug) => ({ slug })); }

export default async function PlatformGuide({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug] ?? pages['typescript-sdk'];
  return <><header className="page-header"><p className="eyebrow">07 · Wallet Platform</p><h1>{page.title}</h1><p>{page.intro}</p></header><section className="prose"><ul>{page.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul><p>Canonical guide: <code>{page.source}</code></p><Link className="button" href="/platform">← Platform overview</Link></section></>;
}
