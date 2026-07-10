import { TestBed } from '@angular/core/testing';
import { TagComponent } from './tag.component';

describe('TagComponent', () => {
  it('renders the label as plain text when no difficulty is set', async () => {
    const fixture = TestBed.createComponent(TagComponent);
    fixture.componentRef.setInput('label', 'Assinatura');
    fixture.detectChanges();
    await fixture.whenStable();
    const span = fixture.nativeElement.querySelector('span') as HTMLSpanElement;
    expect(span.textContent?.trim()).toBe('Assinatura');
    expect(span.className).toBe('fdr-tag');
  });

  it('applies the difficulty modifier class', async () => {
    const fixture = TestBed.createComponent(TagComponent);
    fixture.componentRef.setInput('label', 'Avançada');
    fixture.componentRef.setInput('difficulty', 'avancada');
    fixture.detectChanges();
    await fixture.whenStable();
    const span = fixture.nativeElement.querySelector('span') as HTMLSpanElement;
    expect(span.classList.contains('fdr-tag--avancada')).toBe(true);
  });
});
