import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { UserMockService } from '../../../core/auth/user-mock.service';
import { UserTableComponent } from './user-table.component';

describe('UserTableComponent', () => {
  let toastService: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    toastService = TestBed.inject(ToastService);
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

  it('lists every seeded mock user, including one with more than one role pill', async () => {
    const fixture = TestBed.createComponent(UserTableComponent);
    fixture.detectChanges();
    await flush(fixture);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('João Antunes');
    const joaoRow = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')).find((row) =>
      (row as HTMLElement).textContent?.includes('João Antunes'),
    ) as HTMLElement;
    expect(joaoRow.querySelectorAll('.fdr-pill').length).toBeGreaterThanOrEqual(3);
  });

  it('filters by status via the segmented control', async () => {
    const fixture = TestBed.createComponent(UserTableComponent);
    fixture.detectChanges();
    await flush(fixture);

    clickStatus(fixture, 'Inativos');
    fixture.detectChanges();
    await flush(fixture);

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
    expect(
      Array.from(rows).every((row) => (row as HTMLElement).textContent?.includes('Inativo')),
    ).toBe(true);
  });

  it('activating an inactive user shows a success toast and refreshes the list', async () => {
    const fixture = TestBed.createComponent(UserTableComponent);
    fixture.detectChanges();
    await flush(fixture);

    clickStatus(fixture, 'Inativos');
    fixture.detectChanges();
    await flush(fixture);

    const activateButton = fixture.nativeElement.querySelector(
      'button[aria-label^="Ativar"]',
    ) as HTMLButtonElement;
    activateButton.click();
    await flush(fixture);
    await flush(fixture);

    expect(toastService.toasts().some((toast) => toast.message.includes('ativada'))).toBe(true);
  });

  it('simulating "invalidate sessions" shows a success toast', async () => {
    const fixture = TestBed.createComponent(UserTableComponent);
    fixture.detectChanges();
    await flush(fixture);

    const invalidateButton = fixture.nativeElement.querySelector(
      'button[aria-label^="Invalidar sessões"]',
    ) as HTMLButtonElement;
    invalidateButton.click();
    await flush(fixture);

    expect(toastService.toasts().some((toast) => toast.message.includes('invalidadas'))).toBe(true);
  });

  it('blocks deactivating the last administrator before showing any confirmation dialog', async () => {
    const userMockService = TestBed.inject(UserMockService);
    const dialogService = TestBed.inject(DialogService);
    const openSpy = vi.spyOn(dialogService, 'open');
    // Deixar user-3 (João Antunes) como o único administrador.
    userMockService.assignRoles('user-5', ['CONTENT_EDITOR']).subscribe();
    await vi.advanceTimersByTimeAsync(300);

    const fixture = TestBed.createComponent(UserTableComponent);
    fixture.detectChanges();
    await flush(fixture);

    const joaoRow = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')).find((row) =>
      (row as HTMLElement).textContent?.includes('João Antunes'),
    ) as HTMLElement;
    const deactivateButton = joaoRow.querySelector(
      'button[aria-label^="Desativar"]',
    ) as HTMLButtonElement;
    deactivateButton.click();

    expect(openSpy).not.toHaveBeenCalled();
    expect(toastService.toasts().some((toast) => toast.message.includes('último utilizador'))).toBe(
      true,
    );
  });

  it('opens the create-user dialog when "Criar utilizador" is clicked', async () => {
    const fixture = TestBed.createComponent(UserTableComponent);
    fixture.detectChanges();
    await flush(fixture);

    const dialogService = TestBed.inject(DialogService);
    const openSpy = vi
      .spyOn(dialogService, 'open')
      .mockReturnValue({ closed: { pipe: () => ({ subscribe: () => undefined }) } } as never);

    const createButton = fixture.nativeElement.querySelector(
      '.fdr-user-table__header button',
    ) as HTMLButtonElement;
    createButton.click();

    expect(openSpy).toHaveBeenCalled();
  });
});
