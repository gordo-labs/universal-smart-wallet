import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const REPORT = resolve(ROOT, 'docs/audit/eudi-haip-readiness.md');
const SECURITY_EVIDENCE = resolve(
  ROOT,
  'docs/audit/identity-platform-security.md',
);

/**
 * This is a readiness inventory, not a standards implementation or a claim
 * that the project satisfies any external profile. Every row must say what
 * local evidence exists or why an external/unimplemented requirement remains.
 */
export const PROFILE_PINS = Object.freeze({
  eudiArf: 'ARF-1.4.0',
  openId4Vci:
    'OpenID4VCI-1.0-final+errata:openid-4-verifiable-credential-issuance-1_0',
  openId4Vp:
    'OpenID4VP-1.0-final+errata:openid-4-verifiable-presentations-1_0+DCQL',
  haip: 'HAIP-1.0-final',
  sdJwt: 'RFC-9901',
  sdJwtVc: 'draft-ietf-oauth-sd-jwt-vc-16;media=dc+sd-jwt;expires=2026-10-26',
  mdoc: 'ISO/IEC-18013-5:2021;ISO/IEC-18013-7:2024',
});

export const REQUIREMENTS = Object.freeze([
  {
    id: 'ARF-ARCH-001',
    standard: 'EUDI ARF',
    version: PROFILE_PINS.eudiArf,
    status: 'tested',
    evidence:
      'SSW-049 issuer-holder-verifier architecture; SSW-063 deterministic journey',
    blocker: '',
  },
  {
    id: 'ARF-PRIV-001',
    standard: 'EUDI ARF',
    version: PROFILE_PINS.eudiArf,
    status: 'tested',
    evidence:
      'SSW-077 redaction and minimum-disclosure tests; receipts contain metadata only',
    blocker: '',
  },
  {
    id: 'ARF-TRUST-001',
    standard: 'EUDI ARF',
    version: PROFILE_PINS.eudiArf,
    status: 'external',
    evidence: '',
    blocker:
      'Member-State trust lists, federation metadata, and authority onboarding are not available in local fixtures.',
  },
  {
    id: 'ARF-ASSURANCE-001',
    standard: 'EUDI ARF',
    version: PROFILE_PINS.eudiArf,
    status: 'external',
    evidence: '',
    blocker:
      'PID/EAA/QEAA legal, identity-proofing, wallet-attestation, and relying-party assessments require external evidence.',
  },
  {
    id: 'ARF-CONFORMANCE-001',
    standard: 'EUDI ARF',
    version: PROFILE_PINS.eudiArf,
    status: 'external',
    evidence: '',
    blocker:
      'The ARF conformance service, test vectors, independent assessment, and target release tag are external inputs.',
  },
  {
    id: 'VCI-CORE-001',
    standard: 'OpenID4VCI',
    version: PROFILE_PINS.openId4Vci,
    status: 'tested',
    evidence:
      'SSW-009/054 bounded metadata, offer, token, credential, and issuer-service tests',
    blocker: '',
  },
  {
    id: 'VCI-HAIP-001',
    standard: 'OpenID4VCI + HAIP',
    version: `${PROFILE_PINS.openId4Vci};${PROFILE_PINS.haip}`,
    status: 'blocked',
    evidence: '',
    blocker:
      'The local flow is a bounded pre-authorized-code slice and does not exercise every HAIP issuance profile option.',
  },
  {
    id: 'VP-CORE-001',
    standard: 'OpenID4VP',
    version: PROFILE_PINS.openId4Vp,
    status: 'tested',
    evidence:
      'SSW-010/056 same-device request, DCQL, nonce/state, direct-post, and redacted receipt tests',
    blocker: '',
  },
  {
    id: 'VP-HAIP-001',
    standard: 'OpenID4VP + HAIP',
    version: `${PROFILE_PINS.openId4Vp};${PROFILE_PINS.haip}`,
    status: 'blocked',
    evidence: '',
    blocker:
      'HAIP wallet/verifier profiles, signed requests, transaction data, and cross-implementation vectors are not fully exercised.',
  },
  {
    id: 'HAIP-TRUST-001',
    standard: 'HAIP',
    version: PROFILE_PINS.haip,
    status: 'external',
    evidence: '',
    blocker:
      'High-assurance issuer trust, wallet attestation, device security, and relying-party governance are outside this repository.',
  },
  {
    id: 'SDJWT-CORE-001',
    standard: 'SD-JWT',
    version: PROFILE_PINS.sdJwt,
    status: 'tested',
    evidence:
      'Pinned JOSE/SD-JWT adapter tests cover signatures, disclosures, key binding, audience, nonce, and bounds.',
    blocker: '',
  },
  {
    id: 'SDJWTVC-PROFILE-001',
    standard: 'SD-JWT VC',
    version: PROFILE_PINS.sdJwtVc,
    status: 'tested',
    evidence:
      'SSW-008 adapter tests accept the pinned dc+sd-jwt profile and reject legacy vc+sd-jwt.',
    blocker: '',
  },
  {
    id: 'SDJWTVC-ECOSYSTEM-001',
    standard: 'SD-JWT VC',
    version: PROFILE_PINS.sdJwtVc,
    status: 'blocked',
    evidence: '',
    blocker:
      'The pinned draft is replaceable and local synthetic vectors do not establish interoperability with external issuers or verifiers.',
  },
  {
    id: 'MDOC-FORMAT-001',
    standard: 'ISO mdoc',
    version: PROFILE_PINS.mdoc,
    status: 'blocked',
    evidence: '',
    blocker:
      'The domain has an iso-mdoc adapter boundary, but no production mdoc cryptographic implementation or interoperability vectors.',
  },
  {
    id: 'MDOC-DEVICE-001',
    standard: 'ISO mdoc',
    version: PROFILE_PINS.mdoc,
    status: 'blocked',
    evidence: '',
    blocker:
      'Device engagement, session encryption, reader authentication, device authentication, and namespace coverage are not implemented end-to-end.',
  },
  {
    id: 'MDOC-HAIP-001',
    standard: 'ISO mdoc + HAIP',
    version: `${PROFILE_PINS.mdoc};${PROFILE_PINS.haip}`,
    status: 'external',
    evidence: '',
    blocker:
      'External mdoc/HAIP interoperability runs, device certificates, and platform secure-element evidence are required.',
  },
  {
    id: 'CLAIMS-BOUNDARY-001',
    standard: 'Project claims boundary',
    version: 'SSW-078-local-policy-1',
    status: 'tested',
    evidence:
      'This test rejects unsupported positive readiness/certification claims and requires explicit disclaimers.',
    blocker: '',
  },
]);

const ALLOWED_STATUSES = new Set(['tested', 'blocked', 'external']);
const POSITIVE_UNSUPPORTED_CLAIM =
  /(?:is|are|we are|this project is)\s+(?:eudi|haip|arf|openid4vci|openid4vp|sd[- ]?jwt vc|mdoc)\s+(?:compliant|certified|conformant)|(?:certification|qualified provider)\s+(?:achieved|complete|granted|approved)/i;

test('conformance matrix has a bounded, evidenced row for every requirement', async () => {
  assert.ok(REQUIREMENTS.length >= 12);
  const ids = new Set();
  for (const requirement of REQUIREMENTS) {
    assert.match(requirement.id, /^[A-Z0-9-]+$/);
    assert.equal(
      ids.has(requirement.id),
      false,
      `duplicate requirement ${requirement.id}`,
    );
    ids.add(requirement.id);
    assert.ok(
      ALLOWED_STATUSES.has(requirement.status),
      `${requirement.id} has invalid status`,
    );
    assert.match(requirement.version, /\d/);
    assert.equal(
      Boolean(requirement.evidence) || Boolean(requirement.blocker),
      true,
      `${requirement.id} lacks evidence/blocker`,
    );
    assert.equal(
      requirement.status === 'tested'
        ? Boolean(requirement.evidence)
        : Boolean(requirement.blocker),
      true,
      `${requirement.id} status/evidence mismatch`,
    );
  }
  const report = await readFile(REPORT, 'utf8');
  for (const requirement of REQUIREMENTS) {
    assert.match(report, new RegExp(`\\b${requirement.id}\\b`));
    assert.match(report, new RegExp(`\\b${requirement.status}\\b`));
    assert.match(
      report,
      new RegExp(requirement.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  }
});

test('profile pins are explicit and no unsupported positive claims are present', async () => {
  const report = await readFile(REPORT, 'utf8');
  for (const [name, pin] of Object.entries(PROFILE_PINS)) {
    assert.match(
      report,
      new RegExp(pin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `${name} pin missing`,
    );
  }
  assert.match(report, /not a certification|no certification|does not claim/i);
  assert.match(report, /external/i);
  assert.doesNotMatch(report, POSITIVE_UNSUPPORTED_CLAIM);
  for (const requirement of REQUIREMENTS) {
    assert.notEqual(requirement.status, 'compliant');
    assert.notEqual(requirement.status, 'certified');
    assert.notEqual(requirement.status, 'ready');
  }
});

test('SSW-077 security dependency has an auditable evidence document', async () => {
  const security = await readFile(SECURITY_EVIDENCE, 'utf8');
  assert.match(security, /SSW-077/);
  assert.match(security, /redaction|privacy/i);
  assert.match(security, /independent|external/i);
});
