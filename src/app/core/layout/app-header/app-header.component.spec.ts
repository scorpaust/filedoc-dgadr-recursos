import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AppHeaderComponent } from './app-header.component';
import { NavDrawerService } from '../../services/nav-drawer.service';
import { ThemeService } from '../../services/theme.service';

describe('AppHeaderComponent', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('renders the current mock user name and career', async () => {
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-app-header__user-name')?.textContent).toContain('Marta Silva');
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
});
