import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AuditEntityType, AuditLogEntry } from '../../../shared/models';

const PAGE_SIZE = 100;

interface AuditLogApiItem {
  readonly id: string;
  readonly actor: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly createdAt: string;
}

interface AuditLogSearchApiResponse {
  readonly items: readonly AuditLogApiItem[];
  readonly total: number;
}

// Chaves técnicas gravadas pelo backend (`apps/api/src/audit/dto/list-audit-log-query.dto.ts`)
// traduzidas para os rótulos em português que `AuditLogListComponent` já espera — a auditoria
// nunca constrói mensagens de interface no domínio (coding-standards.md).
const ENTITY_TYPE_LABELS: Record<string, AuditEntityType> = {
  user: 'utilizador',
  ticket: 'pedido de suporte',
  resource: 'recurso',
};

function toEntityType(value: string): AuditEntityType {
  return ENTITY_TYPE_LABELS[value] ?? 'configuração';
}

/**
 * Consome o endpoint real de auditoria (`GET /admin/audit-log`,
 * fase-8-integracao-administracao.md), com a mesma assinatura pública de
 * `AuditLogMockService.list` — `AuditLogListComponent` troca apenas o serviço injetado.
 *
 * Diferença face ao mock: as entradas já vêm ordenadas mais recentes primeiro pela própria
 * API (nunca ordenadas aqui); `entityLabel` fica sempre por preencher — a API não devolve um
 * rótulo humano da entidade nesta fase (metadados mínimos, coding-standards.md).
 */
@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly http = inject(HttpClient);

  list(): Observable<readonly AuditLogEntry[]> {
    return this.http
      .get<AuditLogSearchApiResponse>('/admin/audit-log', {
        params: { pageSize: PAGE_SIZE },
      })
      .pipe(map((response) => response.items.map((item) => this.toEntry(item))));
  }

  private toEntry(item: AuditLogApiItem): AuditLogEntry {
    return {
      id: item.id,
      actor: item.actor,
      action: item.action,
      entityType: toEntityType(item.entityType),
      createdAt: item.createdAt,
    };
  }
}
