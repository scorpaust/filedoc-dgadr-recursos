import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { users } from '../../../shared/mocks/users.mock';
import { UserRole } from '../../../shared/models';
import { TicketDetailPageComponent } from './ticket-detail-page.component';

describe('TicketDetailPageComponent', () => {
  function createFixture(role: UserRole, id: string) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const authService = TestBed.inject(AuthService);
    const user = users.find(
      (candidate) => candidate.roles.includes(role) && candidate.status === 'active',
    );
    if (!user) {
      throw new Error(`No active mock user for role ${role}`);
    }
    authService.currentUser.set(user);
    const fixture = TestBed.createComponent(TicketDetailPageComponent);
    fixture.componentRef.setInput('id', id);
    return fixture;
  }

  async function settle(fixture: ReturnType<typeof createFixture>) {
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(400);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the ticket owned by the current user', async () => {
    const fixture = createFixture('EMPLOYEE', 'sup-1'); // Marta Silva
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Não consigo aceder ao Filedoc');
    expect(el.querySelector('fdr-empty-state')).toBeFalsy();
  });

  it('shows a generic "not found" message for a ticket belonging to another user', async () => {
    const fixture = createFixture('EMPLOYEE', 'sup-6'); // belongs to user-3
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('fdr-empty-state')).toBeTruthy();
    expect(el.textContent).toContain('Pedido não encontrado');
  });

  it('shows the same "not found" message for a non-existent id', async () => {
    const fixture = createFixture('EMPLOYEE', 'sup-does-not-exist');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Pedido não encontrado');
  });

  it('hides the reply form for a closed ticket', async () => {
    const fixture = createFixture('EMPLOYEE', 'sup-5'); // CLOSED
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-ticket-detail-page__reply-form')).toBeFalsy();
  });

  it('shows the reply form for an open ticket', async () => {
    const fixture = createFixture('EMPLOYEE', 'sup-1'); // OPEN
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-ticket-detail-page__reply-form')).toBeTruthy();
  });

  it('shows the "confirm resolution" action for a resolved ticket', async () => {
    const resolvedFixture = createFixture('EMPLOYEE', 'sup-4'); // RESOLVED
    await settle(resolvedFixture);
    expect(
      (resolvedFixture.nativeElement as HTMLElement).querySelector(
        '.fdr-ticket-detail-page__resolution',
      ),
    ).toBeTruthy();
  });

  it('hides the "confirm resolution" action for a non-resolved ticket', async () => {
    const openFixture = createFixture('EMPLOYEE', 'sup-1'); // OPEN
    await settle(openFixture);
    expect(
      (openFixture.nativeElement as HTMLElement).querySelector(
        '.fdr-ticket-detail-page__resolution',
      ),
    ).toBeFalsy();
  });

  it('confirms resolution, transitioning the ticket to closed and hiding the action', async () => {
    const fixture = createFixture('EMPLOYEE', 'sup-4'); // RESOLVED
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const button = Array.from(el.querySelectorAll('fdr-button button')).find((candidate) =>
      candidate.textContent?.includes('Confirmar resolução'),
    ) as HTMLButtonElement;
    button.click();
    // Duas fases assíncronas em cadeia: o próprio confirmResolution() (atraso simulado)
    // e, já com o estado atualizado, o novo pedido de getMineById() despoletado pelo
    // refreshTrigger (outro atraso simulado) — por isso avançamos os temporizadores duas vezes.
    await vi.advanceTimersByTimeAsync(400);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(400);
    fixture.detectChanges();

    expect(el.textContent).toContain('Encerrado');
    expect(el.querySelector('.fdr-ticket-detail-page__resolution')).toBeFalsy();
    expect(el.querySelector('.fdr-ticket-detail-page__reply-form')).toBeFalsy();
  });

  it('adds a reply message to the timeline', async () => {
    const fixture = createFixture('EMPLOYEE', 'sup-1'); // OPEN
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    const textarea = el.querySelector('#reply-content') as HTMLTextAreaElement;
    textarea.value = 'Informação adicional para o suporte.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (el.querySelector('.fdr-ticket-detail-page__reply-form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    // Mesma cadeia de dois atrasos simulados descrita no teste de confirmação de resolução.
    await vi.advanceTimersByTimeAsync(400);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(400);
    fixture.detectChanges();

    expect(el.textContent).toContain('Informação adicional para o suporte.');
  });
});
