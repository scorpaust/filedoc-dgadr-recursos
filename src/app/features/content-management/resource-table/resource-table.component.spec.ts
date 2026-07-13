import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { users } from '../../../shared/mocks/users.mock';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ResourceTableComponent } from './resource-table.component';

describe('ResourceTableComponent', () => {
  let toastService: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const authService = TestBed.inject(AuthService);
    toastService = TestBed.inject(ToastService);
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

  function clickStatus(fixture: { nativeElement: HTMLElement }, label: string): void {
    const button = Array.from(
      fixture.nativeElement.querySelectorAll('.fdr-segmented__option'),
    ).find((candidate) => candidate.textContent?.trim() === label) as HTMLButtonElement;
    button.click();
  }

  it('lists resources of every editorial status, including drafts and archived', async () => {
    const fixture = TestBed.createComponent(ResourceTableComponent);
    fixture.detectChanges();
    await flush(fixture);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Rascunho');
    expect(text).toContain('Publicado');
  });

  it('filters by status via the segmented control', async () => {
    const fixture = TestBed.createComponent(ResourceTableComponent);
    fixture.detectChanges();
    await flush(fixture);

    clickStatus(fixture, 'Rascunho');
    fixture.detectChanges();
    await flush(fixture);

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
    expect(
      Array.from(rows).every((row) => (row as HTMLElement).textContent?.includes('Rascunho')),
    ).toBe(true);
  });

  it('shows "Restaurar" instead of publish/archive actions for already-archived resources', async () => {
    const fixture = TestBed.createComponent(ResourceTableComponent);
    fixture.detectChanges();
    await flush(fixture);

    clickStatus(fixture, 'Arquivado');
    fixture.detectChanges();
    await flush(fixture);

    // Editar, Pré-visualizar, Duplicar e Restaurar continuam disponíveis; só Publicar/
    // Despublicar e Arquivar desaparecem para um recurso já arquivado.
    const firstRow = fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
    expect(firstRow.querySelectorAll('.fdr-resource-table__action').length).toBe(4);
    expect(firstRow.querySelector('button[aria-label^="Restaurar"]')).toBeTruthy();
  });

  it('restoring an archived resource brings it back to draft', async () => {
    const fixture = TestBed.createComponent(ResourceTableComponent);
    fixture.detectChanges();
    await flush(fixture);

    clickStatus(fixture, 'Arquivado');
    fixture.detectChanges();
    await flush(fixture);

    const restoreButton = fixture.nativeElement.querySelector(
      'button[aria-label^="Restaurar"]',
    ) as HTMLButtonElement;
    restoreButton.click();
    await flush(fixture);
    await flush(fixture);

    expect(toastService.toasts().some((toast) => toast.message.includes('restaurado'))).toBe(true);
  });

  it('duplicating a resource shows a success toast and refreshes the list', async () => {
    const fixture = TestBed.createComponent(ResourceTableComponent);
    fixture.detectChanges();
    await flush(fixture);

    const duplicateButton = fixture.nativeElement.querySelector(
      'button[aria-label^="Duplicar"]',
    ) as HTMLButtonElement;
    duplicateButton.click();
    await flush(fixture);
    await flush(fixture);

    expect(toastService.toasts().some((toast) => toast.message.includes('duplicado'))).toBe(true);
  });
});
