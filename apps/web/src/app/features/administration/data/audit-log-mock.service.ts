import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuditLogEntry } from '../../../shared/models';
import { auditLogEntries } from '../../../shared/mocks/audit-log.mock';

const SIMULATED_DELAY_MS = 300;

// Serviço de dados simulado (Fase 9 — UI), apenas leitura. As entradas são ilustrativas —
// esta fase não gera auditoria a partir de ações reais praticadas nas fases anteriores
// (fase-9-ui-administracao.md); nunca deve ser apresentado como um histórico real de
// atividade do sistema, papel que só a integração com a API real poderá cumprir.
@Injectable({ providedIn: 'root' })
export class AuditLogMockService {
  list(): Observable<readonly AuditLogEntry[]> {
    const sorted = [...auditLogEntries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return of(sorted).pipe(delay(SIMULATED_DELAY_MS));
  }
}
