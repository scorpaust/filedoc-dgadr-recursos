import { TestBed } from '@angular/core/testing';
import { Tip } from '../../models';
import { TipCardComponent } from './tip-card.component';

const TIP: Tip = {
  id: 'tip-1',
  text: 'Confirme os metadados antes de submeter um documento.',
  status: 'published',
  sortOrder: 1,
};

describe('TipCardComponent', () => {
  it('renders the tip text alongside a decorative marker', async () => {
    const fixture = TestBed.createComponent(TipCardComponent);
    fixture.componentRef.setInput('tip', TIP);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.querySelector('.fdr-tip-card__text') as HTMLElement;
    const marker = fixture.nativeElement.querySelector('.fdr-tip-card__marker') as HTMLElement;
    expect(text.textContent?.trim()).toBe(TIP.text);
    expect(marker.getAttribute('aria-hidden')).toBe('true');
  });
});
