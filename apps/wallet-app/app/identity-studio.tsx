'use client';

import { useMemo, useState } from 'react';
import type { CredentialInspection } from '@ssw/credential-formats';
import type {
  CredentialOffer,
  HolderCredentialClient,
  HolderCredentialSummary,
} from '@ssw/identity-sdk/holder';
import {
  HolderIdentityStudioController,
  credentialViews,
  inspectionView,
  reviewCredentialOffer,
  type CredentialOfferReview,
} from '../src/identity-studio';

type IdentityStudioProps = {
  readonly client: HolderCredentialClient;
  readonly trustedIssuers?: readonly string[];
};

const exampleOffer = JSON.stringify(
  {
    credential_issuer: 'https://issuer.example.test',
    credential_configuration_ids: ['UniversityEnrollmentCredential'],
    expires_in: 900,
  },
  null,
  2,
);

const formatExpiry = (expiresAt?: number): string =>
  expiresAt ? new Date(expiresAt).toLocaleString() : 'No offer expiry supplied';

export function IdentityStudio({ client, trustedIssuers = [] }: IdentityStudioProps) {
  const controller = useMemo(
    () => new HolderIdentityStudioController(client, trustedIssuers),
    [client, trustedIssuers],
  );
  const [offerInput, setOfferInput] = useState(exampleOffer);
  const [review, setReview] = useState<CredentialOfferReview>();
  const [credentials, setCredentials] = useState<readonly HolderCredentialSummary[]>([]);
  const [selected, setSelected] = useState<string>();
  const [inspection, setInspection] = useState<CredentialInspection>();
  const [acknowledgeUnknown, setAcknowledgeUnknown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();

  const refresh = async () => setCredentials(await client.list());
  const reviewOffer = () => {
    setError(undefined);
    setNotice(undefined);
    try {
      setReview(controller.reviewOffer(offerInput));
      setAcknowledgeUnknown(false);
    } catch {
      setError('This offer cannot be reviewed. Check its issuer and expiry.');
    }
  };
  const cancelOffer = () => {
    controller.cancelOffer();
    setReview(undefined);
    setAcknowledgeUnknown(false);
    setNotice('Offer cancelled. Nothing was written to the encrypted vault.');
    setError(undefined);
  };
  const acceptOffer = async () => {
    if (!review) return;
    setBusy(true);
    setError(undefined);
    try {
      await controller.acceptReviewedOffer(review, {
        confirm: true,
        acknowledgeUnknownIssuer: acknowledgeUnknown,
      });
      setReview(undefined);
      setAcknowledgeUnknown(false);
      await refresh();
      setNotice('Credential accepted into the client-encrypted vault.');
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      setError(
        code === 'UNKNOWN_ISSUER'
          ? 'Acknowledge the unknown issuer explicitly before accepting.'
          : 'The credential could not be accepted.'
      );
    } finally {
      setBusy(false);
    }
  };
  const inspect = async (credentialId: string) => {
    setSelected(credentialId);
    setInspection(undefined);
    setError(undefined);
    try {
      const result = await client.inspect(credentialId);
      setInspection(result);
    } catch {
      setError('Credential details are unavailable until the encrypted vault is unlocked.');
    }
  };

  const views = credentialViews(credentials, trustedIssuers);
  const selectedView = views.find(view => view.summary.credentialId === selected);
  const selectedInspection = selectedView && inspection
    ? inspectionView(selectedView.summary, inspection, trustedIssuers)
    : undefined;

  return (
    <section className="identity-studio" aria-labelledby="identity-studio-title">
      <div className="studio-heading">
        <div>
          <p className="eyebrow">IDENTITY STUDIO · HOLDER</p>
          <h2 id="identity-studio-title">Credential inbox</h2>
          <p>Review trust, assurance, status and expiry before anything enters your vault.</p>
        </div>
        <span className="vault-badge">Client-encrypted vault</span>
      </div>

      <div className="studio-grid">
        <article className="studio-card">
          <div className="card-heading"><h3>Incoming offer</h3><span>Nothing is stored during review</span></div>
          <label htmlFor="credential-offer">OpenID4VCI offer</label>
          <textarea
            id="credential-offer"
            value={offerInput}
            onChange={event => setOfferInput(event.target.value)}
            spellCheck={false}
            rows={8}
          />
          <div className="button-row">
            <button className="secondary" onClick={reviewOffer}>Review offer</button>
            {review && <button className="ghost" onClick={cancelOffer}>Cancel</button>}
          </div>
          {review && (
            <div className="review-panel" aria-live="polite">
              <div className="review-title"><strong>Before acceptance</strong><span>{review.issuerTrust}</span></div>
              <dl className="review-facts">
                <div><dt>Issuer</dt><dd>{review.issuer}</dd></div>
                <div><dt>Assurance</dt><dd>{review.assurance}</dd></div>
                <div><dt>Status</dt><dd>{review.status.replace('_', ' ')}</dd></div>
                <div><dt>Offer expiry</dt><dd>{formatExpiry(review.expiresAt)}</dd></div>
                <div><dt>Credential type</dt><dd>{review.credentialConfigurations.join(', ') || 'Not supplied'}</dd></div>
              </dl>
              {review.warning && (
                <label className="warning-check">
                  <input
                    type="checkbox"
                    checked={acknowledgeUnknown}
                    onChange={event => setAcknowledgeUnknown(event.target.checked)}
                  />
                  <span>{review.warning} I understand this issuer is not trusted yet.</span>
                </label>
              )}
              <button className="primary" disabled={busy || (review.issuerTrust === 'unknown' && !acknowledgeUnknown)} onClick={acceptOffer}>
                {busy ? 'Accepting…' : 'Accept into vault'}
              </button>
            </div>
          )}
        </article>

        <article className="studio-card">
          <div className="card-heading"><h3>Your credentials</h3><button className="ghost" onClick={refresh}>Refresh</button></div>
          {credentials.length === 0 ? (
            <p className="empty">No credentials stored. Review an offer above to begin.</p>
          ) : (
            <div className="credential-list">
              {views.map(view => (
                <button className={`credential-row${selected === view.summary.credentialId ? ' selected' : ''}`} key={view.summary.credentialId} onClick={() => inspect(view.summary.credentialId)}>
                  <span><strong>{view.summary.credentialId}</strong><small>{view.summary.issuer ?? 'Issuer unavailable'}</small></span>
                  <span className={`trust-pill ${view.issuerTrust}`}>{view.issuerTrust}</span>
                </button>
              ))}
            </div>
          )}
          {selectedInspection && (
            <div className="inspection-panel" aria-live="polite">
              <div className="card-heading"><h3>Trust inspector</h3><span>{selectedInspection.issuerTrust}</span></div>
              <dl className="review-facts">
                <div><dt>Assurance</dt><dd>{selectedInspection.assurance}</dd></div>
                <div><dt>Status</dt><dd>{selectedInspection.status}</dd></div>
                <div><dt>Format</dt><dd>{selectedInspection.inspection.format}</dd></div>
                <div><dt>Holder binding</dt><dd>{selectedInspection.inspection.holderBound ? 'present' : 'missing'}</dd></div>
                <div><dt>Types</dt><dd>{selectedInspection.inspection.credentialTypes.join(', ') || 'Not disclosed'}</dd></div>
              </dl>
              <p className="privacy-note">The credential artifact stays encrypted; this screen only renders metadata and inspection results.</p>
            </div>
          )}
        </article>
      </div>
      {notice && <p className="success" role="status">{notice}</p>}
      {error && <p className="warning" role="alert">{error}</p>}
      <p className="privacy-note">Presentations are never automatic. A verifier request must be reviewed and approved separately.</p>
    </section>
  );
}
