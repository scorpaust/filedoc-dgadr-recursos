import { ActivatedRoute, Params, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { users } from '../../../shared/mocks/users.mock';
import { UserRole } from '../../../shared/models';
import { NewTicketPageComponent } from './new-ticket-page.component';

const PUBLISHED_RESOURCE_SLUG = 'criar-um-novo-processo-de-correspondencia'; // res-1

function fakeRoute(queryParams: Params = {}): ActivatedRoute {
  return {
    snapshot: { queryParamMap: convertToParamMap(queryParams) },
  } as unknown as ActivatedRoute;
}

describe('NewTicketPageComponent', () => {
  function createFixture(role: UserRole, queryParams: Params = {}) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: fakeRoute(queryParams) }],
    });
    const authService = TestBed.inject(AuthService);
    const user = users.find(
      (candidate) => candidate.role === role && candidate.status === 'active',
    );
    if (!user) {
      throw new Error(`No active mock user for role ${role}`);
    }
    authService.currentUser.set(user);
    return TestBed.createComponent(NewTicketPageComponent);
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
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Novo pedido de suporte');
  });

  it('shows validation errors when submitting an empty form', async () => {
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('O assunto é obrigatório.');
    expect(el.textContent).toContain('A descrição é obrigatória.');
    expect(el.textContent).toContain('A categoria é obrigatória.');
    expect(el.textContent).toContain('A prioridade é obrigatória.');
  });

  it('shows the blocking priority warning only when "Bloqueante" is selected', async () => {
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const select = el.querySelector('#ticket-priority') as HTMLSelectElement;

    select.value = 'alta';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(el.textContent).not.toContain('impedir totalmente');

    select.value = 'bloqueante';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(el.textContent).toContain('impedir totalmente');
  });

  it('pre-associates a resource received via the "recurso" query param, removable on demand', async () => {
    const fixture = createFixture('EMPLOYEE', {
      recurso: PUBLISHED_RESOURCE_SLUG,
      assunto: 'Título de teste',
    });
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-new-ticket-page__related-resource')).toBeTruthy();
    expect((el.querySelector('#ticket-subject') as HTMLInputElement).value).toBe('Título de teste');

    const removeButton = el.querySelector(
      '.fdr-new-ticket-page__remove-related',
    ) as HTMLButtonElement;
    removeButton.click();
    fixture.detectChanges();
    expect(el.querySelector('.fdr-new-ticket-page__related-resource')).toBeFalsy();
  });

  it('creates a ticket and navigates to its detail page on submit', async () => {
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const el = fixture.nativeElement as HTMLElement;

    function setValue(selector: string, value: string, eventName: string): void {
      const element = el.querySelector(selector) as
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      element.value = value;
      element.dispatchEvent(new Event(eventName));
    }

    setValue('#ticket-subject', 'Não consigo assinar um despacho', 'input');
    setValue(
      '#ticket-description',
      'A assinatura digital falha sempre a meio do processo.',
      'input',
    );
    setValue('#ticket-category', 'Assinatura', 'change');
    setValue('#ticket-priority', 'normal', 'change');
    fixture.detectChanges();

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await vi.advanceTimersByTimeAsync(400);

    expect(navigateSpy).toHaveBeenCalledWith(['/suporte', expect.any(String)]);
  });
});
