import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TicketService } from './ticket.service';

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
  createdAt: '2026-07-08T09:14:00.000Z',
  updatedAt: '2026-07-08T09:14:00.000Z',
  messages: [
    {
      id: 'msg-1',
      author: 'Marta Silva',
      createdAt: '2026-07-08T09:14:00.000Z',
      content: 'Descrição do pedido.',
      internal: false as const,
    },
  ],
};

describe('TicketService', () => {
  let service: TicketService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TicketService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.unstubAllGlobals();
  });

  describe('listMine', () => {
    it('pede GET /tickets/mine e mapeia a resposta', () => {
      const next = vi.fn();
      service.listMine().subscribe(next);

      const req = httpMock.expectOne('/tickets/mine');
      expect(req.request.method).toBe('GET');
      req.flush([API_TICKET]);

      expect(next).toHaveBeenCalledWith([expect.objectContaining({ id: 'ticket-1' })]);
    });

    it('propaga um erro genérico quando o pedido falha', () => {
      const onError = vi.fn();
      service.listMine().subscribe({ error: onError });

      httpMock
        .expectOne('/tickets/mine')
        .flush(null, { status: 500, statusText: 'Internal Server Error' });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('getMineById', () => {
    it('devolve o pedido mapeado quando encontrado', () => {
      const next = vi.fn();
      service.getMineById('ticket-1').subscribe(next);

      httpMock.expectOne('/tickets/mine/ticket-1').flush(API_TICKET);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ reference: 'SUP-2026-ABCDEF' }));
    });

    it('devolve undefined para um 404 (pedido de outro utilizador ou inexistente)', () => {
      const next = vi.fn();
      service.getMineById('ticket-2').subscribe(next);

      httpMock
        .expectOne('/tickets/mine/ticket-2')
        .flush(
          { message: 'Pedido de suporte não encontrado.' },
          { status: 404, statusText: 'Not Found' },
        );

      expect(next).toHaveBeenCalledWith(undefined);
    });
  });

  describe('createTicket', () => {
    it('envia os campos do formulário e mapeia a resposta', () => {
      const next = vi.fn();
      service
        .createTicket({
          subject: 'Assunto',
          description: 'Descrição',
          category: 'Outra questão',
          priority: 'normal',
          relatedResourceId: 'res-1',
        })
        .subscribe(next);

      const req = httpMock.expectOne('/tickets');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        subject: 'Assunto',
        description: 'Descrição',
        category: 'Outra questão',
        priority: 'normal',
        relatedResourceId: 'res-1',
      });
      req.flush(API_TICKET);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ id: 'ticket-1' }));
    });
  });

  describe('confirmResolution', () => {
    it('pede POST /tickets/mine/:id/confirm-resolution e mapeia a resposta', () => {
      const next = vi.fn();
      service.confirmResolution('ticket-1').subscribe(next);

      const req = httpMock.expectOne('/tickets/mine/ticket-1/confirm-resolution');
      expect(req.request.method).toBe('POST');
      req.flush({ ...API_TICKET, status: 'CLOSED' as const });

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 'CLOSED' }));
    });
  });

  describe('addMessage', () => {
    it('cria a mensagem e devolve o pedido atualizado quando não há anexos', () => {
      const next = vi.fn();
      service.addMessage('ticket-1', 'Obrigada pela ajuda.').subscribe(next);

      const messageReq = httpMock.expectOne('/tickets/mine/ticket-1/messages');
      expect(messageReq.request.method).toBe('POST');
      expect(messageReq.request.body).toEqual({ content: 'Obrigada pela ajuda.' });
      messageReq.flush({
        id: 'msg-2',
        author: 'Marta Silva',
        createdAt: '2026-07-08T10:00:00.000Z',
        content: 'Obrigada pela ajuda.',
        internal: false,
      });

      httpMock.expectOne('/tickets/mine/ticket-1').flush(API_TICKET);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ id: 'ticket-1' }));
    });

    it('carrega cada anexo (init, PUT direto ao armazenamento, confirm) antes de reobter o pedido', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      const file = new File(['conteúdo'], 'comprovativo.txt', { type: 'text/plain' });
      const next = vi.fn();
      service.addMessage('ticket-1', 'Anexo em baixo.', [file]).subscribe(next);

      const messageReq = httpMock.expectOne('/tickets/mine/ticket-1/messages');
      messageReq.flush({
        id: 'msg-2',
        author: 'Marta Silva',
        createdAt: '2026-07-08T10:00:00.000Z',
        content: 'Anexo em baixo.',
        internal: false,
      });

      const initReq = httpMock.expectOne('/tickets/mine/ticket-1/attachments');
      expect(initReq.request.body).toEqual({
        phase: 'init',
        messageId: 'msg-2',
        fileName: 'comprovativo.txt',
        mimeType: 'text/plain',
        sizeBytes: file.size,
      });
      initReq.flush({
        mode: 'single',
        objectKey: 'ticket-attachments/abc.txt',
        uploadUrl: 'https://storage.example/upload',
      });

      // A confirmação só é pedida depois do PUT direto ao armazenamento resolver.
      await Promise.resolve();
      await Promise.resolve();

      expect(fetchMock).toHaveBeenCalledWith(
        'https://storage.example/upload',
        expect.objectContaining({ method: 'PUT', body: file }),
      );

      const confirmReq = httpMock.expectOne('/tickets/mine/ticket-1/attachments');
      expect(confirmReq.request.body).toEqual({
        phase: 'confirm',
        messageId: 'msg-2',
        fileName: 'comprovativo.txt',
        mimeType: 'text/plain',
        objectKey: 'ticket-attachments/abc.txt',
        size: file.size,
      });
      confirmReq.flush({ id: 'att-1', fileName: 'comprovativo.txt' });

      httpMock.expectOne('/tickets/mine/ticket-1').flush(API_TICKET);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ id: 'ticket-1' }));
    });

    it('propaga um erro quando o carregamento direto para o armazenamento falha', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

      const file = new File(['conteúdo'], 'comprovativo.txt', { type: 'text/plain' });
      const onError = vi.fn();
      service.addMessage('ticket-1', 'Anexo em baixo.', [file]).subscribe({ error: onError });

      httpMock.expectOne('/tickets/mine/ticket-1/messages').flush({
        id: 'msg-2',
        author: 'Marta Silva',
        createdAt: '2026-07-08T10:00:00.000Z',
        content: 'Anexo em baixo.',
        internal: false,
      });
      httpMock.expectOne('/tickets/mine/ticket-1/attachments').flush({
        mode: 'single',
        objectKey: 'ticket-attachments/abc.txt',
        uploadUrl: 'https://storage.example/upload',
      });

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) }),
      );
    });
  });
});
