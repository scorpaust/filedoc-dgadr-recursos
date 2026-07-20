import { TestBed } from '@angular/core/testing';
import { AppFooterComponent } from './app-footer.component';

describe('AppFooterComponent', () => {
  it('renders the demo-data disclaimer and the institution name', async () => {
    const fixture = TestBed.createComponent(AppFooterComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('sem dados reais');
    expect(el.textContent).toContain('DGADR');
  });
});
