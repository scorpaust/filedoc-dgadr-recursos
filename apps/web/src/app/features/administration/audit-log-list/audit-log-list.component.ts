import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuditLogEntry } from '../../../shared/models';
import { AuditLogService } from '../data/audit-log.service';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-PT', {
  dateStyle: 'short',
  timeStyle: 'short',
});

// Lista de auditoria, apenas leitura (Fase 9 — UI, tarefa E; ligada ao endpoint real na Fase
// 8 — Integração). As entradas refletem agora ações reais praticadas na aplicação.
@Component({
  selector: 'fdr-audit-log-list',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './audit-log-list.component.html',
  styleUrl: './audit-log-list.component.scss',
})
export class AuditLogListComponent {
  private readonly auditLogService = inject(AuditLogService);

  protected readonly entries = toSignal(this.auditLogService.list(), {
    initialValue: [] as readonly AuditLogEntry[],
  });

  protected readonly hasEntries = computed(() => this.entries().length > 0);

  protected formatDateTime(iso: string): string {
    return DATE_TIME_FORMATTER.format(new Date(iso));
  }
}
