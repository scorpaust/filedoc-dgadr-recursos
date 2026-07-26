import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { hashPassword } from '../../src/auth/password.util';
import { SESSION_COOKIE_NAME } from '../../src/auth/session-token.util';

const DEMO_PASSWORD = 'Demo123!';

function extractSessionCookie(setCookieHeader: readonly string[] | undefined): string {
  const cookieHeader = (setCookieHeader ?? []).find((cookie) =>
    cookie.startsWith(`${SESSION_COOKIE_NAME}=`),
  );
  if (!cookieHeader) {
    throw new Error('Cookie de sessão não encontrado na resposta.');
  }
  return cookieHeader.split(';')[0];
}

describe('auth — fluxo real via HTTP (login, /me, logout, alteração de palavra-passe)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('login com um utilizador de seed real devolve o utilizador e um cookie HttpOnly', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'marta.silva@dgadr.gov.pt', password: DEMO_PASSWORD })
      .expect(HttpStatus.OK);

    expect(response.body).toMatchObject({
      email: 'marta.silva@dgadr.gov.pt',
      name: 'Marta Silva',
      roles: ['EMPLOYEE'],
    });
    const setCookie = response.headers['set-cookie'] as unknown as string[] | undefined;
    expect(extractSessionCookie(setCookie)).toContain(`${SESSION_COOKIE_NAME}=`);
    expect((setCookie ?? []).join(';')).toContain('HttpOnly');
  });

  it('credenciais inexistentes e palavra-passe incorreta devolvem sempre a mesma mensagem genérica', async () => {
    const emailInexistente = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ninguem@dgadr.gov.pt', password: 'qualquer' })
      .expect(HttpStatus.UNAUTHORIZED);

    const passwordErrada = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'marta.silva@dgadr.gov.pt', password: 'errada' })
      .expect(HttpStatus.UNAUTHORIZED);

    expect(emailInexistente.body.message).toBe(passwordErrada.body.message);
  });

  it('um utilizador de seed desativado não consegue iniciar sessão', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'paulo.matos@dgadr.gov.pt', password: DEMO_PASSWORD })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('GET /me devolve o utilizador atual com todas as suas funções', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'joao.antunes@dgadr.gov.pt', password: DEMO_PASSWORD })
      .expect(HttpStatus.OK);
    const cookie = extractSessionCookie(login.headers['set-cookie'] as unknown as string[]);

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(HttpStatus.OK);

    expect(me.body.email).toBe('joao.antunes@dgadr.gov.pt');
    expect([...me.body.roles].sort()).toEqual(['ADMIN', 'CONTENT_EDITOR']);
  });

  it('GET /me sem sessão é rejeitado', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(HttpStatus.UNAUTHORIZED);
  });

  it('logout invalida a sessão do lado do servidor — o mesmo cookie deixa de ser aceite a seguir', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'sofia.ramos@dgadr.gov.pt', password: DEMO_PASSWORD })
      .expect(HttpStatus.OK);
    const cookie = extractSessionCookie(login.headers['set-cookie'] as unknown as string[]);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(HttpStatus.UNAUTHORIZED);
  });

  describe('alteração de palavra-passe', () => {
    afterEach(async () => {
      // Repõe a palavra-passe original do seed, para que outros testes (e reexecuções
      // desta suite sem reseeding) continuem a autenticar com a credencial conhecida.
      await prisma.user.update({
        where: { email: 'ana.ferreira@dgadr.gov.pt' },
        data: { passwordHash: await hashPassword(DEMO_PASSWORD) },
      });
    });

    it('exige a palavra-passe atual correta e atualiza o hash com sucesso', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ana.ferreira@dgadr.gov.pt', password: DEMO_PASSWORD })
        .expect(HttpStatus.OK);
      const cookie = extractSessionCookie(login.headers['set-cookie'] as unknown as string[]);

      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Cookie', cookie)
        .send({ currentPassword: DEMO_PASSWORD, newPassword: 'NovaPassword1!' })
        .expect(HttpStatus.NO_CONTENT);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ana.ferreira@dgadr.gov.pt', password: 'NovaPassword1!' })
        .expect(HttpStatus.OK);
    });

    it('rejeita quando a palavra-passe atual está incorreta, sem alterar o hash', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ana.ferreira@dgadr.gov.pt', password: DEMO_PASSWORD })
        .expect(HttpStatus.OK);
      const cookie = extractSessionCookie(login.headers['set-cookie'] as unknown as string[]);

      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Cookie', cookie)
        .send({ currentPassword: 'errada', newPassword: 'NovaPassword1!' })
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ana.ferreira@dgadr.gov.pt', password: DEMO_PASSWORD })
        .expect(HttpStatus.OK);
    });

    it('rejeita sem sessão', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .send({ currentPassword: DEMO_PASSWORD, newPassword: 'NovaPassword1!' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // Corre por último de propósito: consome deliberadamente o limite de tentativas de
  // login configurado para os testes (AUTH_LOGIN_RATE_LIMIT=20, ver .env.test), muito
  // acima do valor de produção (5), precisamente para não interferir com os testes
  // funcionais acima, que também chamam /auth/login várias vezes.
  it('aplica rate limiting às tentativas repetidas de login', async () => {
    const maxAttempts = 25;
    let sawTooManyRequests = false;

    for (let attempt = 0; attempt < maxAttempts && !sawTooManyRequests; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ninguem@dgadr.gov.pt', password: 'errada' });
      if (response.status === HttpStatus.TOO_MANY_REQUESTS) {
        sawTooManyRequests = true;
      }
    }

    expect(sawTooManyRequests).toBe(true);
  }, 30000);
});
