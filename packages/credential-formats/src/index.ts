import {
  inspect as inspectSdJwt,
  issue as issueSdJwt,
  present as presentSdJwt,
  verify as verifySdJwt,
  SD_JWT_VC_MEDIA_TYPE,
  SD_JWT_VC_PROFILE,
  type IssueInput as SdJwtIssueInput,
  type PresentationInput as SdJwtPresentationInput,
  type VerifyInput as SdJwtVerifyInput,
} from '@ssw/sd-jwt-adapter';

export type CredentialFormat =
  | 'sd-jwt-vc'
  | 'iso-mdoc'
  | 'w3c-vc-di'
  | 'jwt-vc-legacy';
export type CredentialArtifactKind = 'credential' | 'presentation';
export type CredentialArtifactValue = string | Uint8Array;

export interface PinnedCredentialFormat<
  F extends CredentialFormat = CredentialFormat,
> {
  readonly format: F;
  readonly profile: string;
  readonly version: string;
  readonly mediaType: string;
  readonly algorithms: readonly string[];
  readonly canIssue: boolean;
  readonly canPresent: boolean;
}

export const CREDENTIAL_FORMAT_PINS = {
  'sd-jwt-vc': {
    format: 'sd-jwt-vc',
    profile: SD_JWT_VC_PROFILE,
    version: '16',
    mediaType: SD_JWT_VC_MEDIA_TYPE,
    algorithms: ['ES256', 'EdDSA'],
    canIssue: true,
    canPresent: true,
  },
  'iso-mdoc': {
    format: 'iso-mdoc',
    profile: 'iso-iec-18013-5',
    version: '2021',
    mediaType: 'application/mdl',
    algorithms: ['ES256'],
    canIssue: true,
    canPresent: true,
  },
  'w3c-vc-di': {
    format: 'w3c-vc-di',
    profile: 'w3c-vc-data-model-2.0-data-integrity-1.0',
    version: '2.0',
    mediaType: 'application/vc+ld+json',
    algorithms: ['ecdsa-rdfc-2019', 'eddsa-rdfc-2022'],
    canIssue: true,
    canPresent: true,
  },
  'jwt-vc-legacy': {
    format: 'jwt-vc-legacy',
    profile: 'w3c-vc-data-model-1.1-jwt',
    version: '1.1',
    mediaType: 'application/vc+jwt',
    algorithms: ['ES256', 'EdDSA'],
    canIssue: false,
    canPresent: false,
  },
} as const satisfies Record<CredentialFormat, PinnedCredentialFormat>;

export interface CredentialArtifact<
  F extends CredentialFormat = CredentialFormat,
> {
  readonly format: F;
  readonly profile: string;
  readonly version: string;
  readonly mediaType: string;
  readonly kind: CredentialArtifactKind;
  readonly value: CredentialArtifactValue;
}

export interface CredentialInspection<
  F extends CredentialFormat = CredentialFormat,
> {
  readonly format: F;
  readonly profile: string;
  readonly version: string;
  readonly mediaType: string;
  readonly kind: CredentialArtifactKind;
  readonly algorithm: string;
  readonly issuer?: string;
  readonly subject?: string;
  readonly credentialTypes: readonly string[];
  readonly keyId?: string;
  readonly holderBound: boolean;
}

export type CredentialFormatFailureCode =
  | 'FORMAT_MISMATCH'
  | 'UNSUPPORTED_PROFILE'
  | 'UNSUPPORTED_VERSION'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'UNSUPPORTED_ALGORITHM'
  | 'ALGORITHM_MISMATCH'
  | 'OPERATION_UNSUPPORTED'
  | 'VERIFICATION_FAILED';

export class CredentialFormatError extends Error {
  constructor(
    readonly code: CredentialFormatFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'CredentialFormatError';
  }
}

export interface FormatSelection<
  F extends CredentialFormat = CredentialFormat,
> {
  readonly expectedFormat: F;
  readonly expectedProfile: string;
  readonly expectedVersion: string;
}

export interface FormatIssueRequest<
  TIssue,
  F extends CredentialFormat = CredentialFormat,
> extends FormatSelection<F> {
  readonly input: TIssue;
}
export interface FormatPresentRequest<
  TPresent,
  F extends CredentialFormat = CredentialFormat,
> extends FormatSelection<F> {
  readonly credential: CredentialArtifact<F>;
  readonly input: TPresent;
}
export interface FormatInspectRequest<
  F extends CredentialFormat = CredentialFormat,
> extends FormatSelection<F> {
  readonly artifact: CredentialArtifact<F>;
}
export interface FormatVerifyRequest<
  TVerify,
  F extends CredentialFormat = CredentialFormat,
> extends FormatSelection<F> {
  readonly presentation: CredentialArtifact<F>;
  readonly input: TVerify;
}

export interface PortVerification {
  readonly verified: boolean;
  readonly algorithm: string;
  readonly issuer?: string;
  readonly subject?: string;
  readonly credentialTypes?: readonly string[];
  readonly claims?: Readonly<Record<string, unknown>>;
  readonly disclosedClaims?: Readonly<Record<string, unknown>>;
  readonly holderBound?: boolean;
}

/** Crypto/proof operations are supplied by reviewed format libraries. */
export interface CredentialFormatPort<TIssue, TPresent, TVerify> {
  issue?(input: TIssue): Promise<CredentialArtifactValue>;
  present?(
    credential: CredentialArtifactValue,
    input: TPresent,
  ): Promise<CredentialArtifactValue>;
  inspect(value: CredentialArtifactValue): Promise<CredentialInspection>;
  verify(
    value: CredentialArtifactValue,
    input: TVerify,
  ): Promise<PortVerification>;
}

export type VerificationStatus = 'verified' | 'rejected';
export interface FormatNeutralVerificationResult<
  F extends CredentialFormat = CredentialFormat,
> {
  readonly status: VerificationStatus;
  readonly format: F;
  readonly profile: string;
  readonly version: string;
  readonly reasonCode: 'VERIFIED' | CredentialFormatFailureCode;
  readonly algorithm?: string;
  readonly issuer?: string;
  readonly subject?: string;
  readonly credentialTypes: readonly string[];
  readonly claims: Readonly<Record<string, unknown>>;
  readonly disclosedClaims: Readonly<Record<string, unknown>>;
  readonly holderBound: boolean;
}

export interface CredentialFormatAdapter<
  TIssue = unknown,
  TPresent = unknown,
  TVerify = unknown,
  F extends CredentialFormat = CredentialFormat,
> {
  readonly descriptor: PinnedCredentialFormat<F>;
  issue(request: FormatIssueRequest<TIssue, F>): Promise<CredentialArtifact<F>>;
  inspect(request: FormatInspectRequest<F>): Promise<CredentialInspection<F>>;
  verify(
    request: FormatVerifyRequest<TVerify, F>,
  ): Promise<FormatNeutralVerificationResult<F>>;
  present(
    request: FormatPresentRequest<TPresent, F>,
  ): Promise<CredentialArtifact<F>>;
}

const MAX_ARTIFACT_BYTES = 256 * 1024;
const byteLength = (value: CredentialArtifactValue): number =>
  typeof value === 'string'
    ? new TextEncoder().encode(value).byteLength
    : value.byteLength;

function fail(code: CredentialFormatFailureCode, message: string): never {
  throw new CredentialFormatError(code, message);
}

function assertValue(value: CredentialArtifactValue): void {
  const length = byteLength(value);
  if (length === 0 || length > MAX_ARTIFACT_BYTES)
    fail('VERIFICATION_FAILED', 'credential artifact exceeds size boundary');
}

function assertSelection<F extends CredentialFormat>(
  descriptor: PinnedCredentialFormat<F>,
  selection: FormatSelection,
): void {
  if (selection.expectedFormat !== descriptor.format)
    fail('FORMAT_MISMATCH', 'credential format does not match expected format');
  if (selection.expectedProfile !== descriptor.profile)
    fail('UNSUPPORTED_PROFILE', 'credential profile is not pinned');
  if (selection.expectedVersion !== descriptor.version)
    fail('UNSUPPORTED_VERSION', 'credential version is not pinned');
}

function assertEnvelope<F extends CredentialFormat>(
  descriptor: PinnedCredentialFormat<F>,
  artifact: CredentialArtifact,
): void {
  assertValue(artifact.value);
  if (artifact.format !== descriptor.format)
    fail('FORMAT_MISMATCH', 'artifact format does not match selected adapter');
  if (artifact.profile !== descriptor.profile)
    fail('UNSUPPORTED_PROFILE', 'artifact profile is not pinned');
  if (artifact.version !== descriptor.version)
    fail('UNSUPPORTED_VERSION', 'artifact version is not pinned');
  if (artifact.mediaType !== descriptor.mediaType)
    fail('UNSUPPORTED_MEDIA_TYPE', 'artifact media type is not pinned');
}

function assertInspection<F extends CredentialFormat>(
  descriptor: PinnedCredentialFormat<F>,
  inspection: CredentialInspection,
): asserts inspection is CredentialInspection<F> {
  if (inspection.format !== descriptor.format)
    fail('FORMAT_MISMATCH', 'inspected format does not match selected adapter');
  if (inspection.profile !== descriptor.profile)
    fail('UNSUPPORTED_PROFILE', 'inspected profile is not pinned');
  if (inspection.version !== descriptor.version)
    fail('UNSUPPORTED_VERSION', 'inspected version is not pinned');
  if (inspection.mediaType !== descriptor.mediaType)
    fail('UNSUPPORTED_MEDIA_TYPE', 'inspected media type is not pinned');
  if (!descriptor.algorithms.includes(inspection.algorithm))
    fail('UNSUPPORTED_ALGORITHM', 'credential algorithm is not allowlisted');
}

class PortBackedCredentialFormatAdapter<
  TIssue,
  TPresent,
  TVerify,
  F extends CredentialFormat,
> implements CredentialFormatAdapter<TIssue, TPresent, TVerify, F>
{
  constructor(
    readonly descriptor: PinnedCredentialFormat<F>,
    private readonly port: CredentialFormatPort<TIssue, TPresent, TVerify>,
  ) {}

  private artifact(
    kind: CredentialArtifactKind,
    value: CredentialArtifactValue,
  ): CredentialArtifact<F> {
    assertValue(value);
    return {
      format: this.descriptor.format,
      profile: this.descriptor.profile,
      version: this.descriptor.version,
      mediaType: this.descriptor.mediaType,
      kind,
      value,
    };
  }

  async issue(
    request: FormatIssueRequest<TIssue, F>,
  ): Promise<CredentialArtifact<F>> {
    assertSelection(this.descriptor, request);
    if (!this.descriptor.canIssue || !this.port.issue)
      fail('OPERATION_UNSUPPORTED', 'credential format is verify-only');
    const artifact = this.artifact(
      'credential',
      await this.port.issue(request.input),
    );
    const inspection = await this.inspect({ ...request, artifact });
    if (inspection.kind !== 'credential')
      fail('FORMAT_MISMATCH', 'issuance returned a presentation');
    return artifact;
  }

  async present(
    request: FormatPresentRequest<TPresent, F>,
  ): Promise<CredentialArtifact<F>> {
    assertSelection(this.descriptor, request);
    assertEnvelope(this.descriptor, request.credential);
    if (!this.descriptor.canPresent || !this.port.present)
      fail(
        'OPERATION_UNSUPPORTED',
        'credential format cannot create presentations',
      );
    const value = await this.port.present(
      request.credential.value,
      request.input,
    );
    const artifact = this.artifact('presentation', value);
    const inspection = await this.inspect({ ...request, artifact });
    if (inspection.kind !== 'presentation')
      fail('FORMAT_MISMATCH', 'presentation operation returned a credential');
    return artifact;
  }

  async inspect(
    request: FormatInspectRequest<F>,
  ): Promise<CredentialInspection<F>> {
    assertSelection(this.descriptor, request);
    assertEnvelope(this.descriptor, request.artifact);
    const inspection = await this.port.inspect(request.artifact.value);
    assertInspection(this.descriptor, inspection);
    if (inspection.kind !== request.artifact.kind)
      fail('FORMAT_MISMATCH', 'artifact kind does not match inspected content');
    return inspection;
  }

  async verify(
    request: FormatVerifyRequest<TVerify, F>,
  ): Promise<FormatNeutralVerificationResult<F>> {
    try {
      assertSelection(this.descriptor, request);
      assertEnvelope(this.descriptor, request.presentation);
      const inspection = await this.inspect({
        ...request,
        artifact: request.presentation,
      });
      const verified = await this.port.verify(
        request.presentation.value,
        request.input,
      );
      if (!verified.verified)
        fail('VERIFICATION_FAILED', 'credential proof verification failed');
      if (verified.algorithm !== inspection.algorithm)
        fail(
          'ALGORITHM_MISMATCH',
          'verified algorithm differs from inspected algorithm',
        );
      if (!this.descriptor.algorithms.includes(verified.algorithm))
        fail('UNSUPPORTED_ALGORITHM', 'verified algorithm is not allowlisted');
      return {
        status: 'verified',
        format: this.descriptor.format,
        profile: this.descriptor.profile,
        version: this.descriptor.version,
        reasonCode: 'VERIFIED',
        algorithm: verified.algorithm,
        ...((verified.issuer ?? inspection.issuer)
          ? { issuer: verified.issuer ?? inspection.issuer }
          : {}),
        ...((verified.subject ?? inspection.subject)
          ? { subject: verified.subject ?? inspection.subject }
          : {}),
        credentialTypes: verified.credentialTypes ?? inspection.credentialTypes,
        claims: verified.claims ?? {},
        disclosedClaims: verified.disclosedClaims ?? verified.claims ?? {},
        holderBound: verified.holderBound ?? inspection.holderBound,
      };
    } catch (error) {
      const reasonCode =
        error instanceof CredentialFormatError
          ? error.code
          : 'VERIFICATION_FAILED';
      return {
        status: 'rejected',
        format: this.descriptor.format,
        profile: this.descriptor.profile,
        version: this.descriptor.version,
        reasonCode,
        credentialTypes: [],
        claims: {},
        disclosedClaims: {},
        holderBound: false,
      };
    }
  }
}

export function createPortBackedCredentialFormatAdapter<
  TIssue,
  TPresent,
  TVerify,
  F extends Exclude<CredentialFormat, 'sd-jwt-vc'>,
>(
  format: F,
  port: CredentialFormatPort<TIssue, TPresent, TVerify>,
): CredentialFormatAdapter<TIssue, TPresent, TVerify, F> {
  const descriptor = CREDENTIAL_FORMAT_PINS[
    format
  ] as unknown as PinnedCredentialFormat<F>;
  return new PortBackedCredentialFormatAdapter(descriptor, port);
}

export type SdJwtPresentationOptions = Omit<SdJwtPresentationInput, 'token'>;
export type SdJwtVerificationOptions = Omit<SdJwtVerifyInput, 'presentation'>;

export function createSdJwtVcCredentialFormatAdapter(): CredentialFormatAdapter<
  SdJwtIssueInput,
  SdJwtPresentationOptions,
  SdJwtVerificationOptions,
  'sd-jwt-vc'
> {
  const descriptor = CREDENTIAL_FORMAT_PINS['sd-jwt-vc'];
  const port: CredentialFormatPort<
    SdJwtIssueInput,
    SdJwtPresentationOptions,
    SdJwtVerificationOptions
  > = {
    async issue(input) {
      return (await issueSdJwt(input)).token;
    },
    async present(credential, input) {
      if (typeof credential !== 'string')
        fail('FORMAT_MISMATCH', 'SD-JWT VC must use compact text encoding');
      return presentSdJwt({ ...input, token: credential });
    },
    async inspect(value) {
      if (typeof value !== 'string')
        fail('FORMAT_MISMATCH', 'SD-JWT VC must use compact text encoding');
      const inspected = inspectSdJwt(value);
      return {
        format: descriptor.format,
        profile: inspected.profile,
        version: descriptor.version,
        mediaType: inspected.mediaType,
        kind: inspected.kind,
        algorithm: inspected.algorithm,
        ...(inspected.issuer ? { issuer: inspected.issuer } : {}),
        credentialTypes: [inspected.credentialType],
        ...(inspected.keyId ? { keyId: inspected.keyId } : {}),
        holderBound: inspected.hasKeyBinding,
      };
    },
    async verify(value, input) {
      if (typeof value !== 'string')
        fail('FORMAT_MISMATCH', 'SD-JWT VC must use compact text encoding');
      const inspected = inspectSdJwt(value);
      const result = await verifySdJwt({ ...input, presentation: value });
      return {
        verified: true,
        algorithm: inspected.algorithm,
        issuer: result.issuer,
        credentialTypes: [result.vct],
        claims: result.claims,
        disclosedClaims: result.disclosedClaims,
        holderBound: result.holderBound,
      };
    },
  };
  return new PortBackedCredentialFormatAdapter(descriptor, port);
}

type AnyAdapter = CredentialFormatAdapter<any, any, any, any>;
const FORMATS = Object.keys(CREDENTIAL_FORMAT_PINS) as CredentialFormat[];

/** Exact registry: no implicit profile fallback and no content-based downgrade. */
export class PinnedCredentialAdapterRegistry {
  private readonly adapters = new Map<CredentialFormat, AnyAdapter>();

  constructor(adapters: readonly AnyAdapter[]) {
    for (const adapter of adapters) {
      const format = adapter.descriptor.format as CredentialFormat;
      const pinned = CREDENTIAL_FORMAT_PINS[format];
      if (
        adapter.descriptor.profile !== pinned.profile ||
        adapter.descriptor.version !== pinned.version ||
        adapter.descriptor.mediaType !== pinned.mediaType ||
        adapter.descriptor.algorithms.join('|') !==
          pinned.algorithms.join('|') ||
        adapter.descriptor.canIssue !== pinned.canIssue ||
        adapter.descriptor.canPresent !== pinned.canPresent
      )
        fail(
          'UNSUPPORTED_VERSION',
          'registry adapter does not match pinned descriptor',
        );
      if (this.adapters.has(format))
        fail('FORMAT_MISMATCH', 'duplicate credential format adapter');
      this.adapters.set(format, adapter);
    }
    if (this.adapters.size !== FORMATS.length)
      fail(
        'FORMAT_MISMATCH',
        'registry requires every pinned credential format',
      );
  }

  formats(): readonly CredentialFormat[] {
    return FORMATS;
  }

  get<F extends CredentialFormat>(selection: FormatSelection<F>): AnyAdapter {
    const adapter = this.adapters.get(selection.expectedFormat);
    if (!adapter)
      fail('FORMAT_MISMATCH', 'credential format adapter is unavailable');
    assertSelection(adapter.descriptor, selection);
    return adapter;
  }

  async inspect<F extends CredentialFormat>(
    request: FormatInspectRequest<F>,
  ): Promise<CredentialInspection<F>> {
    return this.get(request).inspect(request) as Promise<
      CredentialInspection<F>
    >;
  }

  async verify<TVerify, F extends CredentialFormat>(
    request: FormatVerifyRequest<TVerify, F>,
  ): Promise<FormatNeutralVerificationResult<F>> {
    return this.get(request).verify(request) as Promise<
      FormatNeutralVerificationResult<F>
    >;
  }
}
