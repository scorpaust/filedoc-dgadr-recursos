import { TestBed } from '@angular/core/testing';
import { SupportManagementPageComponent } from './support-management-page.component';

describe('SupportManagementPageComponent', () => {
  it('renders the screen title', async () => {
    const fixture = TestBed.createComponent(SupportManagementPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Gestão de suporte');
  });
});
