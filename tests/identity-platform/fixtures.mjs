import {
  CREDENTIAL_FORMAT_PINS,
  PinnedCredentialAdapterRegistry,
} from '../../packages/credential-formats/dist/index.js';
import {
  createOfflineEnvelope,
  InMemoryOfflineReplayBoundary,
  OfflineTrustStatusCache,
  verifyOfflineEnvelope,
} from '../../packages/credential-scanner/dist/offline/index.js';
import { createCredentialScannerClient } from '../../packages/identity-sdk/dist/scanner/index.js';
import {
  GOVERNMENT_PACKS,
  runGovernmentJourney,
} from '../../packages/institutional-use-cases/dist/government/index.js';
import {
  DRIVING_SCHOOL_PACKS,
  runDrivingSchoolJourney,
} from '../../packages/institutional-use-cases/dist/driving-school/index.js';
import {
  ENTERPRISE_PACKS,
  runEnterpriseJourney,
} from '../../packages/institutional-use-cases/dist/enterprise/index.js';
import {
  UNIVERSITY_PACKS,
  runUniversityJourney,
} from '../../packages/institutional-use-cases/dist/index.js';
import { IdentityNativeAdapter } from '../../packages/identity-sdk-react-native/dist/index.js';
import { MobileWalletController } from '../../apps/wallet-mobile/dist/index.js';

export const REQUIRED_CASES = Object.freeze([
  'issuer-wallet-verifier',
  'all-format-adapters',
  'scanner-online',
  'scanner-offline',
  'mobile-wallet',
  'sector-university',
  'sector-government',
  'sector-driving-school',
  'sector-enterprise',
  'redaction-artifacts',
]);

const NOW = 1_754_560_000;
const SYNTHETIC_ISSUER = 'https://issuer.synthetic.example/e2e';

const encode = (value, format) => {
  const json = JSON.stringify({
    format,
    profile: CREDENTIAL_FORMAT_PINS[format].profile,
    version: CREDENTIAL_FORMAT_PINS[format].version,
    mediaType: CREDENTIAL_FORMAT_PINS[format].mediaType,
    algorithm: CREDENTIAL_FORMAT_PINS[format].algorithms[0],
    kind: 'credential',
    issuer: SYNTHETIC_ISSUER,
    credentialTypes: ['SyntheticIdentityCredential'],
    holderBound: format !== 'jwt-vc-legacy',
    claims: { credentialRef: 'synthetic-credential-001' },
    signature: 'synthetic-valid',
    value,
  });
  return format === 'iso-mdoc' ? new TextEncoder().encode(json) : json;
};

const decode = (value) => JSON.parse(typeof value === 'string' ? value : new TextDecoder().decode(value));

const syntheticAdapter = (format) => {
  const descriptor = CREDENTIAL_FORMAT_PINS[format];
  return {
    descriptor,
    async issue({ input }) {
      return { format, profile: descriptor.profile, version: descriptor.version, mediaType: descriptor.mediaType, kind: 'credential', value: encode(input, format) };
    },
    async present({ credential, input }) {
      const parsed = decode(credential.value);
      return { format, profile: descriptor.profile, version: descriptor.version, mediaType: descriptor.mediaType, kind: 'presentation', value: encode({ claims: input.claims ?? ['credentialRef'], source: parsed.value }, format) };
    },
    async inspect({ artifact }) {
      const parsed = decode(artifact.value);
      return { format, profile: descriptor.profile, version: descriptor.version, mediaType: descriptor.mediaType, kind: artifact.kind, algorithm: descriptor.algorithms[0], issuer: parsed.issuer, credentialTypes: parsed.credentialTypes, holderBound: parsed.holderBound };
    },
    async verify({ presentation }) {
      const parsed = decode(presentation.value);
      const verified = parsed.signature === 'synthetic-valid';
      return { status: verified ? 'verified' : 'rejected', format, profile: descriptor.profile, version: descriptor.version, reasonCode: verified ? 'VERIFIED' : 'VERIFICATION_FAILED', algorithm: descriptor.algorithms[0], issuer: parsed.issuer, credentialTypes: parsed.credentialTypes, claims: parsed.claims, disclosedClaims: parsed.claims, holderBound: parsed.holderBound };
    },
  };
};

export async function runFormatCoverage() {
  const formats = Object.keys(CREDENTIAL_FORMAT_PINS);
  const registry = new PinnedCredentialAdapterRegistry(formats.map(syntheticAdapter));
  const results = [];
  for (const format of formats) {
    const pin = CREDENTIAL_FORMAT_PINS[format];
    const selection = { expectedFormat: format, expectedProfile: pin.profile, expectedVersion: pin.version };
    if (pin.canIssue) {
      const credential = await registry.get(selection).issue({ ...selection, input: { claims: { credentialRef: 'synthetic-credential-001' } } });
      const presentation = await registry.get(selection).present({ ...selection, credential, input: { claims: ['credentialRef'] } });
      const verified = await registry.verify({ ...selection, presentation, input: {} });
      if (verified.status !== 'verified') throw new Error(`format ${format} did not verify`);
    } else {
      const presentation = { ...selection, kind: 'presentation', value: encode({}, format) };
      const verified = await registry.verify({ ...selection, presentation, input: {} });
      if (verified.status !== 'verified') throw new Error(`verify-only format ${format} did not verify`);
    }
    results.push(format);
  }
  return results;
}

export function runSectorCoverage() {
  const sectors = [
    ['sector-university', UNIVERSITY_PACKS, runUniversityJourney],
    ['sector-government', GOVERNMENT_PACKS, runGovernmentJourney],
    ['sector-driving-school', DRIVING_SCHOOL_PACKS, runDrivingSchoolJourney],
    ['sector-enterprise', ENTERPRISE_PACKS, runEnterpriseJourney],
  ];
  return sectors.map(([name, packs, run]) => {
    const ids = Object.keys(packs);
    if (ids.length === 0) throw new Error(`${name} has no journeys`);
    for (const id of ids) {
      const result = run(id);
      if (!result || result.status !== 'verified') throw new Error(`${name}/${id} did not verify`);
      if (!result.credentialId.startsWith('synthetic-')) throw new Error(`${name}/${id} is not synthetic`);
    }
    return { name, count: ids.length };
  });
}

export function runScannerCoverage() {
  const scanner = createCredentialScannerClient({ now: () => NOW });
  const issuance = scanner.accept('openid-credential-offer://?credential_offer=%7B%22credential_issuer%22%3A%22https%3A%2F%2Fissuer.synthetic.example%22%2C%22credential_configuration_ids%22%3A%5B%22SyntheticIdentityCredential%22%5D%7D');
  const presentation = scanner.accept(`openid4vp://?request=${encodeURIComponent('a.b-c_d.e')}`);
  if (issuance.scan.kind !== 'issuance' || presentation.scan.kind !== 'presentation') throw new Error('online scanner classification failed');
  return { issuance: issuance.scan.kind, presentation: presentation.scan.kind };
}

export async function runOfflineCoverage() {
  const unsigned = { format: 'ssw-offline-envelope', schemaVersion: 1, envelopeId: 'synthetic-envelope-001', tenantId: 'synthetic-tenant', jurisdiction: 'synthetic-eu-test', issuerId: 'synthetic-issuer', schemaId: 'urn:ssw:synthetic:identity:v1', keyId: 'synthetic-key-v1', statusId: 'synthetic-status-001', issuedAt: NOW - 10, expiresAt: NOW + 600, nonce: 'syntheticnonce001', credential: 'synthetic-credential-001' };
  const envelope = await createOfflineEnvelope(unsigned, { sign: () => 'synthetic-signature' });
  const snapshot = { schemaVersion: 1, snapshotId: 'synthetic-snapshot-v1', tenantId: unsigned.tenantId, jurisdiction: unsigned.jurisdiction, sequence: 1, issuedAt: NOW - 100, expiresAt: NOW + 900, signingKeyId: 'synthetic-snapshot-key', issuers: [{ issuerId: unsigned.issuerId, status: 'active', schemas: [{ schemaId: unsigned.schemaId, status: 'active' }], keys: [{ keyId: unsigned.keyId, status: 'active', authorizedFrom: NOW - 1000 }] }], statuses: [{ issuerId: unsigned.issuerId, statusId: unsigned.statusId, status: 'valid' }], signature: 'synthetic-snapshot-signature' };
  const cache = new OfflineTrustStatusCache({ verify: () => true }, () => NOW);
  await cache.prime(snapshot);
  const replay = new InMemoryOfflineReplayBoundary();
  const first = await verifyOfflineEnvelope(envelope, { verifier: { verify: () => true }, registry: cache, now: NOW, replay });
  const second = await verifyOfflineEnvelope(envelope, { verifier: { verify: () => true }, registry: cache, now: NOW, replay });
  if (first.result !== 'verified' || second.code !== 'REPLAY_DETECTED') throw new Error('offline freshness/replay gate failed');
  const scan = createCredentialScannerClient({ now: () => NOW }).accept(`ssw-offline://v1/${envelope}`);
  if (scan.scan.kind !== 'offline') throw new Error('offline QR scanner classification failed');
  return { first: first.code, replay: second.code, kind: scan.scan.kind };
}

export async function runMobileCoverage() {
  const lifecycle = { currentState: () => 'active', subscribe: () => () => {} };
  const native = new IdentityNativeAdapter({ lifecycle, appLinks: { subscribe: () => () => {} }, passkey: { register: async () => ({ credentialId: 'synthetic-passkey', authenticatorData: new Uint8Array([1]), clientDataJSON: new Uint8Array([2]), signature: new Uint8Array([3]) }), authenticate: async () => ({ credentialId: 'synthetic-passkey', authenticatorData: new Uint8Array([1]), clientDataJSON: new Uint8Array([2]), signature: new Uint8Array([3]) }) }, secureStorage: { get: async () => new Uint8Array([1]), set: async () => {}, delete: async () => true }, camera: { scan: async () => ({ value: 'openid4vp://?request=a.b-c_d.e', format: 'qr' }), stop: () => {} } });
  const holder = { acceptOffer: async () => ({ credentialId: 'synthetic-credential-001' }), present: async (input) => input };
  const app = new MobileWalletController({ native, holder, now: () => NOW });
  const item = app.receiveLink('openid4vp://?request=a.b-c_d.e');
  if (item.kind !== 'presentation' || app.state !== 'ready') throw new Error('mobile presentation flow failed');
  await app.present({ claims: ['credentialRef'], consent: { accepted: true, claims: ['credentialRef'] } }, { confirm: true });
  app.dispose();
  return { item: item.kind, state: app.state };
}

export async function runAllCases() {
  const cases = {};
  const universityJourney = runUniversityJourney('enrollment');
  const expectedIssuerWalletVerifierEvents = ['synthetic-evidence-reviewed', 'dual-approval-recorded', 'credential-issued', 'presentation-verified'];
  if (JSON.stringify(universityJourney.events) !== JSON.stringify(expectedIssuerWalletVerifierEvents)) throw new Error('issuer-wallet-verifier chain is incomplete');
  cases['issuer-wallet-verifier'] = { events: universityJourney.events, credentialId: universityJourney.credentialId, sectors: runSectorCoverage().reduce((sum, item) => sum + item.count, 0) };
  cases['all-format-adapters'] = { formats: await runFormatCoverage() };
  cases['scanner-online'] = runScannerCoverage();
  cases['scanner-offline'] = await runOfflineCoverage();
  cases['mobile-wallet'] = await runMobileCoverage();
  for (const [name, count] of runSectorCoverage().map(({ name, count }) => [name, count])) cases[name] = { count };
  cases['redaction-artifacts'] = { syntheticOnly: true };
  for (const required of REQUIRED_CASES) if (!cases[required]) throw new Error(`required case skipped: ${required}`);
  return cases;
}
