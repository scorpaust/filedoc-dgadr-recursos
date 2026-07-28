import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EditorialStatus, Faq, Tip } from '../../../shared/models';

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

/**
 * Consome os endpoints reais do módulo `content/` da API (fase-4-integracao-dicas-faq.md), com a
 * mesma assinatura pública de `TipsFaqMockService.getTips`/`getFaqs` — `TipsFaqPageComponent`
 * troca apenas o serviço injetado. A resposta da API já corresponde 1:1 aos modelos `Tip`/`Faq`
 * do frontend, sem necessidade de mapeamento. As operações de gestão editorial (Fase 7 — fora
 * de âmbito desta fase) continuam em `TipsFaqMockService`.
 */
@Injectable({ providedIn: 'root' })
export class TipsFaqService {
  private readonly http = inject(HttpClient);

  getTips(): Observable<readonly Tip[]> {
    return this.http.get<readonly TipApiItem[]>('/tips');
  }

  getFaqs(): Observable<readonly Faq[]> {
    return this.http.get<readonly FaqApiItem[]>('/faqs');
  }
}
