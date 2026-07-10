import { TestBed } from '@angular/core/testing';
import { AdministrationPageComponent } from './administration-page.component';

describe('AdministrationPageComponent', () => {
  it('renders the screen title', async () => {
    const fixture = TestBed.createComponent(AdministrationPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Administração');
  });
});
