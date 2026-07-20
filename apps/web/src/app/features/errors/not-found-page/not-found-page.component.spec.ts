import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { NotFoundPageComponent } from './not-found-page.component';

describe('NotFoundPageComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('renders the not-found message with a final, non-plain-text appearance', async () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Página não encontrada');
    expect(fixture.nativeElement.querySelector('.fdr-empty-state')).toBeTruthy();
  });

  it('navigates to /inicio when the action is triggered', async () => {
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(navigateSpy).toHaveBeenCalledWith('/inicio');
  });
});
