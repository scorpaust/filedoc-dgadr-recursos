import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, switchMap, throwError } from 'rxjs';
import {
  RelatedResourceSummary,
  SupportTicket,
  TicketAttachment,
  TicketCategory,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from '../../../shared/models';
import type { TicketQueueFilters } from './support-ticket-mock.service';

const GENERIC_ERROR_MESSAGE = 'Não foi possível concluir o pedido. Tente novamente.';

// `GET /support/tickets/agents` — roster real de utilizadores atribuíveis (bug corrigido:
// o seletor "Atribuído a" usava antes o roster estático de utilizadores mock da via de UI,
// `SUPPORT_AGENTS`/`agent.util.ts`, cujos ids nunca correspondem aos ids reais gerados pela
// BD — qualquer reatribuição a um agente que não o próprio utilizador autenticado falhava
// sempre com 400 na API real).
export interface SupportAgent {
  readonly id: string;
  readonly name: string;
}

interface SupportTicketMessageApiItem {
  readonly id: string;
  readonly author: string;
  readonly authorRole?: string;
  readonly createdAt: string;
  readonly content: string;
  readonly internal: boolean;
  readonly attachments?: readonly TicketAttachment[];
}

interface SupportTicketApiItem {
  readonly id: string;
  readonly reference: string;
  readonly subject: string;
  readonly description: string;
  readonly category: TicketCategory;
  readonly priority: TicketPriority;
  readonly status: TicketStatus;
  readonly requesterId: string;
  readonly requester: string;
  readonly requesterRole: string;
  readonly assigneeId?: string;
  readonly relatedResourceId?: string;
  readonly relatedResource?: RelatedResourceSummary;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly resolvedAt?: string;
  readonly closedAt?: string;
  readonly messages: readonly SupportTicketMessageApiItem[];
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null | undefined;
    if (typeof body?.message === 'string') {
      return body.message;
    }
  }
  return GENERIC_ERROR_MESSAGE;
}

/**
 * Consome os endpoints reais de gestão de suporte (fase-6-integracao-gestao-suporte.md),
 * com a mesma assinatura pública das operações de agente de `SupportTicketMockService`
 * (via de UI, Fase 7) — `SupportManagementPageComponent` troca apenas o serviço injetado.
 *
 * Diferença face ao mock: as entradas de histórico automáticas (atribuição, alteração de
 * categoria/prioridade/estado, associação de recurso) são geradas pela própria API, nunca
 * aqui — nenhum destes métodos constrói localmente uma mensagem sintética.
 */
@Injectable({ providedIn: 'root' })
export class SupportTicketService {
  private readonly http = inject(HttpClient);

  listAll(filters?: TicketQueueFilters): Observable<readonly SupportTicket[]> {
    let params = new HttpParams();
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.query) {
      params = params.set('q', filters.query);
    }
    return this.http.get<readonly SupportTicketApiItem[]>('/support/tickets', { params }).pipe(
      map((items) => items.map((item) => this.toTicket(item))),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  assign(ticketId: string, agentId: string): Observable<SupportTicket> {
    return this.post(`/support/tickets/${ticketId}/assign`, { agentId });
  }

  listAgents(): Observable<readonly SupportAgent[]> {
    return this.http
      .get<readonly SupportAgent[]>('/support/tickets/agents')
      .pipe(
        catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
      );
  }

  updateCategory(ticketId: string, category: TicketCategory): Observable<SupportTicket> {
    return this.patch(ticketId, { category });
  }

  updatePriority(ticketId: string, priority: TicketPriority): Observable<SupportTicket> {
    return this.patch(ticketId, { priority });
  }

  updateStatus(ticketId: string, status: TicketStatus): Observable<SupportTicket> {
    return this.patch(ticketId, { status });
  }

  associateResource(ticketId: string, resourceId: string): Observable<SupportTicket> {
    return this.patch(ticketId, { relatedResourceId: resourceId });
  }

  resolve(ticketId: string): Observable<SupportTicket> {
    return this.post(`/support/tickets/${ticketId}/resolve`, {});
  }

  close(ticketId: string): Observable<SupportTicket> {
    return this.post(`/support/tickets/${ticketId}/close`, {});
  }

  // `POST .../internal-notes` devolve apenas a mensagem criada — a página precisa do
  // pedido completo (mesma assinatura pública do mock), daí o pedido adicional em cadeia,
  // tal como já faz `TicketService.addMessage` (Fase 5 — Integração) para os anexos.
  addInternalNote(ticketId: string, content: string): Observable<SupportTicket> {
    return this.http.post(`/support/tickets/${ticketId}/internal-notes`, { content }).pipe(
      switchMap(() => this.getById(ticketId)),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  reply(ticketId: string, content: string): Observable<SupportTicket> {
    return this.http.post(`/support/tickets/${ticketId}/messages`, { content }).pipe(
      switchMap(() => this.getById(ticketId)),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  private getById(ticketId: string): Observable<SupportTicket> {
    return this.http.get<SupportTicketApiItem>(`/support/tickets/${ticketId}`).pipe(
      map((item) => this.toTicket(item)),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  private patch(ticketId: string, body: Record<string, unknown>): Observable<SupportTicket> {
    return this.http.patch<SupportTicketApiItem>(`/support/tickets/${ticketId}`, body).pipe(
      map((item) => this.toTicket(item)),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  private post(url: string, body: Record<string, unknown>): Observable<SupportTicket> {
    return this.http.post<SupportTicketApiItem>(url, body).pipe(
      map((item) => this.toTicket(item)),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  private toTicket(item: SupportTicketApiItem): SupportTicket {
    return {
      id: item.id,
      reference: item.reference,
      subject: item.subject,
      description: item.description,
      category: item.category,
      priority: item.priority,
      status: item.status,
      requesterId: item.requesterId,
      requester: item.requester,
      requesterRole: item.requesterRole,
      assigneeId: item.assigneeId,
      relatedResourceId: item.relatedResourceId,
      relatedResource: item.relatedResource,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      resolvedAt: item.resolvedAt,
      closedAt: item.closedAt,
      messages: item.messages.map((message) => this.toMessage(message)),
    };
  }

  private toMessage(message: SupportTicketMessageApiItem): TicketMessage {
    return {
      id: message.id,
      author: message.author,
      authorRole: message.authorRole,
      createdAt: message.createdAt,
      content: message.content,
      internal: message.internal,
      attachments: message.attachments,
    };
  }
}
