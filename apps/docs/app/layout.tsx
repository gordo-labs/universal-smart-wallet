import type { Metadata } from 'next';
import Link from 'next/link';
import './styles.css';

export const metadata: Metadata = {
  title: 'Sovereign Smart Wallet · Docs',
  description:
    'Architecture and security documentation for the Sovereign Smart Wallet.',
};
const navigation = [
  ['/', 'Overview'],
  ['/architecture', 'Architecture'],
  ['/credentials', 'Credentials'],
  ['/smart-account', 'Smart account'],
  ['/privacy', 'Privacy & ZK'],
  ['/testing', 'Testing'],
  ['/chains', 'Base → Scroll'],
  ['/platform', 'Wallet Platform'],
  ['/identity', 'Institutional identity'],
] as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link className="brand" href="/">
              <span className="brand-mark">◆</span>
              <span>
                Sovereign <em>Smart Wallet</em>
              </span>
            </Link>
            <a
              className="github-link"
              href="https://github.com/gordo-labs/sovereign-smart-wallet"
            >
              GitHub ↗
            </a>
          </header>
          <div className="layout">
            <aside className="sidebar" aria-label="Documentation navigation">
              <p className="eyebrow">Documentation</p>
              <nav>
                {navigation.map(([href, label]) => (
                  <Link key={href} href={href}>
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="sidebar-note">
                <span className="status-dot" />
                <div>
                  <strong>Alpha foundation</strong>
                  <small>Synthetic local/testnet scope</small>
                </div>
              </div>
            </aside>
            <main className="content">{children}</main>
          </div>
          <footer>
            <span>Apache-2.0 · Open source</span>
            <span>Not production-ready · No mainnet</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
