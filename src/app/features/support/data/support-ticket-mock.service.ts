import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { SupportTicket, TicketAttachment, TicketMessage } from '../../../shared/models';
import { supportTickets } from '../../../shared/mocks/support-tickets.mock';
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
