import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { TaxonomySummaryComponent } from './taxonomy-summary.component';

describe('TaxonomySummaryComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the count of active workflows, document types and tags', async () => {
    const fixture = TestBed.createComponent(TaxonomySummaryComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    const counts = Array.from(
      fixture.nativeElement.querySelectorAll('.fdr-taxonomy-summary__count dd'),
    ).map((element) => Number((element as HTMLElement).textContent));
    expect(counts).toHaveLength(3);
    expect(counts.every((count) => count > 0)).toBe(true);
  });

  it('links to the taxonomies tab of the content management page', async () => {
    const fixture = TestBed.createComponent(TaxonomySummaryComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    // O valor tem de coincidir com o `ContentTab` interno lido por `ContentManagementPageComponent`
    // (inglês, "taxonomies") — não com o rótulo em português mostrado na aba ("Taxonomias").
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/conteudos?tab=taxonomies');
  });
});
