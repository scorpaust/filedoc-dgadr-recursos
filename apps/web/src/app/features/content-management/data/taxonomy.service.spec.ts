import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TaxonomyService } from './taxonomy.service';

const API_WORKFLOW = { id: 'wf-1', label: 'Assinatura', order: 1, active: true };

describe('TaxonomyService', () => {
  let service: TaxonomyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaxonomyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('list(kind) pede GET /taxonomies/:kind e mapeia para o modelo do frontend', () => {
    const next = vi.fn();
    service.list('workflow').subscribe(next);

    const req = httpMock.expectOne('/taxonomies/workflow');
    expect(req.request.method).toBe('GET');
    req.flush([API_WORKFLOW]);

    expect(next).toHaveBeenCalledWith([
      { id: 'wf-1', kind: 'workflow', label: 'Assinatura', order: 1, active: true },
    ]);
  });

  it('list() sem tipo agrega os três tipos de taxonomia', () => {
    const next = vi.fn();
    service.list().subscribe(next);

    httpMock.expectOne('/taxonomies/workflow').flush([API_WORKFLOW]);
    httpMock
      .expectOne('/taxonomies/documentType')
      .flush([{ id: 'dt-1', label: 'Despacho', order: 1, active: true }]);
    httpMock
      .expectOne('/taxonomies/tag')
      .flush([{ id: 'tag-1', label: 'urgente', order: 1, active: true }]);

    expect(next).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'wf-1', kind: 'workflow' }),
      expect.objectContaining({ id: 'dt-1', kind: 'documentType' }),
      expect.objectContaining({ id: 'tag-1', kind: 'tag' }),
    ]);
  });

  it('create pede POST /taxonomies/:kind com o nome', () => {
    const next = vi.fn();
    service.create('tag', 'Nova etiqueta').subscribe(next);

    const req = httpMock.expectOne('/taxonomies/tag');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Nova etiqueta' });
    req.flush({ id: 'tag-2', label: 'Nova etiqueta', order: 1, active: true });

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ id: 'tag-2', kind: 'tag' }));
  });

  it('update/toggleActive/reorder/delete resolvem o tipo a partir de uma listagem anterior', () => {
    service.list('workflow').subscribe();
    httpMock.expectOne('/taxonomies/workflow').flush([API_WORKFLOW]);

    const updateNext = vi.fn();
    service.update('wf-1', 'Assinatura Digital').subscribe(updateNext);
    const updateReq = httpMock.expectOne('/taxonomies/workflow/wf-1');
    expect(updateReq.request.method).toBe('PATCH');
    expect(updateReq.request.body).toEqual({ name: 'Assinatura Digital' });
    updateReq.flush({ ...API_WORKFLOW, label: 'Assinatura Digital' });
    expect(updateNext).toHaveBeenCalled();

    const toggleNext = vi.fn();
    service.toggleActive('wf-1').subscribe(toggleNext);
    const toggleReq = httpMock.expectOne('/taxonomies/workflow/wf-1/toggle-active');
    expect(toggleReq.request.method).toBe('PATCH');
    toggleReq.flush({ ...API_WORKFLOW, active: false });
    expect(toggleNext).toHaveBeenCalled();

    const reorderNext = vi.fn();
    service.reorder('wf-1', 'down').subscribe(reorderNext);
    const reorderReq = httpMock.expectOne('/taxonomies/workflow/reorder');
    expect(reorderReq.request.method).toBe('POST');
    expect(reorderReq.request.body).toEqual({ id: 'wf-1', direction: 'down' });
    reorderReq.flush([API_WORKFLOW]);
    expect(reorderNext).toHaveBeenCalled();

    const deleteNext = vi.fn();
    service.delete('wf-1').subscribe(deleteNext);
    const deleteReq = httpMock.expectOne('/taxonomies/workflow/wf-1');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);
    expect(deleteNext).toHaveBeenCalled();
  });

  it('propaga um erro genérico ao mutar um id nunca listado (tipo desconhecido)', () => {
    const onError = vi.fn();
    service.delete('nunca-listado').subscribe({ error: onError });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) as unknown }),
    );
    httpMock.expectNone('/taxonomies/workflow/nunca-listado');
  });

  it('traduz a mensagem de erro devolvida pela API ao eliminar uma taxonomia em uso', () => {
    service.list('workflow').subscribe();
    httpMock.expectOne('/taxonomies/workflow').flush([API_WORKFLOW]);

    const onError = vi.fn();
    service.delete('wf-1').subscribe({ error: onError });

    httpMock
      .expectOne('/taxonomies/workflow/wf-1')
      .flush(
        { message: 'Não é possível eliminar; existem recursos associados.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Não é possível eliminar; existem recursos associados.',
      }),
    );
  });
});
