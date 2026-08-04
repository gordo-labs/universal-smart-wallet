import { USE_CASES } from '../src/index';
export default function Page() {
  return <><h1>Wallet Platform use-case gallery</h1><p>Synthetic Base Sepolia recipes using public SDK boundaries.</p><ul>{USE_CASES.map((item) => <li key={item.id}><a href={item.adminPath}>{item.title}</a> — {item.success} Failure: {item.failure.trigger}; {item.failure.recovery}</li>)}</ul></>;
}
