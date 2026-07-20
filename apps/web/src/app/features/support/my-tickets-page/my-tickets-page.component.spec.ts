import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { users } from '../../../shared/mocks/users.mock';
import { UserRole } from '../../../shared/models';
import { MyTicketsPageComponent } from './my-tickets-page.component';

describe('MyTicketsPageComponent', () => {
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
    return TestBed.createComponent(MyTicketsPageComponent);
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

  it('renders the screen title', async () => {
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Os meus pedidos de suporte',
    );
  });

  it('shows skeleton placeholders while loading', () => {
    const fixture = createFixture('EMPLOYEE');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('fdr-skeleton').length).toBeGreaterThan(0);
  });

  it('lists only the tickets belonging to the current user (Marta Silva)', async () => {
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Dúvida sobre assinatura digital'); // sup-6, user-3
    expect(el.textContent).toContain('Não consigo aceder ao Filedoc'); // sup-1, user-1
  });

  it('filters the list by status', async () => {
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const resolvedOption = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.fdr-segmented__option'),
    ).find((button) => button.textContent?.trim() === 'Resolvido')!;
    resolvedOption.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Como arquivar um processo concluído'); // sup-4, RESOLVED
    expect(el.textContent).not.toContain('Não consigo aceder ao Filedoc'); // sup-1, OPEN
  });

  it('navigates to the new ticket page action', async () => {
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    const button = fixture.nativeElement.querySelector('fdr-button button') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Novo pedido');
  });
});
