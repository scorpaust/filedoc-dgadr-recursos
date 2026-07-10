import { Component } from '@angular/core';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AppNavComponent } from './app-nav.component';

@Component({ template: '' })
class StubPageComponent {}

describe('AppNavComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: StubPageComponent }]),
        provideLocationMocks(),
      ],
    });
  });

  it('renders the Portal, Pedidos and Gestão groups with their items', async () => {
    const fixture = TestBed.createComponent(AppNavComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const headings = Array.from(el.querySelectorAll('.fdr-app-nav__heading')).map((h) =>
      h.textContent?.trim(),
    );
    expect(headings).toEqual(['Portal', 'Pedidos', 'Gestão']);
    expect(el.querySelectorAll('.fdr-app-nav__link').length).toBe(8);
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
});
