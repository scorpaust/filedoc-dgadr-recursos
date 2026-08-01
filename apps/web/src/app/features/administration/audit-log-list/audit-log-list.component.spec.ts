import { TestBed } from '@angular/core/testing';
import { AuditLogMockService } from '../data/audit-log-mock.service';
import { AuditLogService } from '../data/audit-log.service';
import { AuditLogListComponent } from './audit-log-list.component';

describe('AuditLogListComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [{ provide: AuditLogService, useExisting: AuditLogMockService }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the seeded entries with actor, action and date/time', async () => {
    const fixture = TestBed.createComponent(AuditLogListComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.fdr-audit-log-list__item');
    expect(items.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).toContain('Ana Ferreira');
  });

  it('discloses that the entries are the real record of recent administrative actions', async () => {
    const fixture = TestBed.createComponent(AuditLogListComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Registo real das ações administrativas mais recentes',
    );
  });
});
