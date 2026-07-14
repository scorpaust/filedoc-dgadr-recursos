import { TestBed } from '@angular/core/testing';
import { AuditLogListComponent } from './audit-log-list.component';

describe('AuditLogListComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the illustrative mock entries with actor, action and date/time', async () => {
    const fixture = TestBed.createComponent(AuditLogListComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.fdr-audit-log-list__item');
    expect(items.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).toContain('Ana Ferreira');
  });

  it('clearly discloses that the entries are illustrative, not a real activity history', async () => {
    const fixture = TestBed.createComponent(AuditLogListComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Entradas ilustrativas');
  });
});
