import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { users } from '../../../shared/mocks/users.mock';
import { TaxonomyManagementComponent } from './taxonomy-management.component';

describe('TaxonomyManagementComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    const authService = TestBed.inject(AuthService);
    const editor = users.find((user) => user.role === 'CONTENT_EDITOR' && user.status === 'active');
    authService.currentUser.set(editor ?? null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function flush(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('lists workflows, document types and tags in separate columns', async () => {
    const fixture = TestBed.createComponent(TaxonomyManagementComponent);
    fixture.detectChanges();
    await flush(fixture);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Fluxo');
    expect(el.textContent).toContain('Tipo de documento');
    expect(el.textContent).toContain('Etiqueta');
    expect(el.textContent).toContain('Criação e registo');
  });

  it('creates a new tag and shows it in the list', async () => {
    const fixture = TestBed.createComponent(TaxonomyManagementComponent);
    fixture.detectChanges();
    await flush(fixture);
    const el = fixture.nativeElement as HTMLElement;

    const input = el.querySelector('#new-taxonomy-tag') as HTMLInputElement;
    input.value = 'etiqueta-de-teste';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const forms = el.querySelectorAll('.fdr-taxonomy-management__new-form');
    (forms[2] as HTMLFormElement).dispatchEvent(new Event('submit'));
    await flush(fixture);
    await flush(fixture);

    expect(el.textContent).toContain('etiqueta-de-teste');
  });

  it('toggles a taxonomy between active and inactive', async () => {
    const fixture = TestBed.createComponent(TaxonomyManagementComponent);
    fixture.detectChanges();
    await flush(fixture);
    const el = fixture.nativeElement as HTMLElement;

    const toggleButton = el.querySelector('button[aria-label^="Desativar"]') as HTMLButtonElement;
    toggleButton.click();
    await flush(fixture);
    await flush(fixture);

    expect(el.querySelector('.fdr-taxonomy-management__item--inactive')).toBeTruthy();
  });
});
