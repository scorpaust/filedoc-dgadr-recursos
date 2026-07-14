import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AdministrationPageComponent } from './administration-page.component';

describe('AdministrationPageComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
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
