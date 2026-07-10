import { TestBed } from '@angular/core/testing';
import { PillComponent } from './pill.component';

describe('PillComponent', () => {
  it('defaults to the neutral tone', async () => {
    const fixture = TestBed.createComponent(PillComponent);
    fixture.componentRef.setInput('label', 'Baixa');
    fixture.detectChanges();
    await fixture.whenStable();
    const span = fixture.nativeElement.querySelector('.fdr-pill') as HTMLSpanElement;
    expect(span.classList.contains('fdr-pill--neutral')).toBe(true);
  });

  it('applies the given tone and always renders a non-color indicator dot', async () => {
    const fixture = TestBed.createComponent(PillComponent);
    fixture.componentRef.setInput('label', 'Bloqueante');
    fixture.componentRef.setInput('tone', 'danger');
    fixture.detectChanges();
    await fixture.whenStable();
    const span = fixture.nativeElement.querySelector('.fdr-pill') as HTMLSpanElement;
    expect(span.classList.contains('fdr-pill--danger')).toBe(true);
    expect(fixture.nativeElement.querySelector('.fdr-pill__dot')).toBeTruthy();
  });
});
