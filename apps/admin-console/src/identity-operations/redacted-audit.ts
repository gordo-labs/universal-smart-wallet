import type { InstitutionalAdminPrincipal } from '../lib/institutional-issuer-admin';
import {
  assertFiniteTimestamp,
  authorizeIdentityOperations,
  cloneFreeze,
  IdentityOperationsError,
  requireOpaqueId,
} from './security';

export type AuditOutcome = 'allowed' | 'denied' | 'indeterminate';
export type AuditPrimitive = string | number | boolean | null;
export type AuditMetadata = Record<string, AuditPrimitive | readonly AuditPrimitive[]>;

export interface RedactedAuditEvent {
  readonly id: string;
  readonly tenantId: string;
  readonly action: string;
  readonly outcome: AuditOutcome;
  readonly actorRef: string;
  readonly at: number;
  readonly requestRef?: string;
  readonly metadata?: Readonly<Record<string, AuditPrimitive | readonly AuditPrimitive[]>>;
}

export interface AuditEventInput {
  readonly id: string;
  readonly tenantId: string;
  readonly action: string;
  readonly outcome: AuditOutcome;
  readonly actorRef: string;
  readonly at: number;
  readonly requestRef?: string;
  readonly metadata?: Record<string, unknown>;
}

const sensitiveKey = /(?:secret|token|password|private|mnemonic|credential|verifiable|(^|[_-])vc($|[_-])|claim|evidence|presentation|disclosure|email|phone|name|address|dob|birth|subject|did|key)/iu;
const safeKey = /^[a-z][a-z0-9_.-]{0,63}$/u;
const sensitiveValue = /(?:-----BEGIN|eyJ[A-Za-z0-9_-]{8,}\.|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\+?[0-9][0-9 .-]{7,}|did:[a-z0-9]+:|bearer\s+|secret|token|private\s+key)/iu;

function redactValue(value: unknown): AuditPrimitive | readonly AuditPrimitive[] {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value as AuditPrimitive;
  if (typeof value === 'string') return sensitiveValue.test(value) ? '[redacted]' : value.slice(0, 160);
  if (Array.isArray(value)) {
    return Object.freeze(value.slice(0, 32).map((item) => redactValue(item) as AuditPrimitive));
  }
  return '[redacted]';
}

export function redactAuditEvent(input: AuditEventInput): RedactedAuditEvent {
  requireOpaqueId(input.id, 'audit id');
  requireOpaqueId(input.tenantId, 'tenantId');
  requireOpaqueId(input.action, 'action');
  requireOpaqueId(input.actorRef, 'actorRef');
  if (input.requestRef !== undefined) requireOpaqueId(input.requestRef, 'requestRef');
  if (!['allowed', 'denied', 'indeterminate'].includes(input.outcome)) throw new IdentityOperationsError('INVALID_REQUEST', 'audit outcome is invalid');
  assertFiniteTimestamp(input.at, 'audit timestamp');
  const metadata: Record<string, AuditPrimitive | readonly AuditPrimitive[]> = {};
  for (const [key, value] of Object.entries(input.metadata ?? {})) {
    if (!safeKey.test(key) || sensitiveKey.test(key)) continue;
    const redacted = redactValue(value);
    if (redacted === '[redacted]') continue;
    metadata[key] = redacted;
  }
  return cloneFreeze({
    id: input.id,
    tenantId: input.tenantId,
    action: input.action,
    outcome: input.outcome,
    actorRef: input.actorRef,
    at: input.at,
    ...(input.requestRef === undefined ? {} : { requestRef: input.requestRef }),
    ...(Object.keys(metadata).length === 0 ? {} : { metadata }),
  });
}

export class RedactedAuditStore {
  private readonly events: RedactedAuditEvent[] = [];

  append(principal: InstitutionalAdminPrincipal, input: AuditEventInput): RedactedAuditEvent {
    authorizeIdentityOperations(principal, 'issuer:audit:read', input.tenantId);
    const event = redactAuditEvent(input);
    if (this.events.some((existing) => existing.tenantId === event.tenantId && existing.id === event.id)) {
      throw new IdentityOperationsError('CONFLICT', 'Audit event already exists');
    }
    this.events.push(event);
    return event;
  }

  list(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    filters: Readonly<{ action?: string; outcome?: AuditOutcome; since?: number; until?: number }> = {},
  ): readonly RedactedAuditEvent[] {
    authorizeIdentityOperations(principal, 'issuer:audit:read', tenantId);
    if (filters.since !== undefined) assertFiniteTimestamp(filters.since, 'since');
    if (filters.until !== undefined) assertFiniteTimestamp(filters.until, 'until');
    if (filters.since !== undefined && filters.until !== undefined && filters.since > filters.until) throw new IdentityOperationsError('INVALID_REQUEST', 'audit time range is invalid');
    return Object.freeze(this.events.filter((event) =>
      event.tenantId === tenantId &&
      (filters.action === undefined || event.action === filters.action) &&
      (filters.outcome === undefined || event.outcome === filters.outcome) &&
      (filters.since === undefined || event.at >= filters.since) &&
      (filters.until === undefined || event.at <= filters.until),
    ));
  }
}
