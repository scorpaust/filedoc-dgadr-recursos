import { TestBed } from '@angular/core/testing';
import { RoutePlaceholderComponent } from './route-placeholder.component';

describe('RoutePlaceholderComponent', () => {
  it('renders the screen title and the future-phase note', async () => {
    const fixture = TestBed.createComponent(RoutePlaceholderComponent);
    fixture.componentRef.setInput('title', 'Catálogo de recursos');
    fixture.componentRef.setInput('futurePhaseLabel', 'Fase 3');
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-route-placeholder__title')?.textContent).toContain(
      'Catálogo de recursos',
    );
    expect(el.querySelector('.fdr-route-placeholder__phase')?.textContent).toContain('Fase 3');
  });

  it('renders the optional description only when provided', async () => {
    const fixture = TestBed.createComponent(RoutePlaceholderComponent);
    fixture.componentRef.setInput('title', 'Suporte');
    fixture.componentRef.setInput('futurePhaseLabel', 'Fase 5');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.fdr-route-placeholder__description')).toBeNull();
  });
});
