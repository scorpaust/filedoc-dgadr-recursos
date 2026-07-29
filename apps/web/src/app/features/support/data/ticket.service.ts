import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  concatMap,
  from,
  map,
  of,
  switchMap,
  throwError,
  toArray,
} from 'rxjs';
import {
  SupportTicket,
  TicketAttachment,
  TicketCategory,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from '../../../shared/models';
import { CreateTicketInput } from './create-ticket-input.model';

const GENERIC_ERROR_MESSAGE = 'Não foi possível concluir o pedido. Tente novamente.';
export const MAX_ATTACHMENTS_PER_MESSAGE = 3;

interface TicketMessageApiItem {
  readonly id: string;
  readonly author: string;
  readonly authorRole?: string;
  readonly createdAt: string;
  readonly content: string;
  readonly internal: false;
  readonly attachments?: readonly TicketAttachment[];
}

interface TicketApiItem {
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
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly resolvedAt?: string;
  readonly closedAt?: string;
  readonly messages: readonly TicketMessageApiItem[];
}

// A resposta de "init" só é tratada no modo `single` — os anexos de suporte ficam sempre
// muito abaixo do limiar de multipart (`STORAGE_MULTIPART_THRESHOLD_BYTES`), pelo que o
// modo `multipart` nunca é exercitado na prática; tratado como erro explícito abaixo.
interface AttachmentUploadInit {
  readonly mode: 'single' | 'multipart';
  readonly objectKey: string;
  readonly uploadUrl?: string;
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
 * Consome os endpoints reais do módulo `tickets/` da API (fase-5-integracao-suporte-trabalhador.md),
 * com a mesma assinatura pública de `listMine`/`getMineById`/`createTicket`/`addMessage`/
 * `confirmResolution` do `SupportTicketMockService` (Fase 6 — UI) — as páginas "Os meus
 * pedidos", "Novo pedido" e "Detalhe" trocam apenas o serviço injetado. As operações de
 * agente (Fase 7 — UI, fora de âmbito desta fase) continuam em `SupportTicketMockService`.
 *
 * Diferença deliberada face ao mock: `addMessage` recebe agora ficheiros reais (`File`), não
 * apenas nomes — os anexos são carregados diretamente para o armazenamento (`StorageService`,
 * Fase 2 — Integração), sem bytes a passar pela API.
 */
@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly http = inject(HttpClient);

  listMine(): Observable<readonly SupportTicket[]> {
    return this.http.get<readonly TicketApiItem[]>('/tickets/mine').pipe(
      map((items) => items.map((item) => this.toTicket(item))),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  getMineById(id: string): Observable<SupportTicket | undefined> {
    return this.http.get<TicketApiItem>(`/tickets/mine/${encodeURIComponent(id)}`).pipe(
      map((item) => this.toTicket(item)),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of(undefined);
        }
        return throwError(() => new Error(extractErrorMessage(error)));
      }),
    );
  }

  createTicket(input: CreateTicketInput): Observable<SupportTicket> {
    return this.http
      .post<TicketApiItem>('/tickets', {
        subject: input.subject,
        description: input.description,
        category: input.category,
        priority: input.priority,
        relatedResourceId: input.relatedResourceId,
      })
      .pipe(
        map((item) => this.toTicket(item)),
        catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
      );
  }

  addMessage(
    ticketId: string,
    content: string,
    attachments: readonly File[] = [],
  ): Observable<SupportTicket> {
    return this.http
      .post<TicketMessageApiItem>(`/tickets/mine/${ticketId}/messages`, { content })
      .pipe(
        switchMap((message) =>
          this.uploadAttachments(
            ticketId,
            message.id,
            attachments.slice(0, MAX_ATTACHMENTS_PER_MESSAGE),
          ),
        ),
        switchMap(() => this.getMineById(ticketId)),
        map((ticket) => {
          if (!ticket) {
            throw new Error(GENERIC_ERROR_MESSAGE);
          }
          return ticket;
        }),
        catchError((error: unknown) =>
          throwError(() =>
            error instanceof Error ? error : new Error(extractErrorMessage(error)),
          ),
        ),
      );
  }

  confirmResolution(ticketId: string): Observable<SupportTicket> {
    return this.http.post<TicketApiItem>(`/tickets/mine/${ticketId}/confirm-resolution`, {}).pipe(
      map((item) => this.toTicket(item)),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  private uploadAttachments(
    ticketId: string,
    messageId: string,
    files: readonly File[],
  ): Observable<void> {
    if (files.length === 0) {
      return of(undefined);
    }
    return from(files).pipe(
      concatMap((file) => this.uploadOne(ticketId, messageId, file)),
      toArray(),
      map(() => undefined),
    );
  }

  private uploadOne(ticketId: string, messageId: string, file: File): Observable<void> {
    const mimeType = file.type || 'application/octet-stream';
    return this.http
      .post<AttachmentUploadInit>(`/tickets/mine/${ticketId}/attachments`, {
        phase: 'init',
        messageId,
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
      })
      .pipe(
        switchMap((init) => {
          if (init.mode !== 'single' || !init.uploadUrl) {
            return throwError(
              () => new Error('Este ficheiro é demasiado grande para ser anexado diretamente.'),
            );
          }
          return this.putFile(init.uploadUrl, file, mimeType).pipe(
            switchMap(() =>
              this.http.post(`/tickets/mine/${ticketId}/attachments`, {
                phase: 'confirm',
                messageId,
                fileName: file.name,
                mimeType,
                objectKey: init.objectKey,
                size: file.size,
              }),
            ),
            map(() => undefined),
          );
        }),
      );
  }

  // Envio direto para o armazenamento com `fetch` nativo, não `HttpClient`: o interceptor
  // global (`apiUrlInterceptor`) força `withCredentials: true` em todos os pedidos, o que
  // enviaria o cookie de sessão HttpOnly para um URL pré-assinado de armazenamento que não
  // deve recebê-lo — o próprio URL já contém a autorização necessária (assinatura), sem
  // depender de cookies nem de outros cabeçalhos da aplicação.
  private putFile(uploadUrl: string, file: File, mimeType: string): Observable<void> {
    return from(
      fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: file }),
    ).pipe(
      switchMap((response) =>
        response.ok
          ? of(undefined)
          : throwError(() => new Error('Não foi possível carregar o anexo.')),
      ),
    );
  }

  private toTicket(item: TicketApiItem): SupportTicket {
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
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      resolvedAt: item.resolvedAt,
      closedAt: item.closedAt,
      messages: item.messages.map((message) => this.toMessage(message)),
    };
  }

  private toMessage(message: TicketMessageApiItem): TicketMessage {
    return {
      id: message.id,
      author: message.author,
      authorRole: message.authorRole,
      createdAt: message.createdAt,
      content: message.content,
      internal: false,
      attachments: message.attachments,
    };
  }
}
