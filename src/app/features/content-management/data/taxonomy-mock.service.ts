import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Taxonomy, TaxonomyKind } from '../../../shared/models';
import { taxonomies } from '../../../shared/mocks/taxonomies.mock';
import { ResourceMockService } from '../../resources/data/resource-mock.service';

const SIMULATED_DELAY_MS = 300;

let nextTaxonomySequence = taxonomies.length + 1;

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Serviço de dados simulado (Fase 8 — UI). Gere fluxos, tipos de documento e etiquetas
// como taxonomias com ordem e estado ativo/inativo (project-spec.md, secção B). Estado
// mantido em memória (Signal, reposto ao recarregar a aplicação).
@Injectable({ providedIn: 'root' })
export class TaxonomyMockService {
  private readonly resourceService = inject(ResourceMockService);

  private readonly items = signal<readonly Taxonomy[]>(taxonomies);

  list(kind?: TaxonomyKind): Observable<readonly Taxonomy[]> {
    const filtered = kind ? this.items().filter((item) => item.kind === kind) : this.items();
    return of([...filtered].sort((a, b) => a.order - b.order)).pipe(delay(SIMULATED_DELAY_MS));
  }

  create(kind: TaxonomyKind, label: string): Observable<Taxonomy> {
    const trimmed = label.trim();
    if (!trimmed) {
      return throwError(() => new Error('O nome da taxonomia é obrigatório.'));
    }
    if (this.labelExists(kind, trimmed)) {
      return throwError(() => new Error('Já existe uma taxonomia com este nome.'));
    }
    const kindItems = this.items().filter((item) => item.kind === kind);
    const maxOrder = kindItems.reduce((max, item) => Math.max(max, item.order), 0);
    const taxonomy: Taxonomy = {
      id: `tax-${nextTaxonomySequence++}`,
      kind,
      label: trimmed,
      order: maxOrder + 1,
      active: true,
    };
    this.items.update((current) => [...current, taxonomy]);
    return of(taxonomy).pipe(delay(SIMULATED_DELAY_MS));
  }

  update(id: string, label: string): Observable<Taxonomy> {
    const taxonomy = this.findAny(id);
    if (!taxonomy) {
      return throwError(() => new Error('Taxonomia não encontrada.'));
    }
    const trimmed = label.trim();
    if (!trimmed) {
      return throwError(() => new Error('O nome da taxonomia é obrigatório.'));
    }
    if (trimmed !== taxonomy.label && this.labelExists(taxonomy.kind, trimmed)) {
      return throwError(() => new Error('Já existe uma taxonomia com este nome.'));
    }
    const updated: Taxonomy = { ...taxonomy, label: trimmed };
    this.replace(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  toggleActive(id: string): Observable<Taxonomy> {
    const taxonomy = this.findAny(id);
    if (!taxonomy) {
      return throwError(() => new Error('Taxonomia não encontrada.'));
    }
    const updated: Taxonomy = { ...taxonomy, active: !taxonomy.active };
    this.replace(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  reorder(id: string, direction: 'up' | 'down'): Observable<readonly Taxonomy[]> {
    const taxonomy = this.findAny(id);
    if (!taxonomy) {
      return throwError(() => new Error('Taxonomia não encontrada.'));
    }
    const siblings = [...this.items()]
      .filter((item) => item.kind === taxonomy.kind)
      .sort((a, b) => a.order - b.order);
    const currentIndex = siblings.findIndex((item) => item.id === id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) {
      return of([...this.items()].sort((a, b) => a.order - b.order)).pipe(
        delay(SIMULATED_DELAY_MS),
      );
    }
    const current = siblings[currentIndex];
    const target = siblings[targetIndex];
    const swappedCurrent: Taxonomy = { ...current, order: target.order };
    const swappedTarget: Taxonomy = { ...target, order: current.order };
    this.replace(swappedCurrent);
    this.replace(swappedTarget);
    return of([...this.items()].sort((a, b) => a.order - b.order)).pipe(delay(SIMULATED_DELAY_MS));
  }

  delete(id: string): Observable<void> {
    const taxonomy = this.findAny(id);
    if (!taxonomy) {
      return throwError(() => new Error('Taxonomia não encontrada.'));
    }
    if (this.resourceService.isTaxonomyInUse(taxonomy.kind, taxonomy.label)) {
      return throwError(
        () =>
          new Error(
            'Não é possível eliminar esta taxonomia: está associada a recursos existentes.',
          ),
      );
    }
    this.items.update((current) => current.filter((item) => item.id !== id));
    return of(undefined).pipe(delay(SIMULATED_DELAY_MS));
  }

  private labelExists(kind: TaxonomyKind, label: string): boolean {
    const normalized = normalize(label);
    return this.items().some((item) => item.kind === kind && normalize(item.label) === normalized);
  }

  private findAny(id: string): Taxonomy | undefined {
    return this.items().find((candidate) => candidate.id === id);
  }

  private replace(updated: Taxonomy): void {
    this.items.update((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }
}
