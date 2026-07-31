import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TipsFaqEditorialService } from './tips-faq-editorial.service';

const API_TIP = {
  id: 'tip-1',
  text: 'Confirme os metadados.',
  status: 'draft' as const,
  sortOrder: 1,
};
const API_FAQ = {
  id: 'faq-1',
  question: 'Pergunta?',
  answer: 'Resposta.',
  category: 'Testes',
  status: 'draft' as const,
  sortOrder: 1,
};

describe('TipsFaqEditorialService', () => {
  let service: TipsFaqEditorialService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TipsFaqEditorialService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listAllTips/listAllFaqs pedem GET .../management', () => {
    const tipsNext = vi.fn();
    service.listAllTips().subscribe(tipsNext);
    httpMock.expectOne('/tips/management').flush([API_TIP]);
    expect(tipsNext).toHaveBeenCalledWith([expect.objectContaining({ id: 'tip-1' })]);

    const faqsNext = vi.fn();
    service.listAllFaqs().subscribe(faqsNext);
    httpMock.expectOne('/faqs/management').flush([API_FAQ]);
    expect(faqsNext).toHaveBeenCalledWith([expect.objectContaining({ id: 'faq-1' })]);
  });

  it('createTip/updateTip enviam o conteúdo, nunca um título', () => {
    const createNext = vi.fn();
    service.createTip('Novo texto').subscribe(createNext);
    const createReq = httpMock.expectOne('/tips');
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual({ content: 'Novo texto' });
    createReq.flush(API_TIP);
    expect(createNext).toHaveBeenCalled();

    const updateNext = vi.fn();
    service.updateTip('tip-1', 'Texto atualizado').subscribe(updateNext);
    const updateReq = httpMock.expectOne('/tips/tip-1');
    expect(updateReq.request.method).toBe('PATCH');
    expect(updateReq.request.body).toEqual({ content: 'Texto atualizado' });
    updateReq.flush(API_TIP);
    expect(updateNext).toHaveBeenCalled();
  });

  it.each([
    ['publishTip', '/tips/tip-1/publish'],
    ['unpublishTip', '/tips/tip-1/unpublish'],
    ['archiveTip', '/tips/tip-1/archive'],
    ['restoreTip', '/tips/tip-1/restore'],
  ] as const)('%s pede POST %s', (method, url) => {
    const next = vi.fn();
    service[method]('tip-1').subscribe(next);
    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    req.flush(API_TIP);
    expect(next).toHaveBeenCalled();
  });

  it('reorderTip pede POST /tips/reorder com o id e a direção', () => {
    const next = vi.fn();
    service.reorderTip('tip-1', 'up').subscribe(next);
    const req = httpMock.expectOne('/tips/reorder');
    expect(req.request.body).toEqual({ id: 'tip-1', direction: 'up' });
    req.flush([API_TIP]);
    expect(next).toHaveBeenCalledWith([expect.objectContaining({ id: 'tip-1' })]);
  });

  it('createFaq/updateFaq enviam a pergunta, resposta e categoria opcional', () => {
    const createNext = vi.fn();
    service
      .createFaq({ question: 'Pergunta?', answer: 'Resposta.', category: 'Testes' })
      .subscribe(createNext);
    const createReq = httpMock.expectOne('/faqs');
    expect(createReq.request.body).toEqual({
      question: 'Pergunta?',
      answer: 'Resposta.',
      category: 'Testes',
    });
    createReq.flush(API_FAQ);
    expect(createNext).toHaveBeenCalled();

    const updateNext = vi.fn();
    service.updateFaq('faq-1', { question: 'Editada?', answer: 'Resposta.' }).subscribe(updateNext);
    const updateReq = httpMock.expectOne('/faqs/faq-1');
    expect(updateReq.request.method).toBe('PATCH');
    updateReq.flush(API_FAQ);
    expect(updateNext).toHaveBeenCalled();
  });

  it.each([
    ['publishFaq', '/faqs/faq-1/publish'],
    ['unpublishFaq', '/faqs/faq-1/unpublish'],
    ['archiveFaq', '/faqs/faq-1/archive'],
    ['restoreFaq', '/faqs/faq-1/restore'],
  ] as const)('%s pede POST %s', (method, url) => {
    const next = vi.fn();
    service[method]('faq-1').subscribe(next);
    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    req.flush(API_FAQ);
    expect(next).toHaveBeenCalled();
  });

  it('reorderFaq pede POST /faqs/reorder com o id e a direção', () => {
    const next = vi.fn();
    service.reorderFaq('faq-1', 'down').subscribe(next);
    const req = httpMock.expectOne('/faqs/reorder');
    expect(req.request.body).toEqual({ id: 'faq-1', direction: 'down' });
    req.flush([API_FAQ]);
    expect(next).toHaveBeenCalledWith([expect.objectContaining({ id: 'faq-1' })]);
  });
});
