import { TestBed } from '@angular/core/testing';
import { CarimboComponent } from './carimbo.component';

describe('CarimboComponent', () => {
  it('renders the given label in a monospace stamp', async () => {
    const fixture = TestBed.createComponent(CarimboComponent);
    fixture.componentRef.setInput('label', 'SUP-2026-041392');
    fixture.detectChanges();
    await fixture.whenStable();
    const span = fixture.nativeElement.querySelector('.fdr-carimbo') as HTMLSpanElement;
    expect(span.textContent?.trim()).toBe('SUP-2026-041392');
  });
});
