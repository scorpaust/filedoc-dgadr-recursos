import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { hashPassword } from '../../src/auth/password.util';
import { SESSION_COOKIE_NAME } from '../../src/auth/session-token.util';
import { createValidationPipe } from '../../src/common/validation-pipe.factory';

const DEMO_PASSWORD = 'Demo123!';
const EMPLOYEE_EMAIL = 'marta.silva@dgadr.gov.pt';
const SUPPORT_AGENT_EMAIL = 'carlos.vieira@dgadr.gov.pt';
const ADMIN_EMAIL = 'ana.ferreira@dgadr.gov.pt'; // só ADMIN
const CONTENT_EDITOR_ADMIN_EMAIL = 'joao.antunes@dgadr.gov.pt'; // CONTENT_EDITOR + ADMIN

interface ErrorBody {
  readonly code: string;
  readonly message: string;
  readonly fieldErrors?: Record<string, readonly string[]>;
  readonly correlationId: string;
  readonly timestamp: string;
}

interface UserBody {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly status: 'active' | 'inactive';
  readonly lastAccess: string;
}

interface AuditEntryBody {
  readonly id: string;
  readonly actor: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
}

interface AuditSearchBody {
  readonly items: readonly AuditEntryBody[];
  readonly total: number;
}

interface TicketBody {
  readonly id: string;
}

interface ResourceBody {
  readonly id: string;
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

// Este ficheiro nunca deixa os administradores de seed (ana.ferreira/joao.antunes, dos
// quais outros ficheiros de integração dependem) alterados entre testes — os cenários de
// "último ADMIN" isolam-se sempre com um utilizador de teste próprio, repondo os dois
// administradores de seed em `finally`, antes de qualquer outro `it()` correr (mesma
// preocupação de dados partilhados já documentada em tickets-agente.integration-spec.ts/
// content-management.integration-spec.ts, para a mesma base de testes `--runInBand`).
describe('administração e auditoria — fluxo real via HTTP', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();
  let employeeCookie: string;
  let adminCookie: string;
  let adminId: string;
  let contentEditorAdminId: string;
  let agentId: string;
  const createdUserIds: string[] = [];
  const createdTicketIds: string[] = [];
  const createdResourceIds: string[] = [];

  async function loginAs(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: DEMO_PASSWORD })
      .expect(HttpStatus.OK);
    return extractSessionCookie(
      response.headers['set-cookie'] as unknown as string[],
    );
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(createValidationPipe());
    await app.init();

    employeeCookie = await loginAs(EMPLOYEE_EMAIL);
    adminCookie = await loginAs(ADMIN_EMAIL);

    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: ADMIN_EMAIL },
    });
    adminId = admin.id;
    const contentEditorAdmin = await prisma.user.findUniqueOrThrow({
      where: { email: CONTENT_EDITOR_ADMIN_EMAIL },
    });
    contentEditorAdminId = contentEditorAdmin.id;
    const agent = await prisma.user.findUniqueOrThrow({
      where: { email: SUPPORT_AGENT_EMAIL },
    });
    agentId = agent.id;
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.supportTicket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
    if (createdResourceIds.length > 0) {
      await prisma.resource.deleteMany({
        where: { id: { in: createdResourceIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
    await app.close();
  });

  describe('autorização', () => {
    it('rejeita um pedido sem sessão com 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('rejeita um EMPLOYEE (sem ADMIN) em todos os endpoints de administração com 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.FORBIDDEN);
      await request(app.getHttpServer())
        .post('/api/v1/admin/users')
        .set('Cookie', employeeCookie)
        .send({ name: 'X', email: 'x@dgadr.gov.pt', roles: ['EMPLOYEE'] })
        .expect(HttpStatus.FORBIDDEN);
      await request(app.getHttpServer())
        .get('/api/v1/admin/audit-log')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('gestão de utilizadores', () => {
    it('cria um utilizador, nunca devolvendo a palavra-passe nem o respetivo hash', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Utilizador de Teste Fase 8',
          email: 'teste.fase8@dgadr.gov.pt',
          roles: ['EMPLOYEE'],
        })
        .expect(HttpStatus.CREATED);

      const body = response.body as UserBody;
      createdUserIds.push(body.id);
      expect(body).not.toHaveProperty('passwordHash');
      expect(body).not.toHaveProperty('password');
      expect(body.roles).toEqual(['EMPLOYEE']);
      expect(body.status).toBe('active');
    });

    it('rejeita um e-mail já existente com VALIDATION_ERROR', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/users')
        .set('Cookie', adminCookie)
        .send({ name: 'Duplicado', email: EMPLOYEE_EMAIL, roles: ['EMPLOYEE'] })
        .expect(HttpStatus.BAD_REQUEST);

      const body = response.body as ErrorBody;
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.fieldErrors?.email).toBeDefined();
    });

    it('lista utilizadores filtrados por função (interseção)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .query({ roles: 'SUPPORT_AGENT' })
        .set('Cookie', adminCookie)
        .expect(HttpStatus.OK);

      const body = response.body as readonly UserBody[];
      expect(body.some((user) => user.email === SUPPORT_AGENT_EMAIL)).toBe(
        true,
      );
      expect(body.every((user) => user.roles.includes('SUPPORT_AGENT'))).toBe(
        true,
      );
    });

    it('altera o nome de um utilizador', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Nome Original',
          email: 'nome.original.fase8@dgadr.gov.pt',
          roles: ['EMPLOYEE'],
        })
        .expect(HttpStatus.CREATED);
      const userId = (created.body as UserBody).id;
      createdUserIds.push(userId);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${userId}`)
        .set('Cookie', adminCookie)
        .send({ name: 'Nome Atualizado' })
        .expect(HttpStatus.OK);

      expect((response.body as UserBody).name).toBe('Nome Atualizado');
    });

    it('substitui as funções de um utilizador e rejeita um array vazio', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Funções',
          email: 'funcoes.fase8@dgadr.gov.pt',
          roles: ['EMPLOYEE'],
        })
        .expect(HttpStatus.CREATED);
      const userId = (created.body as UserBody).id;
      createdUserIds.push(userId);

      const updated = await request(app.getHttpServer())
        .put(`/api/v1/admin/users/${userId}/roles`)
        .set('Cookie', adminCookie)
        .send({ roles: ['EMPLOYEE', 'SUPPORT_AGENT'] })
        .expect(HttpStatus.OK);
      expect([...(updated.body as UserBody).roles].sort()).toEqual(
        ['EMPLOYEE', 'SUPPORT_AGENT'].sort(),
      );

      const rejected = await request(app.getHttpServer())
        .put(`/api/v1/admin/users/${userId}/roles`)
        .set('Cookie', adminCookie)
        .send({ roles: [] })
        .expect(HttpStatus.BAD_REQUEST);
      expect((rejected.body as ErrorBody).code).toBe('VALIDATION_ERROR');
    });

    it('desativa um utilizador e invalida de imediato as suas sessões existentes', async () => {
      const email = 'sessao.fase8@dgadr.gov.pt';
      const passwordHash = await hashPassword(DEMO_PASSWORD);
      const user = await prisma.user.create({
        data: {
          name: 'Sessão de Teste',
          email,
          passwordHash,
          roles: { create: [{ role: Role.EMPLOYEE }] },
        },
      });
      createdUserIds.push(user.id);
      const sessionCookie = await loginAs(email);

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', sessionCookie)
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .post(`/api/v1/admin/users/${user.id}/deactivate`)
        .set('Cookie', adminCookie)
        .expect(HttpStatus.CREATED);

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', sessionCookie)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('invalida sessões existentes sem desativar a conta', async () => {
      const email = 'invalidar.fase8@dgadr.gov.pt';
      const passwordHash = await hashPassword(DEMO_PASSWORD);
      const user = await prisma.user.create({
        data: {
          name: 'Invalidar Sessões',
          email,
          passwordHash,
          roles: { create: [{ role: Role.EMPLOYEE }] },
        },
      });
      createdUserIds.push(user.id);
      const sessionCookie = await loginAs(email);

      await request(app.getHttpServer())
        .post(`/api/v1/admin/users/${user.id}/invalidate-sessions`)
        .set('Cookie', adminCookie)
        .expect(HttpStatus.NO_CONTENT);

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', sessionCookie)
        .expect(HttpStatus.UNAUTHORIZED);

      // A conta continua ativa — só a sessão anterior foi invalidada.
      await loginAs(email);
    });
  });

  describe('regra do último ADMIN', () => {
    // Reduz temporariamente os administradores de seed a zero, deixando um único
    // utilizador de teste como ADMIN — sempre reposto em `finally`. Seguro porque
    // `--runInBand` serializa os ficheiros de integração entre si, e dentro deste ficheiro
    // os `it()` também correm em série (nunca `test.concurrent`).
    async function withSoleTestAdmin(
      run: (soleAdminCookie: string, soleAdminId: string) => Promise<void>,
    ): Promise<void> {
      const email = `admin-unico-teste-${Date.now()}-${Math.random().toString(36).slice(2)}@dgadr.gov.pt`;
      const passwordHash = await hashPassword(DEMO_PASSWORD);
      const soleAdmin = await prisma.user.create({
        data: {
          name: 'Administrador Único de Teste',
          email,
          passwordHash,
          roles: { create: [{ role: Role.ADMIN }] },
        },
      });

      await prisma.userRole.deleteMany({
        where: {
          role: Role.ADMIN,
          userId: { in: [adminId, contentEditorAdminId] },
        },
      });

      try {
        const soleAdminCookie = await loginAs(email);
        await run(soleAdminCookie, soleAdmin.id);
      } finally {
        await prisma.userRole.createMany({
          data: [
            { userId: adminId, role: Role.ADMIN },
            { userId: contentEditorAdminId, role: Role.ADMIN },
          ],
          skipDuplicates: true,
        });
        await prisma.user.delete({ where: { id: soleAdmin.id } });
      }
    }

    it('bloqueia a remoção de ADMIN do único administrador', async () => {
      await withSoleTestAdmin(async (soleAdminCookie, soleAdminId) => {
        const response = await request(app.getHttpServer())
          .put(`/api/v1/admin/users/${soleAdminId}/roles`)
          .set('Cookie', soleAdminCookie)
          .send({ roles: ['EMPLOYEE'] })
          .expect(HttpStatus.BAD_REQUEST);
        expect((response.body as ErrorBody).fieldErrors?.roles).toBeDefined();
      });
    });

    it('bloqueia a desativação do único administrador', async () => {
      await withSoleTestAdmin(async (soleAdminCookie, soleAdminId) => {
        await request(app.getHttpServer())
          .post(`/api/v1/admin/users/${soleAdminId}/deactivate`)
          .set('Cookie', soleAdminCookie)
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    // Cenário de concorrência real (tarefa C): com exatamente 2 administradores, dois
    // pedidos simultâneos tentam remover ADMIN de cada um deles em paralelo. Sem proteção,
    // ambos poderiam ler "2 administradores" antes de qualquer escrita e deixar o sistema
    // sem nenhum — com a transação `Serializable`, só um pode terminar com sucesso; o outro
    // é bloqueado, quer por reler a regra do último ADMIN já sem margem (`400`), quer por um
    // verdadeiro conflito de serialização do Postgres (`409`).
    async function withTwoTestAdmins(
      run: (
        firstAdmin: { cookie: string; id: string },
        secondAdmin: { cookie: string; id: string },
      ) => Promise<void>,
    ): Promise<void> {
      const passwordHash = await hashPassword(DEMO_PASSWORD);
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const [userA, userB] = await Promise.all([
        prisma.user.create({
          data: {
            name: 'Administrador de Teste A',
            email: `admin-teste-a-${suffix}@dgadr.gov.pt`,
            passwordHash,
            roles: { create: [{ role: Role.ADMIN }] },
          },
        }),
        prisma.user.create({
          data: {
            name: 'Administrador de Teste B',
            email: `admin-teste-b-${suffix}@dgadr.gov.pt`,
            passwordHash,
            roles: { create: [{ role: Role.ADMIN }] },
          },
        }),
      ]);

      await prisma.userRole.deleteMany({
        where: {
          role: Role.ADMIN,
          userId: { in: [adminId, contentEditorAdminId] },
        },
      });

      try {
        const [cookieA, cookieB] = await Promise.all([
          loginAs(userA.email),
          loginAs(userB.email),
        ]);
        await run(
          { cookie: cookieA, id: userA.id },
          { cookie: cookieB, id: userB.id },
        );
      } finally {
        await prisma.userRole.createMany({
          data: [
            { userId: adminId, role: Role.ADMIN },
            { userId: contentEditorAdminId, role: Role.ADMIN },
          ],
          skipDuplicates: true,
        });
        await prisma.user.deleteMany({
          where: { id: { in: [userA.id, userB.id] } },
        });
      }
    }

    it('sob concorrência, dois pedidos a remover ADMIN de cada um dos dois últimos administradores — só um tem sucesso', async () => {
      await withTwoTestAdmins(async (adminA, adminB) => {
        const removeAdminRole = (target: { cookie: string; id: string }) =>
          request(app.getHttpServer())
            .put(`/api/v1/admin/users/${target.id}/roles`)
            .set('Cookie', target.cookie)
            .send({ roles: ['EMPLOYEE'] });

        const [first, second] = await Promise.all([
          removeAdminRole(adminA),
          removeAdminRole(adminB),
        ]);
        // Ordem ascendente: o sucesso (200) fica sempre no índice 0, o bloqueio (400/409)
        // no índice 1 — nunca os dois com sucesso, nem os dois bloqueados.
        const statuses = [first.status, second.status].sort((a, b) => a - b);

        expect(statuses[0]).toBe(HttpStatus.OK);
        expect(statuses[1]).toBeGreaterThanOrEqual(400);
        expect(statuses[1]).toBeLessThan(500);
      });
    });
  });

  describe('auditoria', () => {
    it('regista uma entrada real ao iniciar sessão, sem dados sensíveis', async () => {
      // Sem `actorId` — o login ainda não tem sessão autenticada quando a entrada é
      // gerada (o `AuthGuard` não corre em `/auth/login`), por isso `actorId` fica vazio;
      // o próprio utilizador autenticado é identificado pelo `entityId`.
      await loginAs(ADMIN_EMAIL);

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-log')
        .query({ entityType: 'user' })
        .set('Cookie', adminCookie)
        .expect(HttpStatus.OK);

      const body = response.body as AuditSearchBody;
      expect(
        body.items.some(
          (item) => item.action === 'auth.login' && item.entityId === adminId,
        ),
      ).toBe(true);
      const raw = JSON.stringify(body);
      expect(raw.toLowerCase()).not.toContain('password');
      expect(raw).not.toContain(DEMO_PASSWORD);
    });

    it('regista uma entrada real ao atribuir um pedido de suporte a um agente', async () => {
      const ticketResponse = await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .set('Cookie', employeeCookie)
        .send({
          subject: 'Pedido de teste — Fase 8 (auditoria)',
          description: 'Descrição de teste para verificar a auditoria real.',
          category: 'Tramitação',
          priority: 'normal',
        })
        .expect(HttpStatus.CREATED);
      const ticketId = (ticketResponse.body as TicketBody).id;
      createdTicketIds.push(ticketId);

      await request(app.getHttpServer())
        .post(`/api/v1/support/tickets/${ticketId}/assign`)
        .set('Cookie', adminCookie)
        .send({ agentId })
        .expect(HttpStatus.CREATED);

      const auditResponse = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-log')
        .query({ entityType: 'ticket' })
        .set('Cookie', adminCookie)
        .expect(HttpStatus.OK);

      const body = auditResponse.body as AuditSearchBody;
      expect(
        body.items.some(
          (item) =>
            item.action === 'ticket.assign' && item.entityId === ticketId,
        ),
      ).toBe(true);
    });

    it('regista uma entrada real ao arquivar um recurso', async () => {
      const resourceResponse = await request(app.getHttpServer())
        .post('/api/v1/resources')
        .set('Cookie', adminCookie)
        .send({
          title: 'Recurso de teste — Fase 8 (auditoria)',
          slug: `recurso-teste-fase-8-${Date.now()}`,
          summary: 'Resumo de teste.',
          description: 'Descrição de teste para verificar a auditoria real.',
          resourceType: 'guide',
          difficulty: 'iniciacao',
        })
        .expect(HttpStatus.CREATED);
      const resourceId = (resourceResponse.body as ResourceBody).id;
      createdResourceIds.push(resourceId);

      await request(app.getHttpServer())
        .post(`/api/v1/resources/${resourceId}/archive`)
        .set('Cookie', adminCookie)
        .expect(HttpStatus.CREATED);

      const auditResponse = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-log')
        .query({ entityType: 'resource' })
        .set('Cookie', adminCookie)
        .expect(HttpStatus.OK);

      const body = auditResponse.body as AuditSearchBody;
      expect(
        body.items.some(
          (item) =>
            item.action === 'resource.archive' && item.entityId === resourceId,
        ),
      ).toBe(true);
    });

    it('pagina os resultados de acordo com page/pageSize', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-log')
        .query({ page: 1, pageSize: 1 })
        .set('Cookie', adminCookie)
        .expect(HttpStatus.OK);

      const body = response.body as AuditSearchBody;
      expect(body.items.length).toBeLessThanOrEqual(1);
      expect(typeof body.total).toBe('number');
    });
  });
});
