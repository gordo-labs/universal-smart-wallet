import { describe, expect, it, vi } from 'vitest';
import type { HolderCredential, HolderCredentialClient, PresentationRequest } from '@ssw/identity-sdk/holder';
import { CredentialActionsController, isEncryptedEnvelope } from './credential-actions';
import { PresentationConsentController } from './presentation-consent';
import { SELF_ATTESTED_WARNING, SelfAttestedEditorController } from './self-attested';

const credential = (assurance = 'self_attested'): HolderCredential => ({
  credentialId: 'self-1', format: 'sd-jwt-vc', assurance, status: 'active', createdAt: 1,
  artifact: { format: 'sd-jwt-vc', profile: 'unknown', version: 'unknown', mediaType: 'application/octet-stream', kind: 'credential', value: 'synthetic' },
});

const fakeClient = (overrides: Partial<Record<string, unknown>> = {}) => ({
  createSelfAttested: vi.fn(async () => credential()),
  present: vi.fn(async () => ({ verified: true })),
  delete: vi.fn(async () => undefined),
  export: vi.fn(async () => new TextEncoder().encode(JSON.stringify({ schemaVersion: 1, encrypted: [{ iv: [1], ciphertext: [2] }] }))),
  ...overrides,
}) as unknown as HolderCredentialClient;

describe('SSW-070 identity controls', () => {
  it('keeps the self-attested warning permanent and cannot upgrade assurance', async () => {
    const client = fakeClient();
    const controller = new SelfAttestedEditorController(client);
    expect(controller.warning).toBe(SELF_ATTESTED_WARNING);
    controller.setClaim('displayName', 'Synthetic User');
    const created = await controller.save({ confirm: true });
    expect(created.assurance).toBe('self_attested');
    expect((client.createSelfAttested as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({ claims: { displayName: 'Synthetic User' } });
  });

  it('cancellation clears the self-attested draft and disclosure state', async () => {
    const client = fakeClient();
    const editor = new SelfAttestedEditorController(client);
    editor.setClaim('displayName', 'Synthetic User');
    editor.cancel();
    expect(editor.draft.claims).toEqual([]);
    await expect(editor.save({ confirm: true })).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('previews and submits exactly claim-by-claim consent', async () => {
    const client = fakeClient();
    const request: PresentationRequest = { credentialId: 'self-1', claims: ['displayName', 'age'], audience: 'https://verifier.example', nonce: 'nonce', consent: { accepted: true, claims: [] } };
    const controller = new PresentationConsentController(client);
    expect(controller.begin(request).claims).toEqual([]);
    controller.setClaimConsent('displayName', true);
    expect(controller.preview.claims).toEqual(['displayName']);
    await controller.submit({ confirm: true });
    expect((client.present as ReturnType<typeof vi.fn>).mock.calls[0][0].claims).toEqual(['displayName']);
    expect((client.present as ReturnType<typeof vi.fn>).mock.calls[0][0].consent.claims).toEqual(['displayName']);
  });

  it('clears consent when cancelled and requires explicit confirmation', async () => {
    const client = fakeClient();
    const controller = new PresentationConsentController(client);
    controller.begin({ credentialId: 'self-1', claims: ['name'], audience: 'https://verifier.example', nonce: 'nonce', consent: { accepted: true, claims: [] } });
    controller.setClaimConsent('name', true);
    controller.cancel();
    await expect(controller.submit({ confirm: true })).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(client.present).not.toHaveBeenCalled();
  });

  it('requires confirmation for deletion and accepts only encrypted exports', async () => {
    const client = fakeClient();
    const actions = new CredentialActionsController(client);
    await expect(actions.delete('self-1', { confirm: false })).rejects.toMatchObject({ code: 'CONFIRMATION_REQUIRED' });
    await actions.delete('self-1', { confirm: true });
    const exported = await actions.exportEncrypted({ confirm: true });
    expect(isEncryptedEnvelope(exported)).toBe(true);
    const plaintext = fakeClient({ export: vi.fn(async () => new TextEncoder().encode(JSON.stringify({ schemaVersion: 1, credentials: [credential()] }))) });
    await expect(new CredentialActionsController(plaintext).exportEncrypted({ confirm: true })).rejects.toMatchObject({ code: 'PLAINTEXT_EXPORT' });
  });
});
