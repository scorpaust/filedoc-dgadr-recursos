import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

@Component({ selector: 'fdr-stub', template: 'stub' })
class StubComponent {}

describe('App', () => {
  beforeEach(async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: '', component: StubComponent }])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the matched route through the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('fdr-stub')).toBeTruthy();
  });
});
