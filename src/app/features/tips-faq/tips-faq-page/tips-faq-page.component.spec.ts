import { TestBed } from '@angular/core/testing';
import { TipsFaqPageComponent } from './tips-faq-page.component';

describe('TipsFaqPageComponent', () => {
  it('renders the screen title', async () => {
    const fixture = TestBed.createComponent(TipsFaqPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Dicas & FAQ');
  });
});
