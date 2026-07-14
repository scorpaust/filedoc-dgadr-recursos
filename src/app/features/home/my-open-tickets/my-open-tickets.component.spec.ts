import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { users } from '../../../shared/mocks/users.mock';
import { UserRole } from '../../../shared/models';
import { SupportTicketMockService } from '../../support/data/support-ticket-mock.service';
import { MyOpenTicketsComponent } from './my-open-tickets.component';

describe('MyOpenTicketsComponent', () => {
  function createFixture(role: UserRole) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const authService = TestBed.inject(AuthService);
    const user = users.find(
      (candidate) => candidate.roles.includes(role) && candidate.status === 'active',
    );
    if (!user) {
      throw new Error(`No active mock user for role ${role}`);
    }
    authService.currentUser.set(user);
    return TestBed.createComponent(MyOpenTicketsComponent);
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

  it('renders the section heading and a shortcut to /suporte', async () => {
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Os meus pedidos');
    const link = el.querySelector('.fdr-my-open-tickets__link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/suporte');
  });

  it('shows skeleton placeholders while loading', () => {
    const fixture = createFixture('EMPLOYEE');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('fdr-skeleton').length).toBeGreaterThan(0);
  });

  // Marta Silva (user-1) tem 5 pedidos: sup-1 (OPEN), sup-2 (IN_PROGRESS), sup-3
  // (WAITING_FOR_USER), sup-4 (RESOLVED) e sup-5 (CLOSED) — apenas os 4 primeiros são abertos.
  it('shows only the open (non-closed) tickets belonging to the current user', async () => {
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Não consigo aceder ao Filedoc'); // sup-1, OPEN
    expect(el.textContent).toContain('Como arquivar um processo concluído'); // sup-4, RESOLVED
    expect(el.textContent).not.toContain('Erro ao carregar anexo de grandes dimensões'); // sup-5, CLOSED
    expect(el.textContent).not.toContain('Dúvida sobre assinatura digital'); // sup-6, other user
  });

  it('shows a positive empty state when the user has no open tickets', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SupportTicketMockService, useValue: { listMine: () => of([]) } },
      ],
    });
    const authService = TestBed.inject(AuthService);
    const user = users.find(
      (candidate) => candidate.roles.includes('ADMIN') && candidate.status === 'active',
    )!;
    authService.currentUser.set(user);

    const fixture = TestBed.createComponent(MyOpenTicketsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('fdr-empty-state')).toBeTruthy();
    expect(el.textContent).toContain('Sem pedidos de suporte abertos');
  });
});
