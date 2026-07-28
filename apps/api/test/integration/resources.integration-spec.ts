import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { SESSION_COOKIE_NAME } from '../../src/auth/session-token.util';

const DEMO_PASSWORD = 'Demo123!';
const EMPLOYEE_EMAIL = 'marta.silva@dgadr.gov.pt';
const CONTENT_EDITOR_EMAIL = 'joao.antunes@dgadr.gov.pt';

interface ResourceBody {
  readonly id: string;
  readonly slug: string;
  readonly status: string;
  readonly type: string;
  readonly workflow: string;
  readonly difficulty: string;
  readonly hasFile: boolean;
  readonly hasThumbnail: boolean;
}

interface SearchResponseBody {
  readonly items: readonly ResourceBody[];
  readonly total: number;
}

interface DetailResponseBody {
  readonly resource: ResourceBody;
  readonly related: readonly ResourceBody[];
}

function extractSessionCookie(
  setCookieHeader: readonly string[] | undefined,
): string {
  const cookieHeader = (setCookieHeader ?? []).find((cookie) =>
    cookie.startsWith(`${SESSION_COOKIE_NAME}=`),
  );
  if (!cookieHeader) {
    throw new Error('Cookie de sessão não encontrado na resposta.');
  }
  return cookieHeader.split(';')[0];
}

describe('catálogo/detalhe de recursos — fluxo real via HTTP', () => {
  let app: INestApplication<App>;
  let employeeCookie: string;
  let contentEditorCookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const employeeLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: EMPLOYEE_EMAIL, password: DEMO_PASSWORD })
      .expect(HttpStatus.OK);
    employeeCookie = extractSessionCookie(
      employeeLogin.headers['set-cookie'] as unknown as string[],
    );

    const contentEditorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: CONTENT_EDITOR_EMAIL, password: DEMO_PASSWORD })
      .expect(HttpStatus.OK);
    contentEditorCookie = extractSessionCookie(
      contentEditorLogin.headers['set-cookie'] as unknown as string[],
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /resources', () => {
    it('exige sessão', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/resources')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('devolve só os 16 recursos publicados a um EMPLOYEE, nunca rascunhos/arquivados', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/resources')
        .query({ pageSize: 50 })
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);

      const body = response.body as SearchResponseBody;
      expect(body.total).toBe(16);
      expect(body.items.every((item) => item.status === 'published')).toBe(
        true,
      );
    });

    it('inclui os rascunhos (mas nunca arquivados) para CONTENT_EDITOR', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/resources')
        .query({ pageSize: 50 })
        .set('Cookie', contentEditorCookie)
        .expect(HttpStatus.OK);

      const body = response.body as SearchResponseBody;
      expect(body.total).toBe(21);
      expect(body.items.some((item) => item.status === 'draft')).toBe(true);
      expect(body.items.some((item) => item.status === 'archived')).toBe(false);
    });

    it('pesquisa por texto (título/resumo/etiquetas)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/resources')
        .query({ q: 'despacho' })
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);

      const body = response.body as SearchResponseBody;
      expect(body.items.map((item) => item.slug)).toEqual(
        expect.arrayContaining([
          'assinar-um-despacho-digitalmente',
          'corrigir-a-data-de-um-despacho',
        ]),
      );
    });

    it('filtra por tipo e fluxo em simultâneo', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/resources')
        .query({ type: 'guide', workflow: 'Assinatura' })
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);

      const body = response.body as SearchResponseBody;
      expect(body.total).toBeGreaterThan(0);
      expect(
        body.items.every(
          (item) => item.type === 'guide' && item.workflow === 'Assinatura',
        ),
      ).toBe(true);
    });

    it('pagina com skip/take e ordena por título quando sort=alphabetical', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/resources')
        .query({ pageSize: 5, page: 1, sort: 'alphabetical' })
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);

      const body = response.body as SearchResponseBody;
      expect(body.items).toHaveLength(5);
      const titles = body.items.map((item) => item.slug);
      expect(titles).toEqual([...titles].sort());
    });

    it('rejeita um valor de dificuldade inválido (400)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/resources')
        .query({ difficulty: 'impossivel' })
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /resources/:slug', () => {
    it('exige sessão', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/resources/assinar-um-despacho-digitalmente')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('devolve o recurso publicado com recursos relacionados (mesmo fluxo/etiqueta)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/resources/assinar-um-despacho-digitalmente')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);

      const body = response.body as DetailResponseBody;
      expect(body.resource.slug).toBe('assinar-um-despacho-digitalmente');
      expect(body.related.map((item) => item.slug)).toEqual([
        'assinar-um-oficio-em-lote',
      ]);
    });

    it('devolve 404 genérico para um slug inexistente', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/resources/nao-existe-de-todo')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.NOT_FOUND);

      expect((response.body as { message: string }).message).toBe(
        'Recurso não encontrado.',
      );
    });

    it('devolve exatamente o mesmo 404 genérico para um rascunho sem permissão', async () => {
      const notFound = await request(app.getHttpServer())
        .get('/api/v1/resources/nao-existe-de-todo')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.NOT_FOUND);

      const draftWithoutPermission = await request(app.getHttpServer())
        .get('/api/v1/resources/corrigir-metadados-de-um-oficio')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.NOT_FOUND);

      expect((draftWithoutPermission.body as { message: string }).message).toBe(
        (notFound.body as { message: string }).message,
      );
    });

    it('mostra um rascunho a CONTENT_EDITOR, incluindo o rascunho relacionado', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/resources/assinar-um-despacho-digitalmente')
        .set('Cookie', contentEditorCookie)
        .expect(HttpStatus.OK);

      const body = response.body as DetailResponseBody;
      expect(body.related.map((item) => item.slug).sort()).toEqual([
        'assinar-um-oficio-em-lote',
        'delegar-competencias-de-assinatura',
      ]);
    });

    it('nunca devolve um recurso arquivado, mesmo a um ADMIN', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/resources/localizar-um-processo-arquivado')
        .set('Cookie', contentEditorCookie)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /resources/:id/file e /:id/thumbnail', () => {
    let publishedResourceId: string;
    let draftResourceId: string;

    beforeAll(async () => {
      const published = await request(app.getHttpServer())
        .get('/api/v1/resources/assinar-um-despacho-digitalmente')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);
      publishedResourceId = (published.body as DetailResponseBody).resource.id;

      const draft = await request(app.getHttpServer())
        .get('/api/v1/resources/corrigir-metadados-de-um-oficio')
        .set('Cookie', contentEditorCookie)
        .expect(HttpStatus.OK);
      draftResourceId = (draft.body as DetailResponseBody).resource.id;
    });

    it('exige sessão', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/resources/${publishedResourceId}/file`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('redireciona (302) para o URL pré-assinado do ficheiro, nunca serve os bytes', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/resources/${publishedResourceId}/file`)
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.FOUND);

      expect(response.headers.location).toContain(
        `/dev-seed/resources/assinar-um-despacho-digitalmente/main.pdf`,
      );
      expect(response.body).toEqual({});
    });

    it('redireciona (302) para o URL pré-assinado da miniatura', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/resources/${publishedResourceId}/thumbnail`)
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.FOUND);

      expect(response.headers.location).toContain(
        `/dev-seed/resources/assinar-um-despacho-digitalmente/thumbnail.jpg`,
      );
    });

    it('devolve 404 ao pedir o ficheiro de um rascunho sem permissão', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/resources/${draftResourceId}/file`)
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('devolve 404 para um id de recurso inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/resources/id-que-nao-existe/file')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
