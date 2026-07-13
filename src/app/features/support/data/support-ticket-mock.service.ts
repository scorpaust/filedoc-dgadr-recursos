import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import {
  AppUser,
  SupportTicket,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TicketAttachment,
  TicketCategory,
  TicketMessage,
  TicketPriority,
  TicketStatus,
  USER_ROLE_LABELS,
} from '../../../shared/models';
import { supportTickets } from '../../../shared/mocks/support-tickets.mock';
import { agentName } from '../agent.util';
import { CreateTicketInput } from './create-ticket-input.model';

const SIMULATED_DELAY_MS = 400;
const REFERENCE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REFERENCE_LENGTH = 6;
export const MAX_ATTACHMENTS_PER_MESSAGE = 3;

let nextTicketSequence = supportTickets.length + 1;
let nextMessageSequence = 1;
let nextAttachmentSequence = 1;

function nowIso(): string {
  return new Date().toISOString().slice(0, 19);
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export interface TicketQueueFilters {
  readonly status?: TicketStatus;
  readonly query?: string;
}

// Serviço de dados simulado (Fase 6 — UI). Estado dos pedidos mantido em memória
// (Signal, reposto ao recarregar a aplicação); será substituído, não estendido,
// quando a integração com a API NestJS real for implementada.
@Injectable({ providedIn: 'root' })
export class SupportTicketMockService {
  private readonly authService = inject(AuthService);

  private readonly tickets = signal<readonly SupportTicket[]>(supportTickets);

  listMine(): Observable<readonly SupportTicket[]> {
    const userId = this.currentUserId();
    const mine = this.tickets().filter((ticket) => ticket.requesterId === userId);
    const sorted = [...mine].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return of(sorted).pipe(delay(SIMULATED_DELAY_MS));
  }

  // Devolve "undefined" tanto para um id inexistente como para um pedido de outro
  // utilizador — nunca deve ser possível distinguir os dois casos a partir da resposta.
  getMineById(id: string): Observable<SupportTicket | undefined> {
    const userId = this.currentUserId();
    const ticket = this.tickets().find(
      (candidate) => candidate.id === id && candidate.requesterId === userId,
    );
    return of(ticket).pipe(delay(SIMULATED_DELAY_MS));
  }

  createTicket(input: CreateTicketInput): Observable<SupportTicket> {
    const user = this.requireCurrentUser();
    const now = nowIso();
    const ticket: SupportTicket = {
      id: `sup-${nextTicketSequence++}`,
      reference: this.generateReference(),
      subject: input.subject,
      description: input.description,
      category: input.category,
      priority: input.priority,
      status: 'OPEN',
      requesterId: user.id,
      requester: user.name,
      requesterRole: user.career,
      relatedResourceId: input.relatedResourceId,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg-${nextMessageSequence++}`,
          author: user.name,
          createdAt: now,
          content: input.description,
          internal: false,
        },
      ],
    };
    this.tickets.update((current) => [...current, ticket]);
    return of(ticket).pipe(delay(SIMULATED_DELAY_MS));
  }

  addMessage(
    ticketId: string,
    content: string,
    attachmentFileNames: readonly string[] = [],
  ): Observable<SupportTicket> {
    const ticket = this.findMine(ticketId);
    if (!ticket || ticket.status === 'CLOSED') {
      return throwError(() => new Error('Não é possível responder a este pedido.'));
    }
    const user = this.requireCurrentUser();
    const now = nowIso();
    const attachments: readonly TicketAttachment[] = attachmentFileNames
      .slice(0, MAX_ATTACHMENTS_PER_MESSAGE)
      .map((fileName) => ({ id: `att-${nextAttachmentSequence++}`, fileName }));
    const message: TicketMessage = {
      id: `msg-${nextMessageSequence++}`,
      author: user.name,
      createdAt: now,
      content,
      internal: false,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    const updated: SupportTicket = {
      ...ticket,
      updatedAt: now,
      messages: [...ticket.messages, message],
    };
    this.replaceTicket(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  confirmResolution(ticketId: string): Observable<SupportTicket> {
    const ticket = this.findMine(ticketId);
    if (!ticket || ticket.status !== 'RESOLVED') {
      return throwError(() => new Error('Este pedido não pode ser encerrado neste momento.'));
    }
    const now = nowIso();
    const updated: SupportTicket = { ...ticket, status: 'CLOSED', updatedAt: now, closedAt: now };
    this.replaceTicket(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  // A partir daqui: operações de agente (Fase 7 — UI). Ao contrário de `listMine`/
  // `getMineById`/`addMessage`/`confirmResolution`, nenhuma destas restringe por
  // `requesterId` — a autorização de acesso à vista de agente já foi garantida pelo
  // `roleGuard` na rota `/suporte/gestao`.

  listAll(filters?: TicketQueueFilters): Observable<readonly SupportTicket[]> {
    const query = normalize((filters?.query ?? '').trim());
    const filtered = this.tickets().filter((ticket) => {
      if (filters?.status && ticket.status !== filters.status) {
        return false;
      }
      if (query.length === 0) {
        return true;
      }
      const haystack = normalize(`${ticket.reference} ${ticket.subject} ${ticket.requester}`);
      return haystack.includes(query);
    });
    const sorted = [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return of(sorted).pipe(delay(SIMULATED_DELAY_MS));
  }

  assign(ticketId: string, agentId: string): Observable<SupportTicket> {
    const targetName = agentName(agentId) ?? 'outro agente';
    return this.mutateAsAgent(
      ticketId,
      { assigneeId: agentId },
      (user) => `${user.name} atribuiu o pedido a ${targetName}.`,
    );
  }

  updateCategory(ticketId: string, category: TicketCategory): Observable<SupportTicket> {
    return this.mutateAsAgent(
      ticketId,
      { category },
      (user) => `${user.name} alterou a categoria para "${category}".`,
    );
  }

  updatePriority(ticketId: string, priority: TicketPriority): Observable<SupportTicket> {
    return this.mutateAsAgent(
      ticketId,
      { priority },
      (user) => `${user.name} alterou a prioridade para ${TICKET_PRIORITY_LABELS[priority]}.`,
    );
  }

  updateStatus(ticketId: string, status: TicketStatus): Observable<SupportTicket> {
    const extra: Partial<SupportTicket> =
      status === 'RESOLVED'
        ? { resolvedAt: nowIso() }
        : status === 'CLOSED'
          ? { closedAt: nowIso() }
          : {};
    return this.mutateAsAgent(
      ticketId,
      { status, ...extra },
      (user) => `${user.name} alterou o estado para ${TICKET_STATUS_LABELS[status]}.`,
    );
  }

  associateResource(ticketId: string, resourceId: string): Observable<SupportTicket> {
    return this.mutateAsAgent(
      ticketId,
      { relatedResourceId: resourceId },
      (user) => `${user.name} associou um recurso formativo a este pedido.`,
    );
  }

  // Idênticos, na prática, a uma chamada a `updateStatus`, mas expostos como operações
  // próprias por corresponderem a ações distintas na vista de agente (tarefa A da
  // especificação da Fase 7), sem a restrição de "só o solicitante" do `confirmResolution`.
  resolve(ticketId: string): Observable<SupportTicket> {
    return this.updateStatus(ticketId, 'RESOLVED');
  }

  close(ticketId: string): Observable<SupportTicket> {
    return this.updateStatus(ticketId, 'CLOSED');
  }

  addInternalNote(ticketId: string, content: string): Observable<SupportTicket> {
    const ticket = this.findAny(ticketId);
    if (!ticket) {
      return throwError(() => new Error('Pedido não encontrado.'));
    }
    const user = this.requireCurrentUser();
    const now = nowIso();
    const message: TicketMessage = {
      id: `msg-${nextMessageSequence++}`,
      author: user.name,
      authorRole: USER_ROLE_LABELS[user.role],
      createdAt: now,
      content,
      internal: true,
    };
    const updated: SupportTicket = {
      ...ticket,
      updatedAt: now,
      messages: [...ticket.messages, message],
    };
    this.replaceTicket(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  // Resposta pública do agente — equivalente a `addMessage`, mas sem a restrição de
  // "só o solicitante" (o agente não é o solicitante do pedido).
  reply(ticketId: string, content: string): Observable<SupportTicket> {
    const ticket = this.findAny(ticketId);
    if (!ticket || ticket.status === 'CLOSED') {
      return throwError(() => new Error('Não é possível responder a este pedido.'));
    }
    const user = this.requireCurrentUser();
    const now = nowIso();
    const message: TicketMessage = {
      id: `msg-${nextMessageSequence++}`,
      author: user.name,
      authorRole: USER_ROLE_LABELS[user.role],
      createdAt: now,
      content,
      internal: false,
    };
    const updated: SupportTicket = {
      ...ticket,
      updatedAt: now,
      messages: [...ticket.messages, message],
    };
    this.replaceTicket(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  private findAny(ticketId: string): SupportTicket | undefined {
    return this.tickets().find((candidate) => candidate.id === ticketId);
  }

  private mutateAsAgent(
    ticketId: string,
    changes: Partial<SupportTicket>,
    historyText: (user: AppUser) => string,
  ): Observable<SupportTicket> {
    const ticket = this.findAny(ticketId);
    if (!ticket) {
      return throwError(() => new Error('Pedido não encontrado.'));
    }
    const user = this.requireCurrentUser();
    const now = nowIso();
    const message: TicketMessage = {
      id: `msg-${nextMessageSequence++}`,
      author: user.name,
      authorRole: USER_ROLE_LABELS[user.role],
      createdAt: now,
      content: historyText(user),
      internal: false,
      kind: 'status-change',
    };
    const updated: SupportTicket = {
      ...ticket,
      ...changes,
      updatedAt: now,
      messages: [...ticket.messages, message],
    };
    this.replaceTicket(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  private findMine(ticketId: string): SupportTicket | undefined {
    const userId = this.currentUserId();
    return this.tickets().find(
      (candidate) => candidate.id === ticketId && candidate.requesterId === userId,
    );
  }

  private replaceTicket(updated: SupportTicket): void {
    this.tickets.update((current) =>
      current.map((ticket) => (ticket.id === updated.id ? updated : ticket)),
    );
  }

  // A parte aleatória não é sequencial nem previsível, mesmo em mock, para já habituar
  // o padrão que a API virá a implementar (project-spec.md, secção J).
  private generateReference(): string {
    const year = new Date().getFullYear();
    const existing = new Set(this.tickets().map((ticket) => ticket.reference));
    let reference: string;
    do {
      const random = Array.from(
        { length: REFERENCE_LENGTH },
        () => REFERENCE_CHARSET[Math.floor(Math.random() * REFERENCE_CHARSET.length)],
      ).join('');
      reference = `SUP-${year}-${random}`;
    } while (existing.has(reference));
    return reference;
  }

  private currentUserId(): string {
    return this.authService.currentUser()?.id ?? '';
  }

  private requireCurrentUser() {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('Não é possível efetuar esta operação sem sessão iniciada.');
    }
    return user;
  }
}
