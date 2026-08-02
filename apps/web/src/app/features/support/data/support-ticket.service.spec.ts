import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SupportTicketService } from './support-ticket.service';

const API_TICKET = {
  id: 'ticket-1',
  reference: 'SUP-2026-ABCDEF',
  subject: 'Não consigo aceder ao Filedoc',
  description: 'Descrição do pedido.',
  category: 'Acesso ou permissões' as const,
  priority: 'alta' as const,
  status: 'OPEN' as const,
  requesterId: 'user-1',
  requester: 'Marta Silva',
  requesterRole: 'Trabalhador',
  assigneeId: undefined,
  createdAt: '2026-07-08T09:14:00.000Z',
  updatedAt: '2026-07-08T09:14:00.000Z',
  messages: [
    {
      id: 'msg-1',
      author: 'Marta Silva',
      createdAt: '2026-07-08T09:14:00.000Z',
      content: 'Descrição do pedido.',
      internal: false,
    },
  ],
};

describe('SupportTicketService', () => {
  let service: SupportTicketService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SupportTicketService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('listAll', () => {
    it('pede GET /support/tickets sem parâmetros quando não há filtros', () => {
      const next = vi.fn();
      service.listAll().subscribe(next);

      const req = httpMock.expectOne((request) => request.url === '/support/tickets');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toEqual([]);
      req.flush([API_TICKET]);

      expect(next).toHaveBeenCalledWith([expect.objectContaining({ id: 'ticket-1' })]);
    });

    it('envia estado e pesquisa como parâmetros de consulta', () => {
      const next = vi.fn();
      service.listAll({ status: 'OPEN', query: 'Filedoc' }).subscribe(next);

      const req = httpMock.expectOne((request) => request.url === '/support/tickets');
      expect(req.request.params.get('status')).toBe('OPEN');
      expect(req.request.params.get('q')).toBe('Filedoc');
      req.flush([API_TICKET]);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('assign', () => {
    it('pede POST /support/tickets/:id/assign com o agentId', () => {
      const next = vi.fn();
      service.assign('ticket-1', 'agent-2').subscribe(next);

      const req = httpMock.expectOne('/support/tickets/ticket-1/assign');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ agentId: 'agent-2' });
      req.flush({ ...API_TICKET, assigneeId: 'agent-2' });

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ assigneeId: 'agent-2' }));
    });
  });

  describe('listAgents', () => {
    it('pede GET /support/tickets/agents e devolve o roster real (id/nome)', () => {
      const next = vi.fn();
      service.listAgents().subscribe(next);

      const req = httpMock.expectOne('/support/tickets/agents');
      expect(req.request.method).toBe('GET');
      req.flush([
        { id: 'agent-2', name: 'Sofia Ramos' },
        { id: 'agent-3', name: 'Carlos Vieira' },
      ]);

      expect(next).toHaveBeenCalledWith([
        { id: 'agent-2', name: 'Sofia Ramos' },
        { id: 'agent-3', name: 'Carlos Vieira' },
      ]);
    });

    it('propaga uma mensagem de erro genérica quando o pedido falha', () => {
      const next = vi.fn();
      const error = vi.fn();
      service.listAgents().subscribe({ next, error });

      const req = httpMock.expectOne('/support/tickets/agents');
      req.flush('erro', { status: 500, statusText: 'Internal Server Error' });

      expect(next).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Não foi possível concluir o pedido. Tente novamente.',
        }),
      );
    });
  });

  describe('updateCategory / updatePriority / updateStatus / associateResource', () => {
    it('envia apenas o campo alterado via PATCH /support/tickets/:id', () => {
      service.updateCategory('ticket-1', 'Erro técnico').subscribe();
      const categoryReq = httpMock.expectOne('/support/tickets/ticket-1');
      expect(categoryReq.request.method).toBe('PATCH');
      expect(categoryReq.request.body).toEqual({ category: 'Erro técnico' });
      categoryReq.flush(API_TICKET);

      service.updatePriority('ticket-1', 'bloqueante').subscribe();
      const priorityReq = httpMock.expectOne('/support/tickets/ticket-1');
      expect(priorityReq.request.body).toEqual({ priority: 'bloqueante' });
      priorityReq.flush(API_TICKET);

      service.updateStatus('ticket-1', 'IN_PROGRESS').subscribe();
      const statusReq = httpMock.expectOne('/support/tickets/ticket-1');
      expect(statusReq.request.body).toEqual({ status: 'IN_PROGRESS' });
      statusReq.flush(API_TICKET);

      service.associateResource('ticket-1', 'res-1').subscribe();
      const resourceReq = httpMock.expectOne('/support/tickets/ticket-1');
      expect(resourceReq.request.body).toEqual({ relatedResourceId: 'res-1' });
      resourceReq.flush(API_TICKET);
    });
  });

  describe('resolve / close', () => {
    it('pede POST /support/tickets/:id/resolve', () => {
      const next = vi.fn();
      service.resolve('ticket-1').subscribe(next);

      const req = httpMock.expectOne('/support/tickets/ticket-1/resolve');
      expect(req.request.method).toBe('POST');
      req.flush({ ...API_TICKET, status: 'RESOLVED' });

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 'RESOLVED' }));
    });

    it('pede POST /support/tickets/:id/close', () => {
      const next = vi.fn();
      service.close('ticket-1').subscribe(next);

      const req = httpMock.expectOne('/support/tickets/ticket-1/close');
      expect(req.request.method).toBe('POST');
      req.flush({ ...API_TICKET, status: 'CLOSED' });

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 'CLOSED' }));
    });
  });

  describe('addInternalNote / reply', () => {
    it('cria a nota interna e reobtém o pedido completo', () => {
      const next = vi.fn();
      service.addInternalNote('ticket-1', 'Nota interna.').subscribe(next);

      const noteReq = httpMock.expectOne('/support/tickets/ticket-1/internal-notes');
      expect(noteReq.request.method).toBe('POST');
      expect(noteReq.request.body).toEqual({ content: 'Nota interna.' });
      noteReq.flush({
        id: 'msg-2',
        author: 'Carlos Nunes',
        createdAt: '2026-07-08T10:00:00.000Z',
        content: 'Nota interna.',
        internal: true,
      });

      httpMock.expectOne('/support/tickets/ticket-1').flush(API_TICKET);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ id: 'ticket-1' }));
    });

    it('cria a resposta pública e reobtém o pedido completo', () => {
      const next = vi.fn();
      service.reply('ticket-1', 'Vamos analisar o seu pedido.').subscribe(next);

      const replyReq = httpMock.expectOne('/support/tickets/ticket-1/messages');
      expect(replyReq.request.method).toBe('POST');
      expect(replyReq.request.body).toEqual({ content: 'Vamos analisar o seu pedido.' });
      replyReq.flush({
        id: 'msg-2',
        author: 'Carlos Nunes',
        createdAt: '2026-07-08T10:00:00.000Z',
        content: 'Vamos analisar o seu pedido.',
        internal: false,
      });

      httpMock.expectOne('/support/tickets/ticket-1').flush(API_TICKET);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ id: 'ticket-1' }));
    });

    it('propaga um erro genérico quando o pedido falha', () => {
      const onError = vi.fn();
      service.reply('ticket-1', 'Olá').subscribe({ error: onError });

      httpMock
        .expectOne('/support/tickets/ticket-1/messages')
        .flush(null, { status: 500, statusText: 'Internal Server Error' });

      expect(onError).toHaveBeenCalled();
    });
  });
});
