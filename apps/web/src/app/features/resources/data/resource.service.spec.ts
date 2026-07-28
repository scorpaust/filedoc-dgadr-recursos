import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ResourceService } from './resource.service';

const API_ITEM = {
  id: 'res-1',
  slug: 'assinar-um-despacho-digitalmente',
  title: 'Assinar um despacho digitalmente',
  summary: 'Resumo',
  description: 'Descrição',
  type: 'guide' as const,
  workflow: 'Assinatura',
  documentType: 'Despacho',
  difficulty: 'intermedia' as const,
  tags: ['assinatura'],
  pages: 3,
  publishedAt: '2026-06-25',
  updatedAt: '2026-06-25',
  status: 'published' as const,
  author: 'Ana Ferreira',
  hasFile: true,
  hasThumbnail: true,
};

describe('ResourceService', () => {
  let service: ResourceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ResourceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('search', () => {
    it('envia os filtros como parâmetros de pesquisa e mapeia a resposta', () => {
      const next = vi.fn();
      service
        .search({
          query: 'despacho',
          type: 'guide',
          workflows: ['Assinatura'],
          difficulties: ['intermedia'],
          sort: 'recent',
          page: 2,
          pageSize: 12,
        })
        .subscribe(next);

      const req = httpMock.expectOne((request) => request.url === '/resources');
      expect(req.request.params.get('q')).toBe('despacho');
      expect(req.request.params.get('type')).toBe('guide');
      expect(req.request.params.getAll('workflow')).toEqual(['Assinatura']);
      expect(req.request.params.getAll('difficulty')).toEqual(['intermedia']);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('pageSize')).toBe('12');
      req.flush({ items: [API_ITEM], total: 1 });

      expect(next).toHaveBeenCalledWith({
        total: 1,
        items: [
          expect.objectContaining({
            id: 'res-1',
            slug: 'assinar-um-despacho-digitalmente',
            pdfUrl: 'http://localhost:3000/api/v1/resources/res-1/file',
            thumbnailUrl: 'http://localhost:3000/api/v1/resources/res-1/thumbnail',
            videoUrl: undefined,
          }),
        ],
      });
    });

    it('omite "type" quando "all" e não envia parâmetros de fluxo/dificuldade vazios', () => {
      service
        .search({
          query: '',
          type: 'all',
          workflows: [],
          difficulties: [],
          sort: 'recent',
          page: 1,
          pageSize: 12,
        })
        .subscribe();

      const req = httpMock.expectOne(() => true);
      expect(req.request.params.has('type')).toBe(false);
      expect(req.request.params.has('q')).toBe(false);
      expect(req.request.params.getAll('workflow')).toBeNull();
      req.flush({ items: [], total: 0 });
    });
  });

  describe('getBySlug', () => {
    it('mapeia o recurso e liga relatedResourceIds aos relacionados devolvidos', () => {
      const next = vi.fn();
      service.getBySlug('assinar-um-despacho-digitalmente').subscribe(next);

      const req = httpMock.expectOne('/resources/assinar-um-despacho-digitalmente');
      req.flush({
        resource: API_ITEM,
        related: [{ ...API_ITEM, id: 'res-2', slug: 'assinar-um-oficio-em-lote' }],
      });

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'res-1', relatedResourceIds: ['res-2'] }),
      );
    });

    it('devolve undefined para um 404 (slug inexistente ou rascunho sem permissão)', () => {
      const next = vi.fn();
      service.getBySlug('nao-existe').subscribe(next);

      httpMock
        .expectOne('/resources/nao-existe')
        .flush({ message: 'Recurso não encontrado.' }, { status: 404, statusText: 'Not Found' });

      expect(next).toHaveBeenCalledWith(undefined);
    });

    it('propaga outros erros', () => {
      const onError = vi.fn();
      service.getBySlug('erro').subscribe({ error: onError });

      httpMock
        .expectOne('/resources/erro')
        .flush(null, { status: 500, statusText: 'Internal Server Error' });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('getRelated', () => {
    it('devolve os recursos relacionados em cache após getBySlug, e nada para ids desconhecidos', () => {
      service.getBySlug('assinar-um-despacho-digitalmente').subscribe();
      httpMock.expectOne('/resources/assinar-um-despacho-digitalmente').flush({
        resource: API_ITEM,
        related: [{ ...API_ITEM, id: 'res-2', slug: 'assinar-um-oficio-em-lote' }],
      });

      const next = vi.fn();
      service.getRelated(['res-2', 'id-desconhecido']).subscribe(next);

      expect(next).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'res-2', slug: 'assinar-um-oficio-em-lote' }),
      ]);
    });
  });
});
