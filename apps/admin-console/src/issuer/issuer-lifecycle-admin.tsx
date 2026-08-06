'use client';

import { useCallback, useState } from 'react';
import type {
  IssuerAdminPrincipal,
  IssuerLifecycleApi,
  LifecycleSession,
} from './lifecycle.js';
import { IssuerLifecycleController } from './lifecycle.js';

type Props = Readonly<{
  api: IssuerLifecycleApi;
  principal: IssuerAdminPrincipal;
  sessionIds?: readonly string[];
}>;

/**
 * Minimal accessible issuer workbench. It intentionally renders metadata and
 * state only; credential artifacts, claims, evidence, and protocol tokens are
 * never put in React state or the DOM.
 */
export function IssuerLifecycleAdmin({ api, principal, sessionIds = [] }: Props) {
  const [sessions, setSessions] = useState<readonly LifecycleSession[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const controller = new IssuerLifecycleController(api);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const queue = await controller.reviewQueue(principal, sessionIds);
      setSessions(queue.map((item) => item.session));
    } catch {
      setError('No se pudo cargar la cola de revisión.');
    } finally {
      setLoading(false);
    }
  }, [api, principal, sessionIds]);

  return (
    <section aria-labelledby="issuer-lifecycle-heading">
      <h2 id="issuer-lifecycle-heading">Emisión institucional</h2>
      <p>
        Tenant: <code>{principal.tenantId}</code> · Rol: <code>{principal.role}</code>
      </p>
      <button type="button" onClick={refresh} disabled={loading}>
        {loading ? 'Cargando…' : 'Actualizar cola de revisión'}
      </button>
      {error ? <p role="alert">{error}</p> : null}
      <ul aria-label="Cola de revisión">
        {sessions.map((session) => (
          <li key={session.sessionId}>
            <code>{session.sessionId}</code> · {session.kind} · {session.state}
          </li>
        ))}
        {!sessions.length && !loading ? <li>No hay solicitudes pendientes.</li> : null}
      </ul>
      <p>
        La aprobación y la firma se mantienen separadas. Suspender, revocar o
        reemitir exige step-up y confirmación explícita.
      </p>
    </section>
  );
}

