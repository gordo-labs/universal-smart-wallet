import { describe, expect, it, vi } from 'vitest';
import {
  HolderIdentityStudioController,
  reviewCredentialOffer,
} from '../src/identity-studio.ts';

const trustedOffer = {
  credential_issuer: 'https://issuer.example.test',
  credential_configuration_ids: ['UniversityEnrollmentCredential'],
  expires_in: 60,
};

const credential = {
  credentialId: 'credential-1',
  format: 'sd-jwt-vc',
  artifact: {
    format: 'sd-jwt-vc',
    profile: 'unknown',
    version: 'unknown',
    mediaType: 'application/octet-stream',
    kind: 'credential',
    value: 'synthetic',
  },
  issuer: trustedOffer.credential_issuer,
  assurance: 'institutional',
  status: 'active',
  createdAt: 1,
};

const client = () => ({
  acceptOffer: vi.fn(async () => credential),
});

describe('holder identity studio', () => {
  it('exposes trust, assurance, status and expiry before storage', () => {
    const review = reviewCredentialOffer(trustedOffer, {
      trustedIssuers: [trustedOffer.credential_issuer],
      now: 1_000,
    });
    expect(review).toMatchObject({
      issuerTrust: 'trusted',
      assurance: 'institutional',
      status: 'not_stored',
      expiresAt: 61_000,
    });
  });

  it('cancelling an offer performs no client or vault call', () => {
    const fake = client();
    const controller = new HolderIdentityStudioController(fake, [trustedOffer.credential_issuer], () => 1_000);
    controller.reviewOffer(trustedOffer);
    controller.cancelOffer();
    expect(controller.pendingReview).toBeUndefined();
    expect(fake.acceptOffer).not.toHaveBeenCalled();
  });

  it('requires an explicit acknowledgement for an unknown issuer', async () => {
    const fake = client();
    const controller = new HolderIdentityStudioController(fake, [], () => 1_000);
    const review = controller.reviewOffer(trustedOffer);
    expect(review.issuerTrust).toBe('unknown');
    await expect(controller.acceptReviewedOffer(review, { confirm: true })).rejects.toMatchObject({ code: 'UNKNOWN_ISSUER' });
    expect(fake.acceptOffer).not.toHaveBeenCalled();
  });

  it('accepts only the reviewed offer after explicit confirmation', async () => {
    const fake = client();
    const controller = new HolderIdentityStudioController(fake, [trustedOffer.credential_issuer], () => 1_000);
    const review = controller.reviewOffer(trustedOffer);
    await controller.acceptReviewedOffer(review, { confirm: true });
    expect(fake.acceptOffer).toHaveBeenCalledTimes(1);
    expect(controller.pendingReview).toBeUndefined();
  });
});
