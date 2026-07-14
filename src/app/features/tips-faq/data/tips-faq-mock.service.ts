import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { EditorialStatus, Faq, Tip, UserRole, hasAnyRole } from '../../../shared/models';
import { faqs } from '../../../shared/mocks/faqs.mock';
import { tips } from '../../../shared/mocks/tips.mock';

const SIMULATED_DELAY_MS = 300;
const EDITOR_ROLES: readonly UserRole[] = ['CONTENT_EDITOR', 'ADMIN'];

let nextTipSequence = tips.length + 1;
let nextFaqSequence = faqs.length + 1;

export interface FaqInput {
  readonly question: string;
  readonly answer: string;
  readonly category?: string;
}

// Serviço de dados simulado (Fase 5 — UI, estendido na Fase 8 com operações de escrita).
// Serve dicas e perguntas frequentes a partir do mesmo serviço, por partilharem exatamente
// a mesma regra de visibilidade já usada para os recursos (Fases 3 e 4). Estado mantido em
// memória (Signal, reposto ao recarregar a aplicação).
@Injectable({ providedIn: 'root' })
export class TipsFaqMockService {
  private readonly authService = inject(AuthService);

  private readonly tipsSignal = signal<readonly Tip[]>(tips);
  private readonly faqsSignal = signal<readonly Faq[]>(faqs);

  getTips(): Observable<readonly Tip[]> {
    const roles = this.authService.roles();
    const visible = this.tipsSignal().filter((tip) => this.isVisible(tip.status, roles));
    return of(this.sortByOrder(visible)).pipe(delay(SIMULATED_DELAY_MS));
  }

  getFaqs(): Observable<readonly Faq[]> {
    const roles = this.authService.roles();
    const visible = this.faqsSignal().filter((faq) => this.isVisible(faq.status, roles));
    return of(this.sortByOrder(visible)).pipe(delay(SIMULATED_DELAY_MS));
  }

  // A partir daqui: gestão editorial (Fase 8 — UI), sem restrição por visibilidade — a
  // autorização de acesso a `/conteudos` já foi garantida pelo `roleGuard` na rota.

  listAllTips(): Observable<readonly Tip[]> {
    return of(this.sortByOrder(this.tipsSignal())).pipe(delay(SIMULATED_DELAY_MS));
  }

  listAllFaqs(): Observable<readonly Faq[]> {
    return of(this.sortByOrder(this.faqsSignal())).pipe(delay(SIMULATED_DELAY_MS));
  }

  createTip(text: string): Observable<Tip> {
    const trimmed = text.trim();
    if (!trimmed) {
      return throwError(() => new Error('O texto da dica é obrigatório.'));
    }
    const maxOrder = this.tipsSignal().reduce((max, tip) => Math.max(max, tip.sortOrder), 0);
    const tip: Tip = {
      id: `tip-${nextTipSequence++}`,
      text: trimmed,
      status: 'draft',
      sortOrder: maxOrder + 1,
    };
    this.tipsSignal.update((current) => [...current, tip]);
    return of(tip).pipe(delay(SIMULATED_DELAY_MS));
  }

  updateTip(id: string, text: string): Observable<Tip> {
    const tip = this.findTip(id);
    if (!tip) {
      return throwError(() => new Error('Dica não encontrada.'));
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return throwError(() => new Error('O texto da dica é obrigatório.'));
    }
    const updated: Tip = { ...tip, text: trimmed };
    this.replaceTip(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  publishTip(id: string): Observable<Tip> {
    return this.setTipStatus(id, 'published');
  }

  unpublishTip(id: string): Observable<Tip> {
    return this.setTipStatus(id, 'draft');
  }

  archiveTip(id: string): Observable<Tip> {
    return this.setTipStatus(id, 'archived');
  }

  // Traz uma dica arquivada de volta a rascunho — nunca fica presa sem saída.
  restoreTip(id: string): Observable<Tip> {
    return this.setTipStatus(id, 'draft');
  }

  reorderTip(id: string, direction: 'up' | 'down'): Observable<readonly Tip[]> {
    const reordered = this.swapOrder(this.tipsSignal(), id, direction);
    if (!reordered) {
      return throwError(() => new Error('Dica não encontrada.'));
    }
    this.tipsSignal.set(reordered);
    return of(this.sortByOrder(reordered)).pipe(delay(SIMULATED_DELAY_MS));
  }

  createFaq(input: FaqInput): Observable<Faq> {
    if (!input.question.trim() || !input.answer.trim()) {
      return throwError(() => new Error('A pergunta e a resposta são obrigatórias.'));
    }
    const maxOrder = this.faqsSignal().reduce((max, faq) => Math.max(max, faq.sortOrder), 0);
    const faq: Faq = {
      id: `faq-${nextFaqSequence++}`,
      question: input.question.trim(),
      answer: input.answer.trim(),
      category: input.category?.trim() || undefined,
      status: 'draft',
      sortOrder: maxOrder + 1,
    };
    this.faqsSignal.update((current) => [...current, faq]);
    return of(faq).pipe(delay(SIMULATED_DELAY_MS));
  }

  updateFaq(id: string, input: FaqInput): Observable<Faq> {
    const faq = this.findFaq(id);
    if (!faq) {
      return throwError(() => new Error('Pergunta não encontrada.'));
    }
    if (!input.question.trim() || !input.answer.trim()) {
      return throwError(() => new Error('A pergunta e a resposta são obrigatórias.'));
    }
    const updated: Faq = {
      ...faq,
      question: input.question.trim(),
      answer: input.answer.trim(),
      category: input.category?.trim() || undefined,
    };
    this.replaceFaq(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  publishFaq(id: string): Observable<Faq> {
    return this.setFaqStatus(id, 'published');
  }

  unpublishFaq(id: string): Observable<Faq> {
    return this.setFaqStatus(id, 'draft');
  }

  archiveFaq(id: string): Observable<Faq> {
    return this.setFaqStatus(id, 'archived');
  }

  // Traz uma pergunta arquivada de volta a rascunho — nunca fica presa sem saída.
  restoreFaq(id: string): Observable<Faq> {
    return this.setFaqStatus(id, 'draft');
  }

  reorderFaq(id: string, direction: 'up' | 'down'): Observable<readonly Faq[]> {
    const reordered = this.swapOrder(this.faqsSignal(), id, direction);
    if (!reordered) {
      return throwError(() => new Error('Pergunta não encontrada.'));
    }
    this.faqsSignal.set(reordered);
    return of(this.sortByOrder(reordered)).pipe(delay(SIMULATED_DELAY_MS));
  }

  private isVisible(status: EditorialStatus, roles: readonly UserRole[]): boolean {
    if (status === 'archived') {
      return false;
    }
    if (status === 'draft') {
      return hasAnyRole(roles, EDITOR_ROLES);
    }
    return true;
  }

  private sortByOrder<T extends { readonly sortOrder: number }>(items: readonly T[]): T[] {
    return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // Troca a `sortOrder` de um item com o seu vizinho imediato (alternativa acessível ao
  // arrastar e largar, obrigatória por operabilidade por teclado — project-spec.md, tarefa E).
  private swapOrder<T extends { readonly id: string; readonly sortOrder: number }>(
    items: readonly T[],
    id: string,
    direction: 'up' | 'down',
  ): readonly T[] | undefined {
    const sorted = this.sortByOrder(items);
    const currentIndex = sorted.findIndex((item) => item.id === id);
    if (currentIndex === -1) {
      return undefined;
    }
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) {
      return items;
    }
    const current = sorted[currentIndex];
    const target = sorted[targetIndex];
    return items.map((item) => {
      if (item.id === current.id) return { ...item, sortOrder: target.sortOrder };
      if (item.id === target.id) return { ...item, sortOrder: current.sortOrder };
      return item;
    });
  }

  private setTipStatus(id: string, status: EditorialStatus): Observable<Tip> {
    const tip = this.findTip(id);
    if (!tip) {
      return throwError(() => new Error('Dica não encontrada.'));
    }
    const updated: Tip = { ...tip, status };
    this.replaceTip(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  private setFaqStatus(id: string, status: EditorialStatus): Observable<Faq> {
    const faq = this.findFaq(id);
    if (!faq) {
      return throwError(() => new Error('Pergunta não encontrada.'));
    }
    const updated: Faq = { ...faq, status };
    this.replaceFaq(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  private findTip(id: string): Tip | undefined {
    return this.tipsSignal().find((candidate) => candidate.id === id);
  }

  private findFaq(id: string): Faq | undefined {
    return this.faqsSignal().find((candidate) => candidate.id === id);
  }

  private replaceTip(updated: Tip): void {
    this.tipsSignal.update((current) =>
      current.map((tip) => (tip.id === updated.id ? updated : tip)),
    );
  }

  private replaceFaq(updated: Faq): void {
    this.faqsSignal.update((current) =>
      current.map((faq) => (faq.id === updated.id ? updated : faq)),
    );
  }
}
