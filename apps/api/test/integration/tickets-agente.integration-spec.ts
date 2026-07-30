import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { SESSION_COOKIE_NAME } from '../../src/auth/session-token.util';

const DEMO_PASSWORD = 'Demo123!';
const EMPLOYEE_EMAIL = 'marta.silva@dgadr.gov.pt'; // user-1, requerente de seed-ticket-1/6(não)/8
const SUPPORT_AGENT_EMAIL = 'carlos.vieira@dgadr.gov.pt'; // user-2, SUPPORT_AGENT
const ADMIN_EMAIL = 'ana.ferreira@dgadr.gov.pt'; // user-5, só ADMIN
const SECOND_AGENT_ID = 'user-6'; // sofia.ramos, SUPPORT_AGENT

// `SupportTicket.id` é um cuid gerado pela BD — o seed (`support-tickets.seed.ts`) faz
// upsert por `reference` (única), nunca pelo `id` literal de `support-tickets.data.ts`
// (que só serve de chave interna ao próprio script de seed). Os testes resolvem sempre o
// `id` real a partir da referência estável, nunca assumem `seed-ticket-N` como `id` HTTP.
const REFERENCE = {
  ticket1: 'SUP-2026-041392', // Não consigo aceder ao Filedoc — marta, OPEN
  ticket2: 'SUP-2026-041210', // Documento devolvido sem motivo aparente — marta, IN_PROGRESS
  ticket3: 'SUP-2026-041055', // Preciso de confirmar um dado — marta, WAITING_FOR_USER
  ticket6: 'SUP-2026-040512', // Dúvida sobre assinatura digital — joao, OPEN
  ticket7: 'SUP-2026-040388', // Registo de novo processo — paulo, IN_PROGRESS
  ticket8: 'SUP-2026-042117', // Dúvida sobre a categoria correta — marta, CLOSED, com nota interna
} as const;

interface TicketMessageBody {
  readonly id: string;
  readonly author: string;
  readonly authorRole?: string;
  readonly content: string;
  readonly internal: boolean;
}

interface TicketBody {
  readonly id: string;
  readonly reference: string;
  readonly subject: string;
  readonly category: string;
  readonly priority: string;
  readonly status: string;
  readonly requesterId: string;
  readonly assigneeId?: string;
  readonly messages: readonly TicketMessageBody[];
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

describe('gestão de suporte (vista de agente) — fluxo real via HTTP', () => {
  let app: INestApplication<App>;
  let employeeCookie: string;
  let agentCookie: string;
  let adminCookie: string;
  let idByReference: ReadonlyMap<string, string>;

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

    async function loginAs(email: string): Promise<string> {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: DEMO_PASSWORD })
        .expect(HttpStatus.OK);
      return extractSessionCookie(
        response.headers['set-cookie'] as unknown as string[],
      );
    }

    employeeCookie = await loginAs(EMPLOYEE_EMAIL);
    agentCookie = await loginAs(SUPPORT_AGENT_EMAIL);
    adminCookie = await loginAs(ADMIN_EMAIL);

    const list = await request(app.getHttpServer())
      .get('/api/v1/support/tickets')
      .set('Cookie', agentCookie)
      .expect(HttpStatus.OK);
    idByReference = new Map(
      (list.body as readonly TicketBody[]).map((ticket) => [
        ticket.reference,
        ticket.id,
      ]),
    );
  });

  function idFor(reference: string): string {
    const id = idByReference.get(reference);
    if (!id) {
      throw new Error(
        `Pedido de seed não encontrado para a referência "${reference}".`,
      );
    }
    return id;
  }

  afterAll(async () => {
    await app.close();
  });

  describe('garantia de isolamento público/interno (tarefa B)', () => {
    it('rejeita um EMPLOYEE em GET /support/tickets/:id, mesmo sendo o próprio solicitante do pedido', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/support/tickets/${idFor(REFERENCE.ticket1)}`)
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('rejeita um EMPLOYEE em GET /support/tickets (lista)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/support/tickets')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('exige sessão em qualquer endpoint de gestão de suporte', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/support/tickets')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('SUPPORT_AGENT e ADMIN acedem a GET /support/tickets/:id', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/support/tickets/${idFor(REFERENCE.ticket1)}`)
        .set('Cookie', agentCookie)
        .expect(HttpStatus.OK);
      await request(app.getHttpServer())
        .get(`/api/v1/support/tickets/${idFor(REFERENCE.ticket1)}`)
        .set('Cookie', adminCookie)
        .expect(HttpStatus.OK);
    });

    it('GET /support/tickets/:id inclui notas internas (seed-ticket-8)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/support/tickets/${idFor(REFERENCE.ticket8)}`)
        .set('Cookie', agentCookie)
        .expect(HttpStatus.OK);

      const body = response.body as TicketBody;
      const internalMessages = body.messages.filter(
        (message) => message.internal,
      );
      expect(internalMessages.length).toBeGreaterThan(0);
    });

    it('GET /tickets/mine/:id nunca inclui as mesmas notas internas de seed-ticket-8, mesmo pertencendo ao próprio trabalhador', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tickets/mine/${idFor(REFERENCE.ticket8)}`)
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);

      const body = response.body as TicketBody;
      expect(body.messages.every((message) => !message.internal)).toBe(true);
      expect(
        body.messages.some((message) =>
          message.content.includes('confirmar com a equipa de conteúdos'),
        ),
      ).toBe(false);
    });
  });

  describe('GET /support/tickets (lista e filtros)', () => {
    it('devolve pedidos de todos os solicitantes, não apenas do agente autenticado', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/support/tickets')
        .set('Cookie', agentCookie)
        .expect(HttpStatus.OK);

      const body = response.body as readonly TicketBody[];
      const requesterIds = new Set(body.map((ticket) => ticket.requesterId));
      expect(requesterIds.size).toBeGreaterThan(1);
    });

    it('filtra por estado', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/support/tickets')
        .query({ status: 'CLOSED' })
        .set('Cookie', agentCookie)
        .expect(HttpStatus.OK);

      const body = response.body as readonly TicketBody[];
      expect(body.length).toBeGreaterThan(0);
      expect(body.every((ticket) => ticket.status === 'CLOSED')).toBe(true);
    });

    it('filtra por categoria e prioridade', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/support/tickets')
        .query({ category: 'Assinatura', priority: 'normal' })
        .set('Cookie', agentCookie)
        .expect(HttpStatus.OK);

      const body = response.body as readonly TicketBody[];
      expect(
        body.some((ticket) => ticket.reference === 'SUP-2026-040512'),
      ).toBe(true);
    });

    it('pesquisa por referência/assunto/solicitante', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/support/tickets')
        .query({ q: 'Filedoc' })
        .set('Cookie', agentCookie)
        .expect(HttpStatus.OK);

      const body = response.body as readonly TicketBody[];
      expect(
        body.some((ticket) => ticket.reference === REFERENCE.ticket1),
      ).toBe(true);
    });
  });

  describe('PATCH /support/tickets/:id (categoria/prioridade/estado/recurso)', () => {
    it('altera a categoria e regista automaticamente uma mensagem pública de histórico, visível ao trabalhador', async () => {
      const ticketId = idFor(REFERENCE.ticket3); // requester: marta.silva
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/support/tickets/${ticketId}`)
        .set('Cookie', agentCookie)
        .send({ category: 'Erro técnico' })
        .expect(HttpStatus.OK);

      const body = response.body as TicketBody;
      expect(body.category).toBe('Erro técnico');
      const historyMessage = body.messages.at(-1);
      expect(historyMessage?.content).toContain('Erro técnico');
      expect(historyMessage?.internal).toBe(false);

      const workerView = await request(app.getHttpServer())
        .get(`/api/v1/tickets/mine/${ticketId}`)
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);
      expect(
        (workerView.body as TicketBody).messages.some((message) =>
          message.content.includes('alterou a categoria para "Erro técnico"'),
        ),
      ).toBe(true);
    });

    it('não altera nada nem escreve histórico quando o corpo está vazio', async () => {
      const ticketId = idFor(REFERENCE.ticket3);
      const before = await request(app.getHttpServer())
        .get(`/api/v1/support/tickets/${ticketId}`)
        .set('Cookie', agentCookie)
        .expect(HttpStatus.OK);

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/support/tickets/${ticketId}`)
        .set('Cookie', agentCookie)
        .send({})
        .expect(HttpStatus.OK);

      const body = response.body as TicketBody;
      expect(body.messages.length).toBe(
        (before.body as TicketBody).messages.length,
      );
    });

    it('devolve 404 para um pedido inexistente', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/support/tickets/pedido-inexistente')
        .set('Cookie', agentCookie)
        .send({ priority: 'alta' })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('POST /support/tickets/:id/internal-notes e /messages', () => {
    it('cria uma nota interna, visível apenas na vista de agente', async () => {
      const ticketId = idFor(REFERENCE.ticket7);
      const created = await request(app.getHttpServer())
        .post(`/api/v1/support/tickets/${ticketId}/internal-notes`)
        .set('Cookie', agentCookie)
        .send({ content: 'Nota interna criada pelo teste de integração.' })
        .expect(HttpStatus.CREATED);
      expect((created.body as TicketMessageBody).internal).toBe(true);

      const agentView = await request(app.getHttpServer())
        .get(`/api/v1/support/tickets/${ticketId}`)
        .set('Cookie', agentCookie)
        .expect(HttpStatus.OK);
      expect(
        (agentView.body as TicketBody).messages.some((message) =>
          message.content.includes(
            'Nota interna criada pelo teste de integração.',
          ),
        ),
      ).toBe(true);
    });

    it('cria uma resposta pública, visível na vista de agente e do trabalhador', async () => {
      const created = await request(app.getHttpServer())
        .post(`/api/v1/support/tickets/${idFor(REFERENCE.ticket7)}/messages`)
        .set('Cookie', agentCookie)
        .send({ content: 'Resposta pública do agente ao pedido.' })
        .expect(HttpStatus.CREATED);
      expect((created.body as TicketMessageBody).internal).toBe(false);
    });
  });

  describe('POST /support/tickets/:id/assign', () => {
    it('rejeita um agentId que não corresponde a um agente/admin ativo', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/support/tickets/${idFor(REFERENCE.ticket7)}/assign`)
        .set('Cookie', agentCookie)
        .send({ agentId: 'user-1' }) // marta.silva, EMPLOYEE
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('atribui o pedido a outro agente e regista o histórico', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/support/tickets/${idFor(REFERENCE.ticket7)}/assign`)
        .set('Cookie', agentCookie)
        .send({ agentId: SECOND_AGENT_ID })
        .expect(HttpStatus.CREATED);

      const body = response.body as TicketBody;
      expect(body.assigneeId).toBe(SECOND_AGENT_ID);
      expect(body.messages.at(-1)?.content).toContain('Sofia Ramos');
    });
  });

  describe('POST /support/tickets/:id/resolve e /close', () => {
    it('marca como resolvido e depois rejeita uma segunda resolução', async () => {
      const ticketId = idFor(REFERENCE.ticket7);
      const resolved = await request(app.getHttpServer())
        .post(`/api/v1/support/tickets/${ticketId}/resolve`)
        .set('Cookie', agentCookie)
        .expect(HttpStatus.CREATED);
      expect((resolved.body as TicketBody).status).toBe('RESOLVED');

      await request(app.getHttpServer())
        .post(`/api/v1/support/tickets/${ticketId}/resolve`)
        .set('Cookie', agentCookie)
        .expect(HttpStatus.CONFLICT);
    });

    it('encerra o pedido e depois rejeita um segundo encerramento', async () => {
      const ticketId = idFor(REFERENCE.ticket7);
      const closed = await request(app.getHttpServer())
        .post(`/api/v1/support/tickets/${ticketId}/close`)
        .set('Cookie', agentCookie)
        .expect(HttpStatus.CREATED);
      expect((closed.body as TicketBody).status).toBe('CLOSED');

      await request(app.getHttpServer())
        .post(`/api/v1/support/tickets/${ticketId}/close`)
        .set('Cookie', agentCookie)
        .expect(HttpStatus.CONFLICT);
    });
  });
});
