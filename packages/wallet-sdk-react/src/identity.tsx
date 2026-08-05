import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DependencyList,
  type ReactNode,
} from 'react';
import type {
  CredentialOffer,
  HolderClientError,
  HolderConsent,
  HolderCredential,
  HolderCredentialClient,
  HolderCredentialSummary,
  PresentationRequest,
} from '@ssw/identity-sdk';

export type IdentitySafeError = { readonly code: string; readonly message: string };

export const normalizeIdentityError = (error: unknown): IdentitySafeError => {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  )
    return { code: (error as { code: string }).code, message: 'Identity operation failed' };
  return { code: 'UNKNOWN', message: 'Identity operation failed' };
};

export type HolderIdentityProviderProps = {
  readonly client: HolderCredentialClient;
  readonly children: ReactNode;
};

const HolderContext = createContext<HolderCredentialClient | null>(null);

export function HolderIdentityProvider({ client, children }: HolderIdentityProviderProps) {
  return <HolderContext.Provider value={client}>{children}</HolderContext.Provider>;
}

function useHolderClient(): HolderCredentialClient {
  const client = useContext(HolderContext);
  if (!client) throw new Error('HolderIdentityProvider is required');
  return client;
}

type HolderOperationState<T> = {
  readonly data?: T;
  readonly loading: boolean;
  readonly error?: IdentitySafeError;
};

function useHolderOperation<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
): HolderOperationState<T> & { readonly run: () => Promise<T | undefined>; readonly cancel: () => void } {
  const [state, setState] = useState<HolderOperationState<T>>({ loading: false });
  const mounted = useRef(true);
  const sequence = useRef(0);
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      sequence.current += 1;
      controller.current?.abort();
    };
  }, []);

  const run = useCallback(async () => {
    controller.current?.abort();
    const current = ++sequence.current;
    const next = new AbortController();
    controller.current = next;
    // Clear potentially privileged data immediately; stale results cannot survive a new run.
    setState({ loading: true });
    try {
      const data = await operation(next.signal);
      if (mounted.current && current === sequence.current) setState({ data, loading: false });
      return data;
    } catch (error) {
      const code = (error as { code?: unknown })?.code;
      const aborted = code === 'ABORTED' || (error as { name?: unknown })?.name === 'AbortError';
      if (mounted.current && current === sequence.current && !aborted)
        setState({ loading: false, error: normalizeIdentityError(error) });
      return undefined;
    }
    // Operation dependencies are supplied by each hook and intentionally capture its input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const cancel = useCallback(() => {
    sequence.current += 1;
    controller.current?.abort();
    if (mounted.current) setState({ loading: false });
  }, []);
  return { ...state, run, cancel };
}

export function useHolderCredentials() {
  const client = useHolderClient();
  const operation = useHolderOperation<readonly HolderCredentialSummary[]>(signal => client.list({ signal }), [client]);
  return { ...operation, credentials: operation.data ?? [] };
}

export function useHolderCredential(credentialId?: string) {
  const client = useHolderClient();
  const operation = useHolderOperation<import('@ssw/credential-formats').CredentialInspection | undefined>(
    signal => (credentialId ? client.inspect(credentialId, { signal }) : Promise.resolve(undefined)),
    [client, credentialId],
  );
  return { ...operation, inspection: operation.data };
}

export function useAcceptCredentialOffer() {
  const client = useHolderClient();
  const [offer, setOffer] = useState<CredentialOffer | string>();
  const operation = useHolderOperation<HolderCredential>(
    signal => {
      if (offer === undefined) return Promise.reject(new Error('Offer is required'));
      return client.acceptOffer(offer, { signal });
    },
    [client, offer],
  );
  const accept = useCallback(
    (nextOffer: CredentialOffer | string, acknowledgeUnknownIssuer = false) => {
      setOffer(nextOffer);
      return client.acceptOffer(nextOffer, { acknowledgeUnknownIssuer });
    },
    [client],
  );
  return { ...operation, accept };
}

export function useCreateSelfAttestedCredential() {
  const client = useHolderClient();
  const operation = useHolderOperation<HolderCredential>(() => Promise.reject(new Error('Use create explicitly')), [client]);
  const create = useCallback((input: unknown) => client.createSelfAttested(input), [client]);
  return { ...operation, create };
}

export function useDeleteCredential() {
  const client = useHolderClient();
  const operation = useHolderOperation<void>(() => Promise.reject(new Error('Use delete explicitly')), [client]);
  const remove = useCallback((credentialId: string) => client.delete(credentialId), [client]);
  return { ...operation, remove };
}

export function useExportCredentials() {
  const client = useHolderClient();
  const operation = useHolderOperation<Uint8Array>(() => Promise.reject(new Error('Use export explicitly')), [client]);
  const exportCredentials = useCallback(
    (credentialIds?: readonly string[]) => client.export({ credentialIds, confirmExport: true }),
    [client],
  );
  return { ...operation, exportCredentials };
}

export function usePresentCredential() {
  const client = useHolderClient();
  const operation = useHolderOperation<unknown>(() => Promise.reject(new Error('Use present explicitly')), [client]);
  const present = useCallback(
    (request: PresentationRequest, consent: HolderConsent) => client.present({ ...request, consent }),
    [client],
  );
  return { ...operation, present };
}
