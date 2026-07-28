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

interface TipBody {
  readonly id: string;
  readonly text: string;
  readonly status: string;
  readonly sortOrder: number;
}

interface FaqBody {
  readonly id: string;
  readonly question: string;
  readonly category?: string;
  readonly status: string;
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

describe('dicas/perguntas frequentes — fluxo real via HTTP', () => {
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

  describe('GET /tips', () => {
    it('exige sessão', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tips')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('devolve só as dicas publicadas a um EMPLOYEE, ordenadas por sortOrder', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tips')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);

      const body = response.body as TipBody[];
      expect(body).toHaveLength(5);
      expect(body.every((tip) => tip.status === 'published')).toBe(true);
      expect(body.map((tip) => tip.sortOrder)).toEqual([1, 2, 3, 4, 5]);
    });

    it('inclui o rascunho para CONTENT_EDITOR', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tips')
        .set('Cookie', contentEditorCookie)
        .expect(HttpStatus.OK);

      const body = response.body as TipBody[];
      expect(body).toHaveLength(6);
      expect(body.some((tip) => tip.status === 'draft')).toBe(true);
    });
  });

  describe('GET /faqs', () => {
    it('exige sessão', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/faqs')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('devolve só as perguntas publicadas a um EMPLOYEE, com a categoria incluída', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/faqs')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);

      const body = response.body as FaqBody[];
      expect(body).toHaveLength(6);
      expect(body.every((faq) => faq.status === 'published')).toBe(true);
      expect(body.find((faq) => faq.id === 'seed-faq-1')?.category).toBe(
        'Acesso e permissões',
      );
      expect(
        body.find((faq) => faq.id === 'seed-faq-6')?.category,
      ).toBeUndefined();
    });

    it('inclui o rascunho para CONTENT_EDITOR', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/faqs')
        .set('Cookie', contentEditorCookie)
        .expect(HttpStatus.OK);

      const body = response.body as FaqBody[];
      expect(body).toHaveLength(7);
      expect(body.some((faq) => faq.status === 'draft')).toBe(true);
    });
  });
});
