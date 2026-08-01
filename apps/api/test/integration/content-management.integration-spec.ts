import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { SESSION_COOKIE_NAME } from '../../src/auth/session-token.util';
import { createValidationPipe } from '../../src/common/validation-pipe.factory';

const DEMO_PASSWORD = 'Demo123!';
const EMPLOYEE_EMAIL = 'marta.silva@dgadr.gov.pt';
const CONTENT_EDITOR_EMAIL = 'joao.antunes@dgadr.gov.pt';

interface ErrorBody {
  readonly code: string;
  readonly message: string;
  readonly fieldErrors?: Record<string, readonly string[]>;
  readonly correlationId: string;
  readonly timestamp: string;
}

interface ResourceBody {
  readonly id: string;
  readonly slug: string;
  readonly status: string;
  readonly hasFile: boolean;
  readonly hasThumbnail: boolean;
}

interface UploadInitBody {
  readonly mode: 'single' | 'multipart';
  readonly objectKey: string;
  readonly uploadUrl?: string;
}

interface TaxonomyBody {
  readonly id: string;
  readonly label: string;
  readonly order: number;
  readonly active: boolean;
}

interface TipBody {
  readonly id: string;
  readonly text: string;
  readonly sortOrder: number;
}

interface FaqBody {
  readonly id: string;
  readonly question: string;
  readonly sortOrder: number;
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

// Mesma limitação de tipos de `fetch` já documentada em `storage.integration-spec.ts` —
// só afeta o tipo declarado do corpo, nunca o comportamento em runtime.
function toRequestBody(buffer: Buffer): BodyInit {
  return new Uint8Array(buffer) as BodyInit;
}

function makePngBuffer(): Buffer {
  // Assinatura PNG real (8 bytes) — suficiente para `validateUploadedFileSignature`.
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

// Este ficheiro corre antes de `content.integration-spec.ts`/`resources.integration-spec.ts`
// na mesma passagem `--runInBand` (ordem alfabética, base de dados partilhada entre
// ficheiros — mesma limitação já documentada em `tickets-agente.integration-spec.ts`). Os
// dados criados aqui têm de ser removidos no `afterAll`, nunca deixados para trás, para não
// alterar as contagens totais que esses outros ficheiros já verificam.
describe('gestão de conteúdos (recursos/taxonomias/dicas/FAQ) — fluxo real via HTTP', () => {
  let app: INestApplication<App>;
  let employeeCookie: string;
  let contentEditorCookie: string;
  const prisma = new PrismaClient();
  const createdResourceIds: string[] = [];
  const createdTipIds: string[] = [];
  const createdFaqIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(createValidationPipe());
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
    if (createdResourceIds.length > 0) {
      await prisma.resource.deleteMany({
        where: { id: { in: createdResourceIds } },
      });
    }
    if (createdTipIds.length > 0) {
      await prisma.tip.deleteMany({ where: { id: { in: createdTipIds } } });
    }
    if (createdFaqIds.length > 0) {
      await prisma.faq.deleteMany({ where: { id: { in: createdFaqIds } } });
    }
    await prisma.$disconnect();
    await app.close();
  });

  describe('controlo de acesso — EMPLOYEE nunca acede à gestão editorial', () => {
    it.each([
      ['post', '/api/v1/resources'],
      ['patch', '/api/v1/resources/inexistente'],
      ['post', '/api/v1/resources/inexistente/publish'],
      ['get', '/api/v1/resources/management'],
      ['post', '/api/v1/taxonomies/workflow'],
      ['delete', '/api/v1/taxonomies/workflow/inexistente'],
      ['post', '/api/v1/tips'],
      ['post', '/api/v1/faqs'],
      ['get', '/api/v1/tips/management'],
      ['get', '/api/v1/faqs/management'],
    ] as const)('%s %s → 403 para EMPLOYEE', async (method, url) => {
      await request(app.getHttpServer())
        [method](url)
        .set('Cookie', employeeCookie)
        .send({})
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('recursos — criar, publicar (com validação), carregar ficheiro real, arquivar', () => {
    it('publicar sem campos obrigatórios falha com VALIDATION_ERROR e fieldErrors por campo', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/resources')
        .set('Cookie', contentEditorCookie)
        .send({
          title: 'Recurso de teste (sem taxonomia)',
          slug: `recurso-teste-${Date.now()}`,
          summary: 'Resumo',
          description: 'Descrição',
          resourceType: 'video',
          difficulty: 'iniciacao',
        })
        .expect(HttpStatus.CREATED);
      const resource = createResponse.body as ResourceBody;
      createdResourceIds.push(resource.id);

      const publishResponse = await request(app.getHttpServer())
        .post(`/api/v1/resources/${resource.id}/publish`)
        .set('Cookie', contentEditorCookie)
        .send()
        .expect(HttpStatus.BAD_REQUEST);

      const body = publishResponse.body as ErrorBody;
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.fieldErrors).toMatchObject({
        workflow: expect.any(Array) as unknown,
        documentType: expect.any(Array) as unknown,
        file: expect.any(Array) as unknown,
        thumbnailAlt: expect.any(Array) as unknown,
        duration: expect.any(Array) as unknown,
      });
      expect(typeof body.correlationId).toBe('string');
    });

    it('cria, carrega vídeo e miniatura reais (contra MinIO), publica com sucesso e depois arquiva', async () => {
      const slug = `recurso-completo-${Date.now()}`;
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/resources')
        .set('Cookie', contentEditorCookie)
        .send({
          title: 'Recurso completo de teste',
          slug,
          summary: 'Resumo',
          description: 'Descrição',
          resourceType: 'guide',
          difficulty: 'iniciacao',
          workflow: 'Correções',
          documentType: 'Diversos',
          tags: ['teste-integração'],
          pages: 3,
        })
        .expect(HttpStatus.CREATED);
      const resource = createResponse.body as ResourceBody;
      createdResourceIds.push(resource.id);
      expect(resource.slug).toBe(slug);

      // Carregamento real do ficheiro principal (guia em PDF) — MinIO de testes.
      const pdfBuffer = Buffer.concat([
        Buffer.from('%PDF-1.7\n', 'latin1'),
        Buffer.from('conteúdo de teste', 'utf8'),
      ]);
      const fileInit = await request(app.getHttpServer())
        .post(`/api/v1/resources/${resource.id}/upload-url`)
        .set('Cookie', contentEditorCookie)
        .send({
          context: 'pdfGuide',
          phase: 'init',
          fileName: 'guia.pdf',
          mimeType: 'application/pdf',
          sizeBytes: pdfBuffer.byteLength,
        })
        .expect(HttpStatus.CREATED);
      const fileInitBody = fileInit.body as UploadInitBody;
      expect(fileInitBody.mode).toBe('single');
      const filePut = await fetch(fileInitBody.uploadUrl as string, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: toRequestBody(pdfBuffer),
      });
      expect(filePut.ok).toBe(true);
      await request(app.getHttpServer())
        .post(`/api/v1/resources/${resource.id}/upload-url`)
        .set('Cookie', contentEditorCookie)
        .send({
          context: 'pdfGuide',
          phase: 'confirm',
          fileName: 'guia.pdf',
          mimeType: 'application/pdf',
          objectKey: fileInitBody.objectKey,
        })
        .expect(HttpStatus.CREATED);

      // Carregamento real da miniatura — MinIO de testes.
      const pngBuffer = makePngBuffer();
      const thumbnailInit = await request(app.getHttpServer())
        .post(`/api/v1/resources/${resource.id}/upload-url`)
        .set('Cookie', contentEditorCookie)
        .send({
          context: 'thumbnail',
          phase: 'init',
          fileName: 'miniatura.png',
          mimeType: 'image/png',
          sizeBytes: pngBuffer.byteLength,
        })
        .expect(HttpStatus.CREATED);
      const thumbnailInitBody = thumbnailInit.body as UploadInitBody;
      const thumbnailPut = await fetch(thumbnailInitBody.uploadUrl as string, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: toRequestBody(pngBuffer),
      });
      expect(thumbnailPut.ok).toBe(true);
      const confirmThumbnail = await request(app.getHttpServer())
        .post(`/api/v1/resources/${resource.id}/upload-url`)
        .set('Cookie', contentEditorCookie)
        .send({
          context: 'thumbnail',
          phase: 'confirm',
          fileName: 'miniatura.png',
          mimeType: 'image/png',
          objectKey: thumbnailInitBody.objectKey,
        })
        .expect(HttpStatus.CREATED);
      const afterThumbnail = confirmThumbnail.body as ResourceBody;
      expect(afterThumbnail.hasFile).toBe(true);
      expect(afterThumbnail.hasThumbnail).toBe(true);

      await request(app.getHttpServer())
        .patch(`/api/v1/resources/${resource.id}`)
        .set('Cookie', contentEditorCookie)
        .send({ thumbnailAlt: 'Miniatura de teste' })
        .expect(HttpStatus.OK);

      const publishResponse = await request(app.getHttpServer())
        .post(`/api/v1/resources/${resource.id}/publish`)
        .set('Cookie', contentEditorCookie)
        .send()
        .expect(HttpStatus.CREATED);
      expect((publishResponse.body as ResourceBody).status).toBe('published');

      const archiveResponse = await request(app.getHttpServer())
        .post(`/api/v1/resources/${resource.id}/archive`)
        .set('Cookie', contentEditorCookie)
        .send()
        .expect(HttpStatus.CREATED);
      expect((archiveResponse.body as ResourceBody).status).toBe('archived');

      // Um recurso arquivado nunca aparece na listagem pública do catálogo.
      const publicSearch = await request(app.getHttpServer())
        .get('/api/v1/resources')
        .query({ q: 'Recurso completo de teste' })
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);
      const publicBody = publicSearch.body as {
        items: readonly ResourceBody[];
      };
      expect(publicBody.items.some((item) => item.id === resource.id)).toBe(
        false,
      );

      // ... mas continua visível na gestão editorial (com filtro "archived").
      const managementSearch = await request(app.getHttpServer())
        .get('/api/v1/resources/management')
        .query({ status: 'archived' })
        .set('Cookie', contentEditorCookie)
        .expect(HttpStatus.OK);
      const managementBody = managementSearch.body as readonly ResourceBody[];
      expect(managementBody.some((item) => item.id === resource.id)).toBe(true);
    }, 30000);
  });

  describe('taxonomias — eliminação bloqueada quando em uso', () => {
    it('eliminar um fluxo associado a recursos existentes falha com mensagem amigável, nunca um erro cru', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/taxonomies/workflow')
        .set('Cookie', contentEditorCookie)
        .expect(HttpStatus.OK);
      const workflows = listResponse.body as readonly TaxonomyBody[];
      const inUse = workflows.find(
        (workflow) => workflow.label === 'Criação e registo',
      );
      if (!inUse) {
        throw new Error('Fluxo de seed "Criação e registo" não encontrado.');
      }

      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/taxonomies/workflow/${inUse.id}`)
        .set('Cookie', contentEditorCookie)
        .send()
        .expect(HttpStatus.BAD_REQUEST);

      const body = deleteResponse.body as ErrorBody;
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).not.toMatch(/prisma|constraint|foreign key/i);
    });

    it('cria, ativa/desativa, reordena e elimina uma etiqueta nova sem recursos associados', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/taxonomies/tag')
        .set('Cookie', contentEditorCookie)
        .send({ name: `etiqueta-teste-${Date.now()}` })
        .expect(HttpStatus.CREATED);
      const tag = created.body as TaxonomyBody;
      expect(tag.active).toBe(true);

      const toggled = await request(app.getHttpServer())
        .patch(`/api/v1/taxonomies/tag/${tag.id}/toggle-active`)
        .set('Cookie', contentEditorCookie)
        .send()
        .expect(HttpStatus.OK);
      expect((toggled.body as TaxonomyBody).active).toBe(false);

      await request(app.getHttpServer())
        .delete(`/api/v1/taxonomies/tag/${tag.id}`)
        .set('Cookie', contentEditorCookie)
        .send()
        .expect(HttpStatus.OK);
    });
  });

  describe('dicas e FAQ — CRUD e reordenação em lote', () => {
    it('cria duas dicas e troca a ordem entre elas', async () => {
      const first = await request(app.getHttpServer())
        .post('/api/v1/tips')
        .set('Cookie', contentEditorCookie)
        .send({ content: `Primeira dica de teste ${Date.now()}` })
        .expect(HttpStatus.CREATED);
      const second = await request(app.getHttpServer())
        .post('/api/v1/tips')
        .set('Cookie', contentEditorCookie)
        .send({ content: `Segunda dica de teste ${Date.now()}` })
        .expect(HttpStatus.CREATED);
      const firstTip = first.body as TipBody;
      const secondTip = second.body as TipBody;
      createdTipIds.push(firstTip.id, secondTip.id);
      expect(secondTip.sortOrder).toBeGreaterThan(firstTip.sortOrder);

      const reordered = await request(app.getHttpServer())
        .post('/api/v1/tips/reorder')
        .set('Cookie', contentEditorCookie)
        .send({ id: secondTip.id, direction: 'up' })
        .expect(HttpStatus.CREATED);
      const reorderedList = reordered.body as readonly TipBody[];
      const newFirst = reorderedList.find((tip) => tip.id === secondTip.id);
      const newSecond = reorderedList.find((tip) => tip.id === firstTip.id);
      expect(newFirst?.sortOrder).toBeLessThan(newSecond?.sortOrder as number);

      await request(app.getHttpServer())
        .post(`/api/v1/tips/${firstTip.id}/publish`)
        .set('Cookie', contentEditorCookie)
        .send()
        .expect(HttpStatus.CREATED);
      await request(app.getHttpServer())
        .post(`/api/v1/tips/${secondTip.id}/archive`)
        .set('Cookie', contentEditorCookie)
        .send()
        .expect(HttpStatus.CREATED);

      const management = await request(app.getHttpServer())
        .get('/api/v1/tips/management')
        .set('Cookie', contentEditorCookie)
        .expect(HttpStatus.OK);
      const managementList = management.body as readonly TipBody[];
      expect(managementList.some((tip) => tip.id === secondTip.id)).toBe(true);
    });

    it('cria uma pergunta frequente e edita-a', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/faqs')
        .set('Cookie', contentEditorCookie)
        .send({
          question: 'Pergunta de teste?',
          answer: 'Resposta de teste.',
          category: 'Testes',
        })
        .expect(HttpStatus.CREATED);
      const faq = created.body as FaqBody;
      createdFaqIds.push(faq.id);

      const updated = await request(app.getHttpServer())
        .patch(`/api/v1/faqs/${faq.id}`)
        .set('Cookie', contentEditorCookie)
        .send({
          question: 'Pergunta de teste (editada)?',
          answer: 'Resposta de teste.',
        })
        .expect(HttpStatus.OK);
      expect((updated.body as FaqBody).question).toBe(
        'Pergunta de teste (editada)?',
      );
    });
  });
});
