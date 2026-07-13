import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { EditorialStatus, Faq, Tip, UserRole } from '../../../shared/models';
import { faqs } from '../../../shared/mocks/faqs.mock';
import { tips } from '../../../shared/mocks/tips.mock';

const SIMULATED_DELAY_MS = 300;
const EDITOR_ROLES: readonly UserRole[] = ['CONTENT_EDITOR', 'ADMIN'];

// Serviço de dados simulado (Fase 5 — UI). Serve dicas e perguntas frequentes a
// partir do mesmo serviço, por partilharem exatamente a mesma regra de visibilidade
// já usada para os recursos (Fases 3 e 4).
@Injectable({ providedIn: 'root' })
export class TipsFaqMockService {
  private readonly authService = inject(AuthService);

  getTips(): Observable<readonly Tip[]> {
    const role = this.authService.currentRole();
    const visible = tips.filter((tip) => this.isVisible(tip.status, role));
    return of(this.sortByOrder(visible)).pipe(delay(SIMULATED_DELAY_MS));
  }

  getFaqs(): Observable<readonly Faq[]> {
    const role = this.authService.currentRole();
    const visible = faqs.filter((faq) => this.isVisible(faq.status, role));
    return of(this.sortByOrder(visible)).pipe(delay(SIMULATED_DELAY_MS));
  }

  private isVisible(status: EditorialStatus, role: UserRole | null): boolean {
    if (status === 'archived') {
      return false;
    }
    if (status === 'draft') {
      return role !== null && EDITOR_ROLES.includes(role);
    }
    return true;
  }

  private sortByOrder<T extends { readonly sortOrder: number }>(items: readonly T[]): T[] {
    return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
