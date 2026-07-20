// Registo de auditoria — apenas leitura nesta fase (Fase 9 — UI). Cobre os tipos de ação
// previstos em project-spec.md, secção P; os dados desta fase são ilustrativos, não
// instrumentação real (essa é responsabilidade do backend, quando existir).
export type AuditEntityType = 'utilizador' | 'recurso' | 'pedido de suporte' | 'configuração';

export interface AuditLogEntry {
  readonly id: string;
  readonly actor: string;
  readonly action: string;
  readonly entityType: AuditEntityType;
  readonly entityLabel?: string;
  readonly createdAt: string;
}
