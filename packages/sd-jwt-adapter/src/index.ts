import {
  CompactSign,
  compactVerify,
  decodeProtectedHeader,
  decodeJwt,
  exportJWK,
  importJWK,
} from 'jose';
import { decodeSdJwt, getClaims, splitSdJwt } from '@sd-jwt/decode';

type KeyLike = CryptoKey | Uint8Array;

export const adapterName = 'sd-jwt-vc-adapter';
export const SD_JWT_VC_PROFILE = 'draft-ietf-oauth-sd-jwt-vc-16' as const;
export const SD_JWT_VC_MEDIA_TYPE = 'dc+sd-jwt' as const;
export const SD_JWT_HASH_ALGORITHM = 'sha-256' as const;
export const MAX_TOKEN_LENGTH = 16_384;
export const MAX_DISCLOSURES = 8;
export const MAX_DISCLOSURE_LENGTH = 1_024;

export type AllowedAlgorithm = 'ES256' | 'EdDSA';
export type AllowedKeyType = 'EC' | 'OKP';

export interface AgeCredentialClaims {
  readonly is_over_18: true;
  readonly [key: string]: unknown;
}

export interface IssueInput {
  readonly issuer: string;
  readonly vct: 'AgeCredential';
  readonly claims: AgeCredentialClaims;
  readonly issuerKey: KeyLike;
  readonly issuerKid: string;
  readonly holderJwk: JsonWebKey;
  readonly issuedAt?: number;
  readonly expiresAt: number;
  readonly status?: { readonly idx: number; readonly uri: string };
}

export interface PresentationInput {
  readonly token: string;
  readonly disclosures: readonly string[];
  readonly holderKey: KeyLike;
  readonly holderKid: string;
  readonly audience: string;
  readonly nonce: string;
}

export interface VerifyInput {
  readonly presentation: string;
  readonly issuerKey: KeyLike;
  readonly holderKey?: KeyLike;
  readonly expectedAudience?: string;
  readonly expectedNonce?: string;
  readonly now?: number;
}

export interface IssuedCredential {
  readonly token: string;
  readonly disclosures: readonly string[];
  readonly profile: typeof SD_JWT_VC_PROFILE;
  readonly mediaType: typeof SD_JWT_VC_MEDIA_TYPE;
}

export interface VerifiedCredential {
  readonly issuer: string;
  readonly vct: 'AgeCredential';
  readonly claims: AgeCredentialClaims;
  readonly disclosedClaims: Readonly<Record<string, unknown>>;
  readonly holderBound: boolean;
  readonly status?: { readonly idx: number; readonly uri: string };
}

export class SdJwtVerificationError extends Error {
  readonly code = 'SD_JWT_REJECTED';
  constructor(message: string) {
    super(message);
    this.name = 'SdJwtVerificationError';
  }
}

const fail = (message: string): never => {
  throw new SdJwtVerificationError(message);
};

const b64u = (value: Uint8Array): string => {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
};
const utf8FromB64u = (value: string): string => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  return new TextDecoder().decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
};
const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value);
const hashBytes = async (value: string): Promise<Uint8Array> =>
  new Uint8Array(
    await crypto.subtle.digest('SHA-256', utf8(value).buffer as ArrayBuffer),
  );
const sha256 = async (value: string): Promise<string> =>
  b64u(await hashBytes(value));

const ensureBound = (token: string): void => {
  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH)
    fail('token exceeds size bound');
};

const ensureAlgorithm = (header: Record<string, unknown>): AllowedAlgorithm => {
  if (header.alg !== 'ES256' && header.alg !== 'EdDSA')
    fail('algorithm is not allowlisted');
  return header.alg as AllowedAlgorithm;
};

const ensureKeyType = (jwk: JsonWebKey): void => {
  if (jwk.kty !== 'EC' && jwk.kty !== 'OKP')
    fail('key type is not allowlisted');
};

const encodeDisclosure = (salt: string, key: string, value: unknown): string =>
  b64u(utf8(JSON.stringify([salt, key, value])));

const disclosureKey = (disclosure: string): string => {
  try {
    const parsed = JSON.parse(utf8FromB64u(disclosure));
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 3 ||
      typeof parsed[1] !== 'string'
    )
      fail('invalid disclosure shape');
    return parsed[1];
  } catch {
    return fail('invalid disclosure encoding');
  }
};

const signed = async (
  payload: Record<string, unknown>,
  key: KeyLike,
  alg: AllowedAlgorithm,
  kid: string,
  typ = 'dc+sd-jwt',
): Promise<string> =>
  new CompactSign(utf8(JSON.stringify(payload)))
    .setProtectedHeader({ alg, typ, kid })
    .sign(key);

const keyAlgorithm = async (key: KeyLike): Promise<AllowedAlgorithm> => {
  if (key instanceof CryptoKey) {
    if (
      key.algorithm.name === 'ECDSA' &&
      (key.algorithm as EcKeyAlgorithm).namedCurve === 'P-256'
    )
      return 'ES256';
    if (key.algorithm.name === 'Ed25519') return 'EdDSA';
  } else {
    const jwk = await exportJWK(key);
    ensureKeyType(jwk);
    if (jwk.kty === 'EC' && jwk.crv === 'P-256') return 'ES256';
    if (jwk.kty === 'OKP' && jwk.crv === 'Ed25519') return 'EdDSA';
  }
  return fail('unsupported key curve');
};

export async function issue(input: IssueInput): Promise<IssuedCredential> {
  if (input.vct !== 'AgeCredential' || input.claims.is_over_18 !== true)
    fail('only synthetic AgeCredential is supported');
  if (
    !Number.isInteger(input.expiresAt) ||
    input.expiresAt <= (input.issuedAt ?? Math.floor(Date.now() / 1000))
  )
    fail('invalid expiry');
  const alg = await keyAlgorithm(input.issuerKey);
  const issuedAt = input.issuedAt ?? Math.floor(Date.now() / 1000);
  const disclosures: string[] = [];
  const hashes: string[] = [];
  for (const [index, [key, value]] of Object.entries(input.claims).entries()) {
    if (key === 'is_over_18' || key.startsWith('_')) continue;
    if (disclosures.length >= MAX_DISCLOSURES)
      fail('disclosure count exceeds bound');
    const disclosure = encodeDisclosure(`synthetic-salt-${index}`, key, value);
    if (disclosure.length > MAX_DISCLOSURE_LENGTH)
      fail('disclosure exceeds size bound');
    disclosures.push(disclosure);
    hashes.push(await sha256(disclosure));
  }
  const payload: Record<string, unknown> = {
    iss: input.issuer,
    iat: issuedAt,
    exp: input.expiresAt,
    vct: input.vct,
    _sd_alg: SD_JWT_HASH_ALGORITHM,
    _sd: hashes,
    is_over_18: true,
    cnf: { jwk: input.holderJwk },
  };
  if (input.status) payload.status = input.status;
  const token = `${await signed(payload, input.issuerKey, alg, input.issuerKid)}~${disclosures.join('~')}~`;
  ensureBound(token);
  return {
    token,
    disclosures,
    profile: SD_JWT_VC_PROFILE,
    mediaType: SD_JWT_VC_MEDIA_TYPE,
  };
}

export async function present(input: PresentationInput): Promise<string> {
  ensureBound(input.token);
  if (input.disclosures.length > MAX_DISCLOSURES)
    fail('disclosure count exceeds bound');
  const selected = input.disclosures.map((disclosure) => {
    if (disclosure.length > MAX_DISCLOSURE_LENGTH)
      fail('disclosure exceeds size bound');
    disclosureKey(disclosure);
    return disclosure;
  });
  const base = `${input.token.split('~')[0]}~${selected.join('~')}~`;
  const sdHash = await sha256(base);
  const alg = await keyAlgorithm(input.holderKey);
  const kb = await signed(
    {
      aud: input.audience,
      nonce: input.nonce,
      sd_hash: sdHash,
      iat: Math.floor(Date.now() / 1000),
    },
    input.holderKey,
    alg,
    input.holderKid,
    'kb+jwt',
  );
  const presentation = `${base}${kb}`;
  ensureBound(presentation);
  return presentation;
}

export async function verify(input: VerifyInput): Promise<VerifiedCredential> {
  ensureBound(input.presentation);
  const parts = splitSdJwt(input.presentation);
  if (!parts.kbJwt) fail('key binding JWT is required');
  if (parts.disclosures.length > MAX_DISCLOSURES)
    fail('disclosure count exceeds bound');
  const issuerHeader = decodeProtectedHeader(parts.jwt);
  if (issuerHeader.typ !== SD_JWT_VC_MEDIA_TYPE) fail('unsupported media type');
  const issuerAlg = ensureAlgorithm(issuerHeader);
  const issuerJwk = await exportJWK(input.issuerKey);
  ensureKeyType(issuerJwk);
  if (
    (issuerAlg === 'ES256' && issuerJwk.kty !== 'EC') ||
    (issuerAlg === 'EdDSA' && issuerJwk.kty !== 'OKP')
  )
    fail('issuer key algorithm mismatch');
  await compactVerify(parts.jwt, input.issuerKey, { algorithms: [issuerAlg] });
  const issuerPayload = decodeJwt(parts.jwt) as Record<string, unknown>;
  if (
    issuerPayload.vct !== 'AgeCredential' ||
    issuerPayload._sd_alg !== SD_JWT_HASH_ALGORITHM
  )
    fail('unsupported credential profile');
  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (typeof issuerPayload.exp !== 'number' || now >= issuerPayload.exp)
    fail('credential expired');
  const digestList = issuerPayload._sd as string[];
  if (!Array.isArray(digestList) || digestList.length > MAX_DISCLOSURES)
    fail('invalid digest list');
  for (const disclosure of parts.disclosures) {
    if (disclosure.length > MAX_DISCLOSURE_LENGTH)
      fail('disclosure exceeds size bound');
    const digest = await sha256(disclosure);
    if (!digestList.includes(digest)) fail('disclosure digest mismatch');
  }
  const hasher = async (value: string | ArrayBuffer): Promise<Uint8Array> =>
    hashBytes(
      typeof value === 'string' ? value : new TextDecoder().decode(value),
    );
  const decoded = await decodeSdJwt(input.presentation, hasher);
  const claims = await getClaims<Record<string, unknown>>(
    decoded.jwt.payload,
    decoded.disclosures,
    hasher,
  );
  const holder = issuerPayload.cnf as { jwk?: JsonWebKey } | undefined;
  const holderJwk = holder?.jwk;
  if (!holderJwk) fail('holder binding is missing');
  const boundJwk = holderJwk as JsonWebKey;
  ensureKeyType(boundJwk);
  if (!parts.kbJwt) fail('key binding JWT is required');
  const kbJwt = parts.kbJwt as string;
  const kbHeader = decodeProtectedHeader(kbJwt);
  if (kbHeader.typ !== 'kb+jwt') fail('invalid key-binding type');
  const kbAlg = ensureAlgorithm(kbHeader);
  const kbKey = input.holderKey ?? (await importJWK(boundJwk, kbAlg));
  await compactVerify(kbJwt, kbKey, { algorithms: [kbAlg] });
  const kbPayload = decodeJwt(kbJwt) as Record<string, unknown>;
  const base = `${parts.jwt}~${parts.disclosures.join('~')}~`;
  if (kbPayload.sd_hash !== (await sha256(base)))
    fail('key-binding digest mismatch');
  if (
    input.expectedAudience !== undefined &&
    kbPayload.aud !== input.expectedAudience
  )
    fail('audience mismatch');
  if (
    input.expectedNonce !== undefined &&
    kbPayload.nonce !== input.expectedNonce
  )
    fail('nonce mismatch');
  if (claims.is_over_18 !== true) fail('required age claim missing');
  return {
    issuer: String(issuerPayload.iss),
    vct: 'AgeCredential',
    claims: claims as AgeCredentialClaims,
    disclosedClaims: claims,
    holderBound: true,
    status: issuerPayload.status as VerifiedCredential['status'],
  };
}
