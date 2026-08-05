import { USE_CASES } from '../src/index';
import { UNIVERSITY_GALLERY_CASES } from '../src/sectors/index';
export default function Page() {
  return <><h1>Wallet Platform use-case gallery</h1><p>Synthetic Base Sepolia recipes using public SDK boundaries.</p><ul>{USE_CASES.map((item) => <li key={item.id}><a href={item.adminPath}>{item.title}</a> — {item.success} Failure: {item.failure.trigger}; {item.failure.recovery}</li>)}</ul><h2>University identity</h2><p>Institutional synthetic credentials with explicit registrar boundaries.</p><ul>{UNIVERSITY_GALLERY_CASES.map((item) => <li key={item.id}><a href={item.path}>{item.title}</a> — issuer policy {item.issuerPolicy}; verifier policy {item.verifierPolicy}; {item.authority}</li>)}</ul></>;
}
