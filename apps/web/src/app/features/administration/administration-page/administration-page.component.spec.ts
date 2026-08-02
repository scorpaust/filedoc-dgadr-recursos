import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { UserMockService } from '../../../core/auth/user-mock.service';
import { TaxonomyMockService } from '../../content-management/data/taxonomy-mock.service';
import { TaxonomyService } from '../../content-management/data/taxonomy.service';
import { AuditLogMockService } from '../data/audit-log-mock.service';
import { AuditLogService } from '../data/audit-log.service';
import { UserService } from '../data/user.service';
import { AdministrationPageComponent } from './administration-page.component';

// Sem `useExisting`, `UserTableComponent`/`TaxonomySummaryComponent`/`AuditLogListComponent`
// (ligados à API real desde a Fase 8 — Integração/Fase 10 — Hardening) tentariam pedidos HTTP
// reais aqui — mesma técnica já usada desde a Fase 6/7 para
// `content-management-page.component.spec.ts`/`support-management-page...`.
describe('AdministrationPageComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: UserService, useExisting: UserMockService },
        { provide: TaxonomyService, useExisting: TaxonomyMockService },
        { provide: AuditLogService, useExisting: AuditLogMockService },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the screen title and every section: users, taxonomy summary and audit log', async () => {
    const fixture = TestBed.createComponent(AdministrationPageComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Administração');
    expect(fixture.nativeElement.querySelector('fdr-user-table')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('fdr-taxonomy-summary')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('fdr-audit-log-list')).toBeTruthy();
  });
});
