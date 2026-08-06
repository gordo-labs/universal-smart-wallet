'use client';

import type { ReactNode } from 'react';
import type { RedactedAuditEvent } from './redacted-audit';
import type { SignerHealth, SignerRotationRequest } from './signer-operations';
import type { TrustStatusRecord } from './trust-status';

export interface SignerOperationsPanelProps {
  readonly signers: readonly SignerHealth[];
  readonly rotations?: readonly SignerRotationRequest[];
  readonly onRequestRotation?: (signer: SignerHealth) => void;
}

export function SignerOperationsPanel({ signers, rotations = [], onRequestRotation }: SignerOperationsPanelProps) {
  return (
    <section className="card" aria-labelledby="signer-operations-heading">
      <h2 id="signer-operations-heading">Signer operations</h2>
      <p className="muted">Health and lifecycle metadata only. Key material is never readable.</p>
      <table>
        <thead><tr><th>Signer</th><th>Provider</th><th>Version</th><th>Health</th><th>Lifecycle</th><th>Action</th></tr></thead>
        <tbody>{signers.map((signer) => (
          <tr key={signer.signerId}>
            <td><code>{signer.signerId}</code></td>
            <td>{signer.provider}</td>
            <td><code>{signer.keyVersion}</code></td>
            <td>{signer.health}</td>
            <td>{signer.lifecycle}</td>
            <td><button type="button" onClick={() => onRequestRotation?.(signer)} disabled={!onRequestRotation || signer.lifecycle === 'disabled'}>Request rotation</button></td>
          </tr>
        ))}</tbody>
      </table>
      {rotations.length > 0 && <p className="muted" role="status">{rotations.length} rotation request(s) · ambiguous results are blocked.</p>}
    </section>
  );
}

export function TrustStatusPanel({ records }: { readonly records: readonly TrustStatusRecord[] }) {
  return (
    <section className="card" aria-labelledby="trust-status-heading">
      <h2 id="trust-status-heading">Trust and status</h2>
      <p className="muted">Unknown or stale trust is never shown as active.</p>
      <ul>{records.map((record) => <li key={`${record.authorityId}:${record.profileId}`}><code>{record.authorityId}</code> · {record.profileId} · <strong>{record.effective}</strong> · {record.active ? 'active' : 'inactive'}</li>)}</ul>
    </section>
  );
}

export function RedactedAuditExplorer({ events, emptyState = 'No redacted audit events.' }: { readonly events: readonly RedactedAuditEvent[]; readonly emptyState?: ReactNode }) {
  return (
    <section className="card" aria-labelledby="issuer-audit-heading">
      <h2 id="issuer-audit-heading">Issuer audit</h2>
      <p className="muted">Tenant-scoped events. Credential payloads, evidence, and personal data are filtered.</p>
      {events.length === 0 ? <p>{emptyState}</p> : <table><thead><tr><th>At</th><th>Action</th><th>Outcome</th><th>Actor</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{new Date(event.at).toISOString()}</td><td>{event.action}</td><td>{event.outcome}</td><td><code>{event.actorRef}</code></td></tr>)}</tbody></table>}
    </section>
  );
}

export function IssuerSecurityAdministration(props: SignerOperationsPanelProps & { readonly trust: readonly TrustStatusRecord[]; readonly audit: readonly RedactedAuditEvent[] }) {
  return <><SignerOperationsPanel {...props} /><TrustStatusPanel records={props.trust} /><RedactedAuditExplorer events={props.audit} /></>;
}

