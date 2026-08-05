'use client';

import { useState } from 'react';

type TemplateStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'deprecated';

const nextStatus: Partial<Record<TemplateStatus, TemplateStatus>> = {
  draft: 'in_review',
  in_review: 'approved',
  approved: 'published',
  published: 'deprecated',
};

/** A small, accessible reference screen backed by the same admin invariants. */
export function InstitutionalIssuerAdmin() {
  const [status, setStatus] = useState<TemplateStatus>('draft');
  const immutable = status === 'published' || status === 'deprecated';
  const action = nextStatus[status];

  return (
    <section className="card" aria-labelledby="identity-admin-heading">
      <h2 id="identity-admin-heading">Institutional issuer</h2>
      <p className="muted">Tenant: demo-university · Role: institutional-admin</p>
      <div className="grid">
        <div>
          <h3>Credential templates</h3>
          <p>
            <code>enrollment-card v1</code> · <span role="status">{status}</span>
          </p>
          <p className="muted">UniversityEnrollmentCredential · SD-JWT VC</p>
          <button
            type="button"
            disabled={!action}
            onClick={() => action && setStatus(action)}
            aria-label={action ? `Move template to ${action}` : 'Template lifecycle complete'}
          >
            {action ? `Mark ${action.replace('_', ' ')}` : 'Lifecycle complete'}
          </button>
          {immutable && (
            <p className="muted">Published payload is immutable; create a new version to edit.</p>
          )}
        </div>
        <div>
          <h3>Signer configuration</h3>
          <dl>
            <dt>Provider</dt><dd>AWS KMS</dd>
            <dt>Key reference</dt><dd><code>arn:aws:kms:…:key/opaque-ref</code></dd>
            <dt>Algorithm / version</dt><dd>ES256 / v1 · standby</dd>
          </dl>
          <p className="muted">Private key material and provider credentials are never readable.</p>
        </div>
      </div>
    </section>
  );
}

