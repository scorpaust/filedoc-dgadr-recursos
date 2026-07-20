import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AuditLogListComponent } from '../audit-log-list/audit-log-list.component';
import { TaxonomySummaryComponent } from '../taxonomy-summary/taxonomy-summary.component';
import { UserTableComponent } from '../user-table/user-table.component';

// Página de administração (Fase 9 — UI), protegida por `roleGuard` (`ADMIN`) em
// `app.routes.ts`. Reúne a gestão de utilizadores, o resumo de taxonomias (Fase 8) e o
// registo de auditoria (apenas leitura) na mesma página.
@Component({
  selector: 'fdr-administration-page',
  imports: [UserTableComponent, TaxonomySummaryComponent, AuditLogListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './administration-page.component.html',
  styleUrl: './administration-page.component.scss',
})
export class AdministrationPageComponent {}
