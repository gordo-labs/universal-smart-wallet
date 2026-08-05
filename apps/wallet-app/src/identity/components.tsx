'use client';

import { useState, type FormEvent } from 'react';
import type { HolderCredential, HolderCredentialClient, PresentationRequest } from '@ssw/identity-sdk/holder';
import { CredentialActionsController } from './credential-actions';
import { PresentationConsentController } from './presentation-consent';
import { SELF_ATTESTED_WARNING, SelfAttestedEditorController } from './self-attested';

export function SelfAttestedEditor({
  client,
  onCreated,
}: {
  readonly client: HolderCredentialClient;
  readonly onCreated?: (credential: HolderCredential) => void;
}) {
  const controller = new SelfAttestedEditorController(client);
  const [claims, setClaims] = useState([{ name: '', value: '' }]);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    controller.cancel();
    claims.forEach(claim => controller.setClaim(claim.name, claim.value));
    try {
      const credential = await controller.save({ confirm: true });
      setNotice('Self-attested credential created. Its assurance cannot be upgraded.');
      onCreated?.(credential);
    } catch {
      setError('Add unique claim names and confirm the self-attested credential.');
    }
  };
  return (
    <form aria-labelledby="self-attested-title" onSubmit={save}>
      <h3 id="self-attested-title">Create a self-attested credential</h3>
      <p role="note">{SELF_ATTESTED_WARNING}</p>
      {claims.map((claim, index) => (
        <fieldset key={index}>
          <label>Claim name <input value={claim.name} onChange={event => setClaims(next => next.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /></label>
          <label>Claim value <input value={claim.value} onChange={event => setClaims(next => next.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} /></label>
        </fieldset>
      ))}
      <button type="button" onClick={() => setClaims(next => [...next, { name: '', value: '' }])}>Add claim</button>
      <button type="submit">Create self-attested credential</button>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export function PresentationConsentPanel({
  client,
  request,
  onPresented,
}: {
  readonly client: HolderCredentialClient;
  readonly request: PresentationRequest;
  readonly onPresented?: (result: unknown) => void;
}) {
  const controller = new PresentationConsentController(client);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [error, setError] = useState<string>();
  const toggle = (claim: string, accepted: boolean) => {
    controller.begin(request);
    selected.forEach(item => controller.setClaimConsent(item, true));
    controller.setClaimConsent(claim, accepted);
    setSelected(controller.preview.claims);
  };
  const submit = async () => {
    controller.begin(request);
    selected.forEach(item => controller.setClaimConsent(item, true));
    try {
      onPresented?.(await controller.submit({ confirm: true }));
      setSelected([]);
    } catch {
      setError('Select and confirm the exact claims to disclose.');
    }
  };
  return (
    <section aria-labelledby="presentation-consent-title">
      <h3 id="presentation-consent-title">Review presentation</h3>
      <p>Audience: <code>{request.audience}</code></p>
      <p>Exact disclosures preview:</p>
      <ul>{request.claims.map(claim => <li key={claim}><label><input type="checkbox" checked={selected.includes(claim)} onChange={event => toggle(claim, event.target.checked)} />{claim}</label></li>)}</ul>
      <button type="button" onClick={submit}>Present selected claims</button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export function CredentialActionsPanel({
  client,
  credentialId,
}: {
  readonly client: HolderCredentialClient;
  readonly credentialId: string;
}) {
  const actions = new CredentialActionsController(client);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const remove = async () => {
    if (!window.confirm('Delete this credential permanently from the encrypted vault?')) return;
    try { await actions.delete(credentialId, { confirm: true }); setNotice('Credential deleted.'); } catch { setError('Credential could not be deleted.'); }
  };
  const exportVault = async () => {
    if (!window.confirm('Export encrypted credential data?')) return;
    try { const bytes = await actions.exportEncrypted({ confirm: true, credentialIds: [credentialId] }); setNotice(`Encrypted export ready (${bytes.byteLength} bytes).`); } catch { setError('Export was refused because it was not encrypted.'); }
  };
  return <div><button type="button" onClick={remove}>Delete credential</button><button type="button" onClick={exportVault}>Export encrypted backup</button>{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}</div>;
}
