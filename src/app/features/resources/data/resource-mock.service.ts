import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { Resource, UserRole } from '../../../shared/models';
import { resources } from '../../../shared/mocks/resources.mock';
import {
  ResourceSearchParams,
  ResourceSearchResult,
  ResourceSortOption,
} from './resource-search.model';

const SIMULATED_DELAY_MS = 300;
const EDITOR_ROLES: readonly UserRole[] = ['CONTENT_EDITOR', 'ADMIN'];
const MAX_RELATED = 4;

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Serviço de dados simulado (Fase 3 — UI). Assinatura pensada para ser substituída,
// sem alterar os componentes que a consomem, por um serviço que chama a API NestJS real.
@Injectable({ providedIn: 'root' })
export class ResourceMockService {
  private readonly authService = inject(AuthService);

  search(params: ResourceSearchParams): Observable<ResourceSearchResult> {
    const role = this.authService.currentRole();
    const visible = resources.filter((resource) => this.isVisible(resource, role));
    const filtered = this.applyFilters(visible, params);
    const sorted = this.applySort(filtered, params.sort);

    const total = sorted.length;
    const start = (params.page - 1) * params.pageSize;
    const items = sorted.slice(start, start + params.pageSize);

    return of({ items, total }).pipe(delay(SIMULATED_DELAY_MS));
  }

  getBySlug(slug: string): Observable<Resource | undefined> {
    const role = this.authService.currentRole();
    const resource = resources.find(
      (candidate) => candidate.slug === slug && this.isVisible(candidate, role),
    );
    return of(resource).pipe(delay(SIMULATED_DELAY_MS));
  }

  getRelated(ids: readonly string[]): Observable<readonly Resource[]> {
    const role = this.authService.currentRole();
    const related = ids
      .map((id) => resources.find((candidate) => candidate.id === id))
      .filter(
        (candidate): candidate is Resource =>
          candidate !== undefined && this.isVisible(candidate, role),
      )
      .slice(0, MAX_RELATED);
    return of(related).pipe(delay(SIMULATED_DELAY_MS));
  }

  private isVisible(resource: Resource, role: UserRole | null): boolean {
    if (resource.status === 'archived') {
      return false;
    }
    if (resource.status === 'draft') {
      return role !== null && EDITOR_ROLES.includes(role);
    }
    return true;
  }

  private applyFilters(
    items: readonly Resource[],
    params: ResourceSearchParams,
  ): readonly Resource[] {
    const query = normalize(params.query.trim());

    return items.filter((resource) => {
      if (params.type !== 'all' && resource.type !== params.type) {
        return false;
      }
      if (params.workflows.length > 0 && !params.workflows.includes(resource.workflow)) {
        return false;
      }
      if (params.difficulties.length > 0 && !params.difficulties.includes(resource.difficulty)) {
        return false;
      }
      if (query.length === 0) {
        return true;
      }
      const haystack = normalize([resource.title, resource.summary, ...resource.tags].join(' '));
      return haystack.includes(query);
    });
  }

  // Decisão (ver context/features/fase-3-ui-catalogo.md, "Riscos e decisões em aberto"):
  // "mais recentes" ordena pela data de publicação, não pela última atualização.
  private applySort(items: readonly Resource[], sort: ResourceSortOption): Resource[] {
    const sorted = [...items];
    if (sort === 'alphabetical') {
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'pt'));
    } else {
      sorted.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    }
    return sorted;
  }
}
