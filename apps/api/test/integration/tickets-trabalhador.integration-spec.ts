import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { SESSION_COOKIE_NAME } from '../../src/auth/session-token.util';
import { createValidationPipe } from '../../src/common/validation-pipe.factory';

const DEMO_PASSWORD = 'Demo123!';
const EMPLOYEE_EMAIL = 'marta.silva@dgadr.gov.pt';
const CONTENT_EDITOR_EMAIL = 'joao.antunes@dgadr.gov.pt';
const TEXT_CONTENT_TYPE = 'text/plain';

interface TicketAttachmentBody {
  readonly id: string;
  readonly fileName: string;
}

interface TicketMessageBody {
  readonly id: string;
  readonly author: string;
  readonly authorRole?: string;
  readonly content: string;
  readonly internal: false;
  readonly attachments?: readonly TicketAttachmentBody[];
}

interface TicketBody {
  readonly id: string;
  readonly reference: string;
  readonly category: string;
  readonly priority: string;
  readonly status: string;
  readonly requesterId: string;
  readonly messages: readonly TicketMessageBody[];
}

interface SingleUploadInitBody {
  readonly mode: 'single';
  readonly objectKey: string;
  readonly uploadUrl: string;
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

// Declarações de `fetch` incompatíveis com `Buffer` como `BodyInit` (mesma observação de
// `storage.integration-spec.ts`) — apenas um problema de tipos, não de comportamento.
function toRequestBody(buffer: Buffer): BodyInit {
  return new Uint8Array(buffer) as BodyInit;
}

describe('pedidos de suporte do trabalhador — fluxo real via HTTP', () => {
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
    await app.close();
  });

  describe('POST /tickets', () => {
    it('exige sessão', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('cria o pedido associado ao utilizador autenticado', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .set('Cookie', employeeCookie)
        .send({
          subject: 'Dúvida sobre um novo procedimento',
          description: 'Não sei como proceder num caso específico.',
          category: 'Outra questão',
          priority: 'normal',
        })
        .expect(HttpStatus.CREATED);

      const body = response.body as TicketBody;
      expect(body.requesterId).toBe('user-1');
      expect(body.status).toBe('OPEN');
      expect(body.category).toBe('Outra questão');
      expect(body.priority).toBe('normal');
      expect(body.reference).toMatch(/^SUP-\d{4}-[0-9A-Z]{6}$/);
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].content).toBe(
        'Não sei como proceder num caso específico.',
      );
    });

    it('gera referências distintas entre dois pedidos', async () => {
      const first = await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .set('Cookie', employeeCookie)
        .send({
          subject: 'Primeiro pedido',
          description: 'Descrição do primeiro pedido.',
          category: 'Erro técnico',
          priority: 'baixa',
        })
        .expect(HttpStatus.CREATED);
      const second = await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .set('Cookie', employeeCookie)
        .send({
          subject: 'Segundo pedido',
          description: 'Descrição do segundo pedido.',
          category: 'Erro técnico',
          priority: 'baixa',
        })
        .expect(HttpStatus.CREATED);

      expect((first.body as TicketBody).reference).not.toBe(
        (second.body as TicketBody).reference,
      );
    });

    it('rejeita um requesterId no corpo (whitelist do DTO — nunca aceite do cliente)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .set('Cookie', employeeCookie)
        .send({
          subject: 'Assunto',
          description: 'Descrição',
          category: 'Outra questão',
          priority: 'normal',
          requesterId: 'user-3',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('rejeita uma categoria ou prioridade fora dos valores permitidos', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .set('Cookie', employeeCookie)
        .send({
          subject: 'Assunto',
          description: 'Descrição',
          category: 'Categoria inventada',
          priority: 'normal',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /tickets/mine', () => {
    it('exige sessão', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tickets/mine')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('devolve apenas os pedidos do próprio solicitante', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tickets/mine')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);

      const body = response.body as readonly TicketBody[];
      expect(body.length).toBeGreaterThanOrEqual(6);
      expect(body.every((ticket) => ticket.requesterId === 'user-1')).toBe(
        true,
      );
      expect(
        body.some((ticket) => ticket.reference === 'SUP-2026-040512'),
      ).toBe(false);
    });
  });

  describe('GET /tickets/mine/:id', () => {
    it('devolve 404 (não 403) para um pedido de outro utilizador', async () => {
      const joaoTickets = await request(app.getHttpServer())
        .get('/api/v1/tickets/mine')
        .set('Cookie', contentEditorCookie)
        .expect(HttpStatus.OK);
      const joaoTicket = (joaoTickets.body as readonly TicketBody[])[0];

      await request(app.getHttpServer())
        .get(`/api/v1/tickets/mine/${joaoTicket.id}`)
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('devolve 404 para um id inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tickets/mine/id-que-nao-existe')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('nunca devolve uma nota interna, mesmo num pedido encerrado que a contém', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/tickets/mine')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);
      const ticket = (list.body as readonly TicketBody[]).find(
        (candidate) => candidate.reference === 'SUP-2026-042117',
      );
      if (!ticket) {
        throw new Error('Pedido de seed SUP-2026-042117 não encontrado.');
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tickets/mine/${ticket.id}`)
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);

      const body = response.body as TicketBody;
      expect(body.messages.every((message) => message.internal === false)).toBe(
        true,
      );
      expect(
        body.messages.some((message) =>
          message.content.includes('Nota interna'),
        ),
      ).toBe(false);
    });
  });

  describe('POST /tickets/mine/:id/messages', () => {
    it('adiciona uma mensagem pública a um pedido aberto', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/tickets/mine')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);
      const openTicket = (list.body as readonly TicketBody[]).find(
        (candidate) => candidate.reference === 'SUP-2026-041392',
      );
      if (!openTicket) {
        throw new Error('Pedido de seed SUP-2026-041392 não encontrado.');
      }

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tickets/mine/${openTicket.id}/messages`)
        .set('Cookie', employeeCookie)
        .send({ content: 'Ainda preciso de ajuda com este pedido.' })
        .expect(HttpStatus.CREATED);

      const message = response.body as TicketMessageBody;
      expect(message.content).toBe('Ainda preciso de ajuda com este pedido.');
      expect(message.internal).toBe(false);

      const detail = await request(app.getHttpServer())
        .get(`/api/v1/tickets/mine/${openTicket.id}`)
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);
      expect(
        (detail.body as TicketBody).messages.some(
          (entry) => entry.id === message.id,
        ),
      ).toBe(true);
    });

    it('rejeita uma nova mensagem num pedido encerrado', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/tickets/mine')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);
      const closedTicket = (list.body as readonly TicketBody[]).find(
        (candidate) => candidate.reference === 'SUP-2026-040711',
      );
      if (!closedTicket) {
        throw new Error('Pedido de seed SUP-2026-040711 não encontrado.');
      }

      await request(app.getHttpServer())
        .post(`/api/v1/tickets/mine/${closedTicket.id}/messages`)
        .set('Cookie', employeeCookie)
        .send({ content: 'Ainda preciso de ajuda.' })
        .expect(HttpStatus.CONFLICT);
    });
  });

  describe('POST /tickets/mine/:id/attachments — anexo real contra MinIO', () => {
    it('carrega um anexo real e associa-o à mensagem, sem bytes a passar pela API', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/tickets/mine')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);
      const ticket = (list.body as readonly TicketBody[]).find(
        (candidate) => candidate.reference === 'SUP-2026-041392',
      );
      if (!ticket) {
        throw new Error('Pedido de seed SUP-2026-041392 não encontrado.');
      }
      const messageId = ticket.messages[0].id;

      const initResponse = await request(app.getHttpServer())
        .post(`/api/v1/tickets/mine/${ticket.id}/attachments`)
        .set('Cookie', employeeCookie)
        .send({
          phase: 'init',
          messageId,
          fileName: 'comprovativo.txt',
          mimeType: TEXT_CONTENT_TYPE,
          sizeBytes: 42,
        })
        .expect(HttpStatus.CREATED);
      const init = initResponse.body as SingleUploadInitBody;
      expect(init.mode).toBe('single');
      expect(init.objectKey).toMatch(/^ticket-attachments\//);

      const putResponse = await fetch(init.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': TEXT_CONTENT_TYPE },
        body: toRequestBody(Buffer.from('conteúdo de teste do anexo', 'utf8')),
      });
      expect(putResponse.ok).toBe(true);

      const confirmResponse = await request(app.getHttpServer())
        .post(`/api/v1/tickets/mine/${ticket.id}/attachments`)
        .set('Cookie', employeeCookie)
        .send({
          phase: 'confirm',
          messageId,
          fileName: 'comprovativo.txt',
          mimeType: TEXT_CONTENT_TYPE,
          objectKey: init.objectKey,
          size: 42,
        })
        .expect(HttpStatus.CREATED);
      const attachment = confirmResponse.body as TicketAttachmentBody;
      expect(attachment.fileName).toBe('comprovativo.txt');

      const detail = await request(app.getHttpServer())
        .get(`/api/v1/tickets/mine/${ticket.id}`)
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);
      const message = (detail.body as TicketBody).messages.find(
        (entry) => entry.id === messageId,
      );
      expect(
        message?.attachments?.some((entry) => entry.id === attachment.id),
      ).toBe(true);
    });

    it('devolve 404 quando a mensagem não pertence ao pedido indicado', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/tickets/mine')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);
      const tickets = list.body as readonly TicketBody[];
      const ticketA = tickets.find(
        (candidate) => candidate.reference === 'SUP-2026-041392',
      );
      const ticketB = tickets.find(
        (candidate) => candidate.reference === 'SUP-2026-041210',
      );
      if (!ticketA || !ticketB) {
        throw new Error('Pedidos de seed necessários não encontrados.');
      }

      await request(app.getHttpServer())
        .post(`/api/v1/tickets/mine/${ticketB.id}/attachments`)
        .set('Cookie', employeeCookie)
        .send({
          phase: 'init',
          messageId: ticketA.messages[0].id,
          fileName: 'ficheiro.txt',
          mimeType: TEXT_CONTENT_TYPE,
          sizeBytes: 10,
        })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('POST /tickets/mine/:id/confirm-resolution', () => {
    it('só permite confirmar quando o estado é RESOLVED, transitando para CLOSED', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/tickets/mine')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);
      const resolvedTicket = (list.body as readonly TicketBody[]).find(
        (candidate) => candidate.reference === 'SUP-2026-040998',
      );
      if (!resolvedTicket) {
        throw new Error('Pedido de seed SUP-2026-040998 não encontrado.');
      }

      const response = await request(app.getHttpServer())
        .post(`/api/v1/tickets/mine/${resolvedTicket.id}/confirm-resolution`)
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.CREATED);

      expect((response.body as TicketBody).status).toBe('CLOSED');
    });

    it('rejeita a confirmação quando o pedido ainda não está resolvido', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/tickets/mine')
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.OK);
      const openTicket = (list.body as readonly TicketBody[]).find(
        (candidate) => candidate.reference === 'SUP-2026-041392',
      );
      if (!openTicket) {
        throw new Error('Pedido de seed SUP-2026-041392 não encontrado.');
      }

      await request(app.getHttpServer())
        .post(`/api/v1/tickets/mine/${openTicket.id}/confirm-resolution`)
        .set('Cookie', employeeCookie)
        .expect(HttpStatus.CONFLICT);
    });
  });
});
