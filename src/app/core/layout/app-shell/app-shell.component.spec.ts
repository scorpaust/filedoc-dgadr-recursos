import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AppShellComponent } from './app-shell.component';
import { NavDrawerService } from '../../services/nav-drawer.service';

describe('AppShellComponent', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('renders the skip link, header, navigation and footer', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-skip-link')?.getAttribute('href')).toBe('#fdr-main-content');
    expect(el.querySelector('#fdr-main-content')).toBeTruthy();
    expect(el.querySelector('fdr-app-header')).toBeTruthy();
    expect(el.querySelector('fdr-app-nav')).toBeTruthy();
    expect(el.querySelector('fdr-app-footer')).toBeTruthy();
  });

  it('shows the scrim only while the drawer is open and closes it on click', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const navDrawerService = TestBed.inject(NavDrawerService);
    expect(fixture.nativeElement.querySelector('.fdr-app-shell__scrim')).toBeNull();

    navDrawerService.open();
    fixture.detectChanges();
    await fixture.whenStable();
    const scrim = fixture.nativeElement.querySelector('.fdr-app-shell__scrim') as HTMLElement;
    expect(scrim).toBeTruthy();

    scrim.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(navDrawerService.isOpen()).toBe(false);
  });
});
