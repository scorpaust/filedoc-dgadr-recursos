import { TestBed } from '@angular/core/testing';
import { ResourceDetailPageComponent } from './resource-detail-page.component';

describe('ResourceDetailPageComponent', () => {
  it('renders the resource slug received from the route', async () => {
    const fixture = TestBed.createComponent(ResourceDetailPageComponent);
    fixture.componentRef.setInput('slug', 'res-1');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('res-1');
  });
});
