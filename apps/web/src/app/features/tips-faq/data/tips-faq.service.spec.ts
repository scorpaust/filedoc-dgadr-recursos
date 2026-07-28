import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TipsFaqService } from './tips-faq.service';

describe('TipsFaqService', () => {
  let service: TipsFaqService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TipsFaqService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getTips pede GET /tips e devolve a resposta tal como recebida', () => {
    const next = vi.fn();
    service.getTips().subscribe(next);

    const req = httpMock.expectOne('/tips');
    expect(req.request.method).toBe('GET');
    const tips = [
      { id: 'seed-tip-1', text: 'Exemplo', status: 'published' as const, sortOrder: 1 },
    ];
    req.flush(tips);

    expect(next).toHaveBeenCalledWith(tips);
  });

  it('getFaqs pede GET /faqs e devolve a resposta tal como recebida', () => {
    const next = vi.fn();
    service.getFaqs().subscribe(next);

    const req = httpMock.expectOne('/faqs');
    expect(req.request.method).toBe('GET');
    const faqs = [
      {
        id: 'seed-faq-1',
        question: 'Pergunta?',
        answer: 'Resposta.',
        category: 'Categoria',
        status: 'published' as const,
        sortOrder: 1,
      },
    ];
    req.flush(faqs);

    expect(next).toHaveBeenCalledWith(faqs);
  });
});
