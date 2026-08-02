import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { TaxonomySummaryComponent } from './taxonomy-summary.component';

const API_ITEM = { id: 'id-1', label: 'Etiqueta', order: 1, active: true };

describe('TaxonomySummaryComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushCounts(): void {
    httpMock.expectOne('/taxonomies/workflow').flush([API_ITEM]);
    httpMock.expectOne('/taxonomies/documentType').flush([API_ITEM]);
    httpMock.expectOne('/taxonomies/tag').flush([API_ITEM]);
  }

  it('shows the count of active workflows, document types and tags', () => {
    const fixture = TestBed.createComponent(TaxonomySummaryComponent);
    fixture.detectChanges();
    flushCounts();
    fixture.detectChanges();

    const counts = Array.from(
      fixture.nativeElement.querySelectorAll('.fdr-taxonomy-summary__count dd'),
    ).map((element) => Number((element as HTMLElement).textContent));
    expect(counts).toHaveLength(3);
    expect(counts.every((count) => count > 0)).toBe(true);
  });

  it('links to the taxonomies tab of the content management page', () => {
    const fixture = TestBed.createComponent(TaxonomySummaryComponent);
    fixture.detectChanges();
    flushCounts();
    fixture.detectChanges();

    // O valor tem de coincidir com o `ContentTab` interno lido por `ContentManagementPageComponent`
    // (inglês, "taxonomies") — não com o rótulo em português mostrado na aba ("Taxonomias").
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/conteudos?tab=taxonomies');
  });
});
