import { TestBed } from '@angular/core/testing';
import { ContentManagementPageComponent } from './content-management-page.component';

describe('ContentManagementPageComponent', () => {
  it('renders the screen title', async () => {
    const fixture = TestBed.createComponent(ContentManagementPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Conteúdos');
  });
});
