import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuditLogMockService } from '../data/audit-log-mock.service';
import { AuditLogEntry } from '../../../shared/models';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-PT', {
  dateStyle: 'short',
  timeStyle: 'short',
});

// Lista de auditoria, apenas leitura (Fase 9 — UI, tarefa E). As entradas são ilustrativas
// — nunca deve ser confundida com um histórico real de atividade (ver `AuditLogMockService`).
@Component({
  selector: 'fdr-audit-log-list',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './audit-log-list.component.html',
  styleUrl: './audit-log-list.component.scss',
})
export class AuditLogListComponent {
  private readonly auditLogMockService = inject(AuditLogMockService);

  protected readonly entries = toSignal(this.auditLogMockService.list(), {
    initialValue: [] as readonly AuditLogEntry[],
  });

  protected readonly hasEntries = computed(() => this.entries().length > 0);

  protected formatDateTime(iso: string): string {
    return DATE_TIME_FORMATTER.format(new Date(iso));
  }
}
