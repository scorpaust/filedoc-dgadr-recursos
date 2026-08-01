import { Prisma } from '@prisma/client';

export const AUDIT_LOG_INCLUDE = {
  actor: true,
} satisfies Prisma.AuditLogInclude;
export type AuditLogWithActor = Prisma.AuditLogGetPayload<{
  include: typeof AUDIT_LOG_INCLUDE;
}>;

export interface RecordAuditInput {
  readonly actorId: string | undefined;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly metadata?: Record<string, unknown>;
  readonly correlationId: string | undefined;
}

/** Forma devolvida ao cliente — `actor` já resolvido para um nome legível (nunca o id
 * técnico), tal como a UI de auditoria (Fase 9) sempre esperou. */
export interface AuditLogResponse {
  readonly id: string;
  readonly actor: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly metadata?: Record<string, unknown>;
  readonly correlationId?: string;
  readonly createdAt: string;
}

export interface AuditLogSearchResponse {
  readonly items: readonly AuditLogResponse[];
  readonly total: number;
}
