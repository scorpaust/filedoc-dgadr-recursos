import { TestBed } from '@angular/core/testing';
import { ResourceCatalogPageComponent } from './resource-catalog-page.component';

describe('ResourceCatalogPageComponent', () => {
  it('renders the screen title', async () => {
    const fixture = TestBed.createComponent(ResourceCatalogPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Catálogo de recursos');
  });
});
