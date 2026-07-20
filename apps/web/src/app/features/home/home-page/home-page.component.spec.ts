import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { users } from '../../../shared/mocks/users.mock';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
  function createFixture() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const authService = TestBed.inject(AuthService);
    const user = users.find(
      (candidate) => candidate.roles.includes('EMPLOYEE') && candidate.status === 'active',
    )!;
    authService.currentUser.set(user);
    return TestBed.createComponent(HomePageComponent);
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the hero with the exact copy from project-spec.md', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Domine o Filedoc, passo a passo.');
    expect(el.textContent).toContain(
      'Consulte vídeos, guias práticos e dicas para executar os principais fluxos documentais.',
    );
    expect(el.textContent).toContain(
      'Quando precisar, coloque uma questão ou registe um pedido de suporte.',
    );
  });

  it('navigates to /recursos and /suporte/novo from the hero actions', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    const buttons = fixture.nativeElement.querySelectorAll('.fdr-home-hero__actions button');
    (buttons[0] as HTMLButtonElement).click();
    expect(navigateSpy).toHaveBeenCalledWith('/recursos');

    (buttons[1] as HTMLButtonElement).click();
    expect(navigateSpy).toHaveBeenCalledWith('/suporte/novo');
  });

  it('shows three static feature cards, matching project-spec.md', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.fdr-home-features__card');
    expect(cards.length).toBe(3);
    expect((cards[0] as HTMLElement).textContent).toContain('Vídeos formativos');
    expect((cards[1] as HTMLElement).textContent).toContain('Guias em PDF');
    expect((cards[2] as HTMLElement).textContent).toContain('Pedidos de suporte');
  });

  it('submits the quick search to /recursos with the term applied as a filter', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    const component = fixture.componentInstance;
    component['searchForm'].controls.query.setValue('assinatura digital');
    component['onSearchSubmit']();

    expect(navigateSpy).toHaveBeenCalledWith(['/recursos'], {
      queryParams: { q: 'assinatura digital' },
    });
  });

  it('navigates to /recursos with no query filter when the search term is empty', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    fixture.componentInstance['onSearchSubmit']();

    expect(navigateSpy).toHaveBeenCalledWith(['/recursos'], { queryParams: { q: null } });
  });

  it('renders the three dynamic sections, each loading independently', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('fdr-featured-resources')).toBeTruthy();
    expect(el.querySelector('fdr-recent-resources')).toBeTruthy();
    expect(el.querySelector('fdr-my-open-tickets')).toBeTruthy();
  });
});
