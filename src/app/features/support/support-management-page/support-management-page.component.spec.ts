import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { users } from '../../../shared/mocks/users.mock';
import { SupportManagementPageComponent } from './support-management-page.component';

describe('SupportManagementPageComponent', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    authService = TestBed.inject(AuthService);
    const agent = users.find((user) => user.id === 'user-2');
    authService.currentUser.set(agent ?? null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function flush(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
    await vi.advanceTimersByTimeAsync(400);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('lists tickets from every requester in the queue', async () => {
    const fixture = TestBed.createComponent(SupportManagementPageComponent);
    fixture.detectChanges();
    await flush(fixture);

    const rows = fixture.nativeElement.querySelectorAll('.fdr-support-management__queue-item');
    expect(rows.length).toBeGreaterThan(1);
    expect(fixture.nativeElement.textContent).toContain('João Antunes');
  });

  it('shows a placeholder in the detail panel until a ticket is selected', async () => {
    const fixture = TestBed.createComponent(SupportManagementPageComponent);
    fixture.detectChanges();
    await flush(fixture);

    expect(fixture.nativeElement.textContent).toContain('Selecione um pedido');
  });

  it('selecting a queue item shows its detail, including the public timeline', async () => {
    const fixture = TestBed.createComponent(SupportManagementPageComponent);
    fixture.detectChanges();
    await flush(fixture);

    const firstRow = fixture.nativeElement.querySelector(
      '.fdr-support-management__queue-item',
    ) as HTMLButtonElement;
    firstRow.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.fdr-ticket-timeline')).toBeTruthy();
  });

  it('assigning to self updates the assignee shown in the header select', async () => {
    const fixture = TestBed.createComponent(SupportManagementPageComponent);
    fixture.detectChanges();
    await flush(fixture);

    const firstRow = fixture.nativeElement.querySelector(
      '.fdr-support-management__queue-item',
    ) as HTMLButtonElement;
    firstRow.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const assignToMeButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLButtonElement).textContent?.includes('Atribuir a mim'),
    ) as HTMLButtonElement | undefined;
    expect(assignToMeButton).toBeTruthy();
    assignToMeButton?.click();
    // A atribuição em si demora 400 ms (mutação); a atualização da fila
    // desencadeada por essa mutação demora mais 400 ms (nova chamada a listAll).
    await flush(fixture);
    await flush(fixture);

    const assigneeSelect = fixture.nativeElement.querySelector(
      '#ticket-assignee',
    ) as HTMLSelectElement;
    expect(assigneeSelect.value).toBe('user-2');
  });

  it('toggling to "Nota interna" and submitting adds an internal-note entry to the timeline', async () => {
    const fixture = TestBed.createComponent(SupportManagementPageComponent);
    fixture.detectChanges();
    await flush(fixture);

    const firstRow = fixture.nativeElement.querySelector(
      '.fdr-support-management__queue-item',
    ) as HTMLButtonElement;
    firstRow.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const internalRadio = fixture.nativeElement.querySelector(
      'input[type="radio"][value="internal"]',
    ) as HTMLInputElement;
    internalRadio.click();
    internalRadio.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('#reply-content') as HTMLTextAreaElement;
    textarea.value = 'A confirmar internamente.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector(
      '.fdr-support-management__reply-form',
    ) as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    // A submissão da nota interna demora 400 ms; a atualização subsequente da fila
    // (refreshTrigger) demora mais 400 ms.
    await flush(fixture);
    await flush(fixture);

    expect(
      fixture.nativeElement.querySelector('.fdr-ticket-timeline__entry--internal-note'),
    ).toBeTruthy();
  });
});
