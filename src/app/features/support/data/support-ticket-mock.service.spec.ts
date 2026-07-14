import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { UserRole } from '../../../shared/models';
import { users } from '../../../shared/mocks/users.mock';
import { CreateTicketInput } from './create-ticket-input.model';
import { SupportTicketMockService } from './support-ticket-mock.service';

const REFERENCE_PATTERN = /^SUP-\d{4}-[A-Z0-9]{6}$/;

describe('SupportTicketMockService', () => {
  let service: SupportTicketMockService;
  let authService: AuthService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupportTicketMockService);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function loginAs(role: UserRole): void {
    const user = users.find(
      (candidate) => candidate.roles.includes(role) && candidate.status === 'active',
    );
    if (!user) {
      throw new Error(`No active mock user for role ${role}`);
    }
    authService.currentUser.set(user);
  }

  async function flush<T>(promise: Promise<T>): Promise<T> {
    await vi.advanceTimersByTimeAsync(400);
    return promise;
  }

  const sampleInput: CreateTicketInput = {
    subject: 'Não consigo abrir um processo',
    description: 'Ao abrir o processo XPTO a aplicação fica bloqueada.',
    category: 'Erro técnico',
    priority: 'alta',
  };

  it('lists only the tickets belonging to the current user', async () => {
    loginAs('EMPLOYEE'); // Marta Silva (user-1)
    const result = await flush(firstValueFrom(service.listMine()));
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((ticket) => ticket.requesterId === 'user-1')).toBe(true);
  });

  it('returns a ticket owned by the current user via getMineById', async () => {
    loginAs('EMPLOYEE'); // Marta Silva (user-1)
    const result = await flush(firstValueFrom(service.getMineById('sup-1')));
    expect(result?.id).toBe('sup-1');
  });

  it('does not expose a ticket that belongs to another user', async () => {
    loginAs('EMPLOYEE'); // Marta Silva (user-1); sup-6 belongs to user-3
    const result = await flush(firstValueFrom(service.getMineById('sup-6')));
    expect(result).toBeUndefined();
  });

  it('returns undefined for a non-existent ticket, identically to a foreign one', async () => {
    loginAs('EMPLOYEE');
    const result = await flush(firstValueFrom(service.getMineById('sup-does-not-exist')));
    expect(result).toBeUndefined();
  });

  it('creates a ticket with a unique SUP-AAAA-XXXXXX reference, owned by the current user', async () => {
    loginAs('EMPLOYEE');
    const ticket = await flush(firstValueFrom(service.createTicket(sampleInput)));
    expect(ticket.reference).toMatch(REFERENCE_PATTERN);
    expect(ticket.status).toBe('OPEN');
    expect(ticket.requesterId).toBe('user-1');
    expect(ticket.messages).toHaveLength(1);
    expect(ticket.messages[0].content).toBe(sampleInput.description);

    const mine = await flush(firstValueFrom(service.listMine()));
    expect(mine.some((candidate) => candidate.id === ticket.id)).toBe(true);
  });

  it('adds a public message to an own ticket that is not closed', async () => {
    loginAs('EMPLOYEE');
    const updated = await flush(
      firstValueFrom(service.addMessage('sup-1', 'Informação adicional sobre o problema.')),
    );
    expect(updated.messages).toHaveLength(2);
    expect(updated.messages[1].internal).toBe(false);
    expect(updated.messages[1].author).toBe('Marta Silva');
  });

  it('attaches simulated file names to a message, capped at the configured maximum', async () => {
    loginAs('EMPLOYEE');
    const updated = await flush(
      firstValueFrom(
        service.addMessage('sup-1', 'Anexo o comprovativo.', ['a.png', 'b.png', 'c.png', 'd.png']),
      ),
    );
    const lastMessage = updated.messages[updated.messages.length - 1];
    expect(lastMessage.attachments).toHaveLength(3);
  });

  // As rejeições abaixo vêm de throwError() sem atraso simulado, pelo que a promessa
  // já está resolvida antes de avançarmos os temporizadores — não passar por flush()
  // evita um "unhandled rejection" espúrio por o catch ser anexado tarde de mais.
  it('rejects adding a message to a closed ticket', async () => {
    loginAs('EMPLOYEE'); // sup-5 is CLOSED
    await expect(
      firstValueFrom(service.addMessage('sup-5', 'Ainda preciso de ajuda.')),
    ).rejects.toThrow();
  });

  it('rejects adding a message to a ticket that belongs to another user', async () => {
    loginAs('EMPLOYEE'); // sup-6 belongs to user-3
    await expect(
      firstValueFrom(service.addMessage('sup-6', 'Tentativa de resposta indevida.')),
    ).rejects.toThrow();
  });

  it('confirms resolution only when the ticket status is RESOLVED, transitioning to CLOSED', async () => {
    loginAs('EMPLOYEE'); // sup-4 is RESOLVED
    const updated = await flush(firstValueFrom(service.confirmResolution('sup-4')));
    expect(updated.status).toBe('CLOSED');
    expect(updated.closedAt).toBeDefined();
  });

  it('rejects confirming resolution outside the RESOLVED state', async () => {
    loginAs('EMPLOYEE'); // sup-1 is OPEN
    await expect(firstValueFrom(service.confirmResolution('sup-1'))).rejects.toThrow();
  });

  it('rejects confirming resolution of a ticket that belongs to another user', async () => {
    loginAs('EMPLOYEE'); // sup-7 belongs to user-4 and is IN_PROGRESS
    await expect(firstValueFrom(service.confirmResolution('sup-7'))).rejects.toThrow();
  });

  describe('agent operations (Fase 7 — UI)', () => {
    it('lists tickets from every requester, not just the current user', async () => {
      loginAs('SUPPORT_AGENT'); // Carlos Vieira (user-2)
      const result = await flush(firstValueFrom(service.listAll()));
      const requesterIds = new Set(result.map((ticket) => ticket.requesterId));
      expect(requesterIds.size).toBeGreaterThan(1);
    });

    it('filters the queue by status and by a free-text query', async () => {
      loginAs('SUPPORT_AGENT');
      const openOnly = await flush(firstValueFrom(service.listAll({ status: 'OPEN' })));
      expect(openOnly.every((ticket) => ticket.status === 'OPEN')).toBe(true);

      const bySubject = await flush(
        firstValueFrom(service.listAll({ query: 'assinatura digital' })),
      );
      expect(bySubject.some((ticket) => ticket.id === 'sup-6')).toBe(true);
    });

    it('assigns a ticket to an agent and records the change in the history', async () => {
      loginAs('SUPPORT_AGENT'); // Carlos Vieira (user-2)
      const updated = await flush(firstValueFrom(service.assign('sup-1', 'user-6')));
      expect(updated.assigneeId).toBe('user-6');
      const lastMessage = updated.messages[updated.messages.length - 1];
      expect(lastMessage.kind).toBe('status-change');
      expect(lastMessage.content).toContain('Sofia Ramos');
    });

    it('adds an internal note that is flagged as internal', async () => {
      loginAs('SUPPORT_AGENT');
      const updated = await flush(
        firstValueFrom(service.addInternalNote('sup-1', 'A confirmar junto do administrador.')),
      );
      const lastMessage = updated.messages[updated.messages.length - 1];
      expect(lastMessage.internal).toBe(true);
      expect(lastMessage.content).toBe('A confirmar junto do administrador.');
    });

    it('replies publicly to a ticket that does not belong to the agent', async () => {
      loginAs('SUPPORT_AGENT'); // sup-6 belongs to user-3 (João Antunes)
      const updated = await flush(
        firstValueFrom(service.reply('sup-6', 'Pode assinar no separador Assinatura.')),
      );
      const lastMessage = updated.messages[updated.messages.length - 1];
      expect(lastMessage.internal).toBe(false);
      expect(lastMessage.author).toBe('Carlos Vieira');
    });

    it('rejects a public reply to a closed ticket', async () => {
      loginAs('SUPPORT_AGENT'); // sup-5 is CLOSED
      await expect(firstValueFrom(service.reply('sup-5', 'Ainda por aqui?'))).rejects.toThrow();
    });

    it('updates category, priority and status, each leaving a history entry', async () => {
      loginAs('SUPPORT_AGENT');
      const afterCategory = await flush(
        firstValueFrom(service.updateCategory('sup-1', 'Erro técnico')),
      );
      expect(afterCategory.category).toBe('Erro técnico');

      const afterPriority = await flush(firstValueFrom(service.updatePriority('sup-1', 'alta')));
      expect(afterPriority.priority).toBe('alta');

      const afterStatus = await flush(firstValueFrom(service.updateStatus('sup-1', 'IN_PROGRESS')));
      expect(afterStatus.status).toBe('IN_PROGRESS');
      expect(afterStatus.messages.length).toBeGreaterThanOrEqual(4);
      expect(afterStatus.messages.every((message) => message.internal === false)).toBe(true);
    });

    it('associates a resource to a ticket', async () => {
      loginAs('SUPPORT_AGENT');
      const updated = await flush(firstValueFrom(service.associateResource('sup-1', 'res-1')));
      expect(updated.relatedResourceId).toBe('res-1');
    });

    it('resolves a ticket, setting resolvedAt', async () => {
      loginAs('SUPPORT_AGENT'); // sup-1 is OPEN
      const updated = await flush(firstValueFrom(service.resolve('sup-1')));
      expect(updated.status).toBe('RESOLVED');
      expect(updated.resolvedAt).toBeDefined();
    });

    it('closes a ticket directly, without requiring it to be RESOLVED first', async () => {
      loginAs('SUPPORT_AGENT'); // sup-1 is OPEN
      const updated = await flush(firstValueFrom(service.close('sup-1')));
      expect(updated.status).toBe('CLOSED');
      expect(updated.closedAt).toBeDefined();
    });
  });
});
