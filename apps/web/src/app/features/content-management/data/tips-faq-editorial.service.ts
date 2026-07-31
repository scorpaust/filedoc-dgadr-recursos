import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { EditorialStatus, Faq, Tip } from '../../../shared/models';
import { FaqInput } from '../../tips-faq/data/tips-faq-mock.service';

const GENERIC_ERROR_MESSAGE = 'Não foi possível concluir o pedido. Tente novamente.';

interface TipApiItem {
  readonly id: string;
  readonly text: string;
  readonly status: EditorialStatus;
  readonly sortOrder: number;
}

interface FaqApiItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly category?: string;
  readonly status: EditorialStatus;
  readonly sortOrder: number;
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
 * Consome os endpoints reais de escrita dos módulos `tips/`/`faqs/` da API
 * (fase-7-integracao-gestao-conteudos.md), com a mesma assinatura pública de
 * `TipsFaqMockService.listAllTips`/`listAllFaqs`/`createTip`/`updateTip`/`publishTip`/
 * `unpublishTip`/`archiveTip`/`restoreTip`/`reorderTip` e equivalentes de FAQ —
 * `TipsFaqManagementComponent` troca apenas o serviço injetado. A leitura pública
 * (`/dicas-faq`) continua em `TipsFaqMockService` (fora do âmbito desta fase).
 *
 * Diferença deliberada face ao mock: `Tip.title` nunca é enviado nem devolvido — é derivado
 * automaticamente pela API a partir do conteúdo (`ContentService.deriveTipTitle`), tal como
 * já acontecia na leitura pública.
 */
@Injectable({ providedIn: 'root' })
export class TipsFaqEditorialService {
  private readonly http = inject(HttpClient);

  listAllTips(): Observable<readonly Tip[]> {
    return this.http.get<readonly TipApiItem[]>('/tips/management').pipe(
      map((items) => items.map((item) => this.toTip(item))),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  listAllFaqs(): Observable<readonly Faq[]> {
    return this.http.get<readonly FaqApiItem[]>('/faqs/management').pipe(
      map((items) => items.map((item) => this.toFaq(item))),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  createTip(text: string): Observable<Tip> {
    return this.mutateTip('/tips', 'post', { content: text });
  }

  updateTip(id: string, text: string): Observable<Tip> {
    return this.mutateTip(`/tips/${id}`, 'patch', { content: text });
  }

  publishTip(id: string): Observable<Tip> {
    return this.mutateTip(`/tips/${id}/publish`, 'post');
  }

  unpublishTip(id: string): Observable<Tip> {
    return this.mutateTip(`/tips/${id}/unpublish`, 'post');
  }

  archiveTip(id: string): Observable<Tip> {
    return this.mutateTip(`/tips/${id}/archive`, 'post');
  }

  restoreTip(id: string): Observable<Tip> {
    return this.mutateTip(`/tips/${id}/restore`, 'post');
  }

  reorderTip(id: string, direction: 'up' | 'down'): Observable<readonly Tip[]> {
    return this.http.post<readonly TipApiItem[]>('/tips/reorder', { id, direction }).pipe(
      map((items) => items.map((item) => this.toTip(item))),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  createFaq(input: FaqInput): Observable<Faq> {
    return this.mutateFaq('/faqs', 'post', input);
  }

  updateFaq(id: string, input: FaqInput): Observable<Faq> {
    return this.mutateFaq(`/faqs/${id}`, 'patch', input);
  }

  publishFaq(id: string): Observable<Faq> {
    return this.mutateFaq(`/faqs/${id}/publish`, 'post');
  }

  unpublishFaq(id: string): Observable<Faq> {
    return this.mutateFaq(`/faqs/${id}/unpublish`, 'post');
  }

  archiveFaq(id: string): Observable<Faq> {
    return this.mutateFaq(`/faqs/${id}/archive`, 'post');
  }

  restoreFaq(id: string): Observable<Faq> {
    return this.mutateFaq(`/faqs/${id}/restore`, 'post');
  }

  reorderFaq(id: string, direction: 'up' | 'down'): Observable<readonly Faq[]> {
    return this.http.post<readonly FaqApiItem[]>('/faqs/reorder', { id, direction }).pipe(
      map((items) => items.map((item) => this.toFaq(item))),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  private mutateTip(
    url: string,
    method: 'post' | 'patch',
    body: Record<string, unknown> = {},
  ): Observable<Tip> {
    const request$ =
      method === 'post'
        ? this.http.post<TipApiItem>(url, body)
        : this.http.patch<TipApiItem>(url, body);
    return request$.pipe(
      map((item) => this.toTip(item)),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  private mutateFaq(
    url: string,
    method: 'post' | 'patch',
    body: FaqInput | Record<string, never> = {},
  ): Observable<Faq> {
    const request$ =
      method === 'post'
        ? this.http.post<FaqApiItem>(url, body)
        : this.http.patch<FaqApiItem>(url, body);
    return request$.pipe(
      map((item) => this.toFaq(item)),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  private toTip(item: TipApiItem): Tip {
    return { id: item.id, text: item.text, status: item.status, sortOrder: item.sortOrder };
  }

  private toFaq(item: FaqApiItem): Faq {
    return {
      id: item.id,
      question: item.question,
      answer: item.answer,
      category: item.category,
      status: item.status,
      sortOrder: item.sortOrder,
    };
  }
}
