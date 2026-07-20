import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AccessDeniedPageComponent } from './access-denied-page.component';

describe('AccessDeniedPageComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('renders the access-denied message with a final, non-plain-text appearance', async () => {
    const fixture = TestBed.createComponent(AccessDeniedPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Acesso não autorizado');
    expect(fixture.nativeElement.querySelector('.fdr-empty-state')).toBeTruthy();
  });

  it('navigates to /inicio when the action is triggered', async () => {
    const fixture = TestBed.createComponent(AccessDeniedPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(navigateSpy).toHaveBeenCalledWith('/inicio');
  });
});
