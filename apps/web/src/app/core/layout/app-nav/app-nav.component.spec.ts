import { Component } from '@angular/core';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../auth/auth.service';
import { LastViewedResourceService } from '../../services/last-viewed-resource.service';
import { users } from '../../../shared/mocks/users.mock';
import { AppNavComponent } from './app-nav.component';

@Component({ template: '' })
class StubPageComponent {}

describe('AppNavComponent', () => {
  beforeEach(() => {
    localStorage.removeItem('fdr-last-viewed-resource');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: StubPageComponent }]),
        provideLocationMocks(),
      ],
    });
  });

  it('renders the Portal, Pedidos and Gestão groups, without a "Recurso" link by default', async () => {
    const fixture = TestBed.createComponent(AppNavComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const headings = Array.from(el.querySelectorAll('.fdr-app-nav__heading')).map((h) =>
      h.textContent?.trim(),
    );
    expect(headings).toEqual(['Portal', 'Pedidos', 'Gestão']);
    expect(el.querySelectorAll('.fdr-app-nav__link').length).toBe(7);
    expect(el.textContent).not.toContain('Recurso');
  });

  it('marks the link matching the current route as active', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/inicio');
    const fixture = TestBed.createComponent(AppNavComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const activeLink = fixture.nativeElement.querySelector('.fdr-app-nav__link--active');
    expect(activeLink?.textContent).toContain('Início');
  });

  it('shows a "Recurso" link with the resource title once one has been viewed', async () => {
    const authService = TestBed.inject(AuthService);
    const employee = users.find((u) => u.roles.includes('EMPLOYEE') && u.status === 'active')!;
    authService.currentUser.set(employee);

    const lastViewedResourceService = TestBed.inject(LastViewedResourceService);
    lastViewedResourceService.record(
      'assinar-um-despacho-digitalmente',
      'Assinar um despacho digitalmente',
    );

    const fixture = TestBed.createComponent(AppNavComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('.fdr-app-nav__link').length).toBe(8);
    const link = Array.from(el.querySelectorAll('.fdr-app-nav__link')).find((a) =>
      a.textContent?.includes('Assinar um despacho digitalmente'),
    ) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/recursos/assinar-um-despacho-digitalmente');
  });

  it('never shows a resource last viewed by a different user', async () => {
    const authService = TestBed.inject(AuthService);
    const employee = users.find((u) => u.roles.includes('EMPLOYEE') && u.status === 'active')!;
    const editor = users.find((u) => u.roles.includes('CONTENT_EDITOR') && u.status === 'active')!;

    authService.currentUser.set(employee);
    const lastViewedResourceService = TestBed.inject(LastViewedResourceService);
    lastViewedResourceService.record(
      'assinar-um-despacho-digitalmente',
      'Assinar um despacho digitalmente',
    );

    authService.currentUser.set(editor);
    const fixture = TestBed.createComponent(AppNavComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('.fdr-app-nav__link').length).toBe(7);
    expect(el.textContent).not.toContain('Assinar um despacho digitalmente');
  });
});
