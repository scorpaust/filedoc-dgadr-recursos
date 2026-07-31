import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, throwError } from 'rxjs';
import { Taxonomy, TaxonomyKind } from '../../../shared/models';

const GENERIC_ERROR_MESSAGE = 'Não foi possível concluir o pedido. Tente novamente.';
const TAXONOMY_KINDS: readonly TaxonomyKind[] = ['workflow', 'documentType', 'tag'];

interface TaxonomyApiItem {
  readonly id: string;
  readonly label: string;
  readonly order: number;
  readonly active: boolean;
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
 * Consome os endpoints reais do módulo `taxonomies/` da API
 * (fase-7-integracao-gestao-conteudos.md), com a mesma assinatura pública de
 * `TaxonomyMockService.list`/`create`/`update`/`toggleActive`/`reorder`/`delete` —
 * `TaxonomyManagementComponent` (e `ResourceFormPageComponent`, para os `select` de
 * fluxo/tipo de documento) trocam apenas o serviço injetado.
 *
 * Diferença deliberada face ao mock: `delete` já não faz uma verificação prévia de uso —
 * chama diretamente `DELETE /taxonomies/:type/:id` e devolve a mensagem amigável que a API
 * já traduz a partir da violação de restrição da base de dados (tarefa C da especificação).
 */
@Injectable({ providedIn: 'root' })
export class TaxonomyService {
  private readonly http = inject(HttpClient);

  // Preenchido a cada `list()`/`create()` — as mutações (`update`/`toggleActive`/`reorder`/
  // `delete`) recebem só o `id` (mesma assinatura pública do mock), pelo que o tipo de
  // taxonomia (`workflow`/`documentType`/`tag`), exigido pelo URL da API, é resolvido a
  // partir daqui.
  private readonly kindById = new Map<string, TaxonomyKind>();

  list(kind?: TaxonomyKind): Observable<readonly Taxonomy[]> {
    if (kind) {
      return this.listOne(kind);
    }
    return forkJoin(TAXONOMY_KINDS.map((k) => this.listOne(k))).pipe(
      map((groups) => groups.flat()),
    );
  }

  create(kind: TaxonomyKind, label: string): Observable<Taxonomy> {
    return this.http.post<TaxonomyApiItem>(`/taxonomies/${kind}`, { name: label }).pipe(
      map((item) => this.toTaxonomy(kind, item)),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  update(id: string, label: string): Observable<Taxonomy> {
    return this.withKind(id, (kind) =>
      this.http
        .patch<TaxonomyApiItem>(`/taxonomies/${kind}/${id}`, { name: label })
        .pipe(map((item) => this.toTaxonomy(kind, item))),
    );
  }

  toggleActive(id: string): Observable<Taxonomy> {
    return this.withKind(id, (kind) =>
      this.http
        .patch<TaxonomyApiItem>(`/taxonomies/${kind}/${id}/toggle-active`, {})
        .pipe(map((item) => this.toTaxonomy(kind, item))),
    );
  }

  reorder(id: string, direction: 'up' | 'down'): Observable<readonly Taxonomy[]> {
    return this.withKind(id, (kind) =>
      this.http
        .post<readonly TaxonomyApiItem[]>(`/taxonomies/${kind}/reorder`, { id, direction })
        .pipe(map((items) => items.map((item) => this.toTaxonomy(kind, item)))),
    );
  }

  delete(id: string): Observable<void> {
    return this.withKind(id, (kind) => this.http.delete<void>(`/taxonomies/${kind}/${id}`));
  }

  private withKind<T>(id: string, request: (kind: TaxonomyKind) => Observable<T>): Observable<T> {
    const kind = this.kindById.get(id);
    if (!kind) {
      return throwError(() => new Error(GENERIC_ERROR_MESSAGE));
    }
    return request(kind).pipe(
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  private listOne(kind: TaxonomyKind): Observable<readonly Taxonomy[]> {
    return this.http.get<readonly TaxonomyApiItem[]>(`/taxonomies/${kind}`).pipe(
      map((items) => items.map((item) => this.toTaxonomy(kind, item))),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  private toTaxonomy(kind: TaxonomyKind, item: TaxonomyApiItem): Taxonomy {
    this.kindById.set(item.id, kind);
    return { id: item.id, kind, label: item.label, order: item.order, active: item.active };
  }
}
