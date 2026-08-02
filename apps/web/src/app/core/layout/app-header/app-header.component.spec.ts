import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AppHeaderComponent } from './app-header.component';
import { AuthService } from '../../auth/auth.service';
import { NavDrawerService } from '../../services/nav-drawer.service';
import { ThemeService } from '../../services/theme.service';

describe('AppHeaderComponent', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(AuthService).currentUser.set({
      id: 'user-1',
      name: 'Marta Silva',
      email: 'marta.silva@dgadr.gov.pt',
      career: 'Técnico Superior',
      roles: ['EMPLOYEE'],
      status: 'active',
      lastAccess: '2026-07-08',
    });
  });

  it('renders the current authenticated user name and career', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-user-menu__name')?.textContent).toContain('Marta Silva');
  });

  it('toggles the theme via ThemeService when the theme button is clicked', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const themeService = TestBed.inject(ThemeService);
    const initial = themeService.theme();

    (
      fixture.nativeElement.querySelector('.fdr-app-header__theme-toggle') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(themeService.theme()).not.toBe(initial);
  });

  it('toggles the nav drawer via NavDrawerService when the menu button is clicked', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const navDrawerService = TestBed.inject(NavDrawerService);
    expect(navDrawerService.isOpen()).toBe(false);

    (
      fixture.nativeElement.querySelector('.fdr-app-header__menu-toggle') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(navDrawerService.isOpen()).toBe(true);
  });

  // Bug corrigido: este campo nunca esteve ligado a nada desde a Fase 1 — UI (input puramente
  // decorativo, sem `(ngSubmit)`/serviço nenhum). Mesmo comportamento de navegação já testado
  // em `home-page.component.spec.ts` para a pesquisa rápida da Página Inicial.
  it('submits the persistent header search by navigating to /recursos with the typed term', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    const input = fixture.nativeElement.querySelector(
      '.fdr-app-header__search-input',
    ) as HTMLInputElement;
    input.value = 'assinatura digital';
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement
      .querySelector('form.fdr-app-header__search')
      .dispatchEvent(new Event('submit'));

    expect(navigateSpy).toHaveBeenCalledWith(['/recursos'], {
      queryParams: { q: 'assinatura digital' },
    });
  });

  it('submits with no query filter when the search term is empty', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    fixture.nativeElement
      .querySelector('form.fdr-app-header__search')
      .dispatchEvent(new Event('submit'));

    expect(navigateSpy).toHaveBeenCalledWith(['/recursos'], { queryParams: { q: null } });
  });
});
