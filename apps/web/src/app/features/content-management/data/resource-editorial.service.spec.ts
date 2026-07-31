import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ResourceFormInput } from './resource-form-input.model';
import { ResourceEditorialService } from './resource-editorial.service';

const API_RESOURCE = {
  id: 'res-1',
  slug: 'exemplo',
  title: 'Recurso de exemplo',
  summary: 'Resumo',
  description: 'Descrição',
  type: 'video' as const,
  workflow: 'Assinatura',
  documentType: 'Despacho',
  difficulty: 'iniciacao' as const,
  tags: ['assinatura'],
  duration: '3:00',
  publishedAt: '2026-07-01',
  updatedAt: '2026-07-01',
  status: 'draft' as const,
  author: 'João Antunes',
  hasFile: false,
  hasThumbnail: false,
};

function baseInput(overrides: Partial<ResourceFormInput> = {}): ResourceFormInput {
  return {
    title: 'Recurso de exemplo',
    slug: 'exemplo',
    summary: 'Resumo',
    description: 'Descrição',
    type: 'video',
    workflow: 'Assinatura',
    documentType: 'Despacho',
    difficulty: 'iniciacao',
    tags: ['assinatura'],
    ...overrides,
  };
}

describe('ResourceEditorialService', () => {
  let service: ResourceEditorialService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ResourceEditorialService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listAllForManagement envia o estado e a pesquisa como parâmetros de consulta', () => {
    const next = vi.fn();
    service.listAllForManagement({ status: 'draft', query: 'exemplo' }).subscribe(next);

    const req = httpMock.expectOne((request) => request.url === '/resources/management');
    expect(req.request.params.get('status')).toBe('draft');
    expect(req.request.params.get('q')).toBe('exemplo');
    req.flush([API_RESOURCE]);

    expect(next).toHaveBeenCalledWith([expect.objectContaining({ id: 'res-1' })]);
  });

  it('getByIdForManagement devolve undefined para um 404', () => {
    const next = vi.fn();
    service.getByIdForManagement('inexistente').subscribe(next);

    httpMock.expectOne('/resources/management/inexistente').flush(null, {
      status: 404,
      statusText: 'Not Found',
    });

    expect(next).toHaveBeenCalledWith(undefined);
  });

  it('create envia os metadados sem ficheiros quando nenhum é selecionado', () => {
    const next = vi.fn();
    service.create(baseInput()).subscribe(next);

    const createReq = httpMock.expectOne('/resources');
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toMatchObject({
      title: 'Recurso de exemplo',
      resourceType: 'video',
    });
    createReq.flush(API_RESOURCE);

    httpMock.expectOne('/resources/management/res-1').flush(API_RESOURCE);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ id: 'res-1' }));
  });

  it('create carrega o ficheiro principal e a miniatura reais (init, PUT direto, confirm)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const mainFile = new File(['video'], 'video.mp4', { type: 'video/mp4' });
    const thumbnailFile = new File(['img'], 'thumb.jpg', { type: 'image/jpeg' });
    const next = vi.fn();
    service.create(baseInput({ mainFile, thumbnailFile })).subscribe(next);

    httpMock.expectOne('/resources').flush(API_RESOURCE);

    const mainInit = httpMock.expectOne('/resources/res-1/upload-url');
    expect(mainInit.request.body).toEqual({
      context: 'video',
      phase: 'init',
      fileName: 'video.mp4',
      mimeType: 'video/mp4',
      sizeBytes: mainFile.size,
    });
    mainInit.flush({
      mode: 'single',
      objectKey: 'videos/abc.mp4',
      uploadUrl: 'https://storage.example/main',
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example/main',
      expect.objectContaining({ method: 'PUT', body: mainFile }),
    );

    const mainConfirm = httpMock.expectOne('/resources/res-1/upload-url');
    expect(mainConfirm.request.body).toEqual({
      context: 'video',
      phase: 'confirm',
      fileName: 'video.mp4',
      mimeType: 'video/mp4',
      objectKey: 'videos/abc.mp4',
    });
    mainConfirm.flush({});

    const thumbnailInit = httpMock.expectOne('/resources/res-1/upload-url');
    expect(thumbnailInit.request.body).toMatchObject({ context: 'thumbnail', phase: 'init' });
    thumbnailInit.flush({
      mode: 'single',
      objectKey: 'thumbnails/def.jpg',
      uploadUrl: 'https://storage.example/thumb',
    });

    await Promise.resolve();
    await Promise.resolve();

    const thumbnailConfirm = httpMock.expectOne('/resources/res-1/upload-url');
    expect(thumbnailConfirm.request.body).toMatchObject({
      context: 'thumbnail',
      phase: 'confirm',
      objectKey: 'thumbnails/def.jpg',
    });
    thumbnailConfirm.flush({});

    httpMock
      .expectOne('/resources/management/res-1')
      .flush({ ...API_RESOURCE, hasFile: true, hasThumbnail: true });

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'res-1', videoUrl: expect.any(String) as unknown }),
    );
  });

  it('propaga um erro amigável quando o carregamento devolve o modo "multipart"', async () => {
    const mainFile = new File(['video'], 'video.mp4', { type: 'video/mp4' });
    const onError = vi.fn();
    service.create(baseInput({ mainFile })).subscribe({ error: onError });

    httpMock.expectOne('/resources').flush(API_RESOURCE);
    httpMock
      .expectOne('/resources/res-1/upload-url')
      .flush({ mode: 'multipart', objectKey: 'videos/abc.mp4' });

    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('demasiado grande') as unknown }),
    );
  });

  it('update envia um PATCH e reobtém o recurso', () => {
    const next = vi.fn();
    service.update('res-1', baseInput()).subscribe(next);

    const req = httpMock.expectOne('/resources/res-1');
    expect(req.request.method).toBe('PATCH');
    req.flush(API_RESOURCE);

    httpMock.expectOne('/resources/management/res-1').flush(API_RESOURCE);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ id: 'res-1' }));
  });

  it.each([
    ['duplicate', '/resources/res-1/duplicate'],
    ['publish', '/resources/res-1/publish'],
    ['unpublish', '/resources/res-1/unpublish'],
    ['archive', '/resources/res-1/archive'],
    ['restore', '/resources/res-1/restore'],
  ] as const)('%s pede POST %s', (method, url) => {
    const next = vi.fn();
    service[method]('res-1').subscribe(next);

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    req.flush(API_RESOURCE);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ id: 'res-1' }));
  });
});
