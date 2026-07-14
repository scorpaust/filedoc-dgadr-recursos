import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import {
  EditorialStatus,
  Resource,
  TaxonomyKind,
  UserRole,
  hasAnyRole,
} from '../../../shared/models';
import { resources } from '../../../shared/mocks/resources.mock';
import { ResourceFormInput } from '../../content-management/data/resource-form-input.model';
import {
  ResourceSearchParams,
  ResourceSearchResult,
  ResourceSortOption,
} from './resource-search.model';

const SIMULATED_DELAY_MS = 300;
const EDITOR_ROLES: readonly UserRole[] = ['CONTENT_EDITOR', 'ADMIN'];
const MAX_RELATED = 4;

let nextResourceSequence = resources.length + 1;

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function nowIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Campos exigidos para publicar (project-spec.md, secção N). As etiquetas e a miniatura
// em si não constam desta lista — apenas o respetivo texto alternativo, quando a miniatura
// existir.
function missingFieldsForPublish(resource: Resource): readonly string[] {
  const missing: string[] = [];
  if (!resource.title.trim()) missing.push('título');
  if (!resource.slug.trim()) missing.push('slug');
  if (!resource.summary.trim()) missing.push('resumo');
  if (!resource.description.trim()) missing.push('descrição');
  if (!resource.workflow.trim()) missing.push('fluxo');
  if (!resource.documentType.trim()) missing.push('tipo de documento');
  if (!resource.difficulty) missing.push('dificuldade');
  if (resource.type === 'video') {
    if (!resource.videoUrl) missing.push('ficheiro de vídeo');
    if (!resource.duration?.trim()) missing.push('duração');
  } else {
    if (!resource.pdfUrl) missing.push('ficheiro PDF');
    if (!resource.pages) missing.push('número de páginas');
  }
  if (resource.thumbnailUrl && !resource.thumbnailAlt?.trim()) {
    missing.push('texto alternativo da miniatura');
  }
  return missing;
}

export interface ResourceManagementFilters {
  readonly status?: EditorialStatus | 'all';
  readonly query?: string;
}

// Serviço de dados simulado (Fase 3 — UI, estendido na Fase 8 com operações de escrita).
// Estado mantido em memória (Signal, reposto ao recarregar a aplicação); assinatura pensada
// para ser substituída, sem alterar os componentes que a consomem, por um serviço que chama
// a API NestJS real.
@Injectable({ providedIn: 'root' })
export class ResourceMockService {
  private readonly authService = inject(AuthService);

  private readonly resourcesSignal = signal<readonly Resource[]>(resources);

  search(params: ResourceSearchParams): Observable<ResourceSearchResult> {
    const roles = this.authService.roles();
    const visible = this.resourcesSignal().filter((resource) => this.isVisible(resource, roles));
    const filtered = this.applyFilters(visible, params);
    const sorted = this.applySort(filtered, params.sort);

    const total = sorted.length;
    const start = (params.page - 1) * params.pageSize;
    const items = sorted.slice(start, start + params.pageSize);

    return of({ items, total }).pipe(delay(SIMULATED_DELAY_MS));
  }

  getBySlug(slug: string): Observable<Resource | undefined> {
    const roles = this.authService.roles();
    const resource = this.resourcesSignal().find(
      (candidate) => candidate.slug === slug && this.isVisible(candidate, roles),
    );
    return of(resource).pipe(delay(SIMULATED_DELAY_MS));
  }

  getRelated(ids: readonly string[]): Observable<readonly Resource[]> {
    const roles = this.authService.roles();
    const related = ids
      .map((id) => this.resourcesSignal().find((candidate) => candidate.id === id))
      .filter(
        (candidate): candidate is Resource =>
          candidate !== undefined && this.isVisible(candidate, roles),
      )
      .slice(0, MAX_RELATED);
    return of(related).pipe(delay(SIMULATED_DELAY_MS));
  }

  // A partir daqui: operações de gestão editorial (Fase 8 — UI). Ao contrário de `search`/
  // `getBySlug`/`getRelated`, nenhuma destas restringe por `isVisible` — a autorização de
  // acesso a `/conteudos` já foi garantida pelo `roleGuard` na rota.

  listAllForManagement(filters?: ResourceManagementFilters): Observable<readonly Resource[]> {
    const query = normalize((filters?.query ?? '').trim());
    const filtered = this.resourcesSignal().filter((resource) => {
      if (filters?.status && filters.status !== 'all' && resource.status !== filters.status) {
        return false;
      }
      if (query.length === 0) {
        return true;
      }
      const haystack = normalize([resource.title, resource.author, ...resource.tags].join(' '));
      return haystack.includes(query);
    });
    return of([...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))).pipe(
      delay(SIMULATED_DELAY_MS),
    );
  }

  getByIdForManagement(id: string): Observable<Resource | undefined> {
    return of(this.resourcesSignal().find((candidate) => candidate.id === id)).pipe(
      delay(SIMULATED_DELAY_MS),
    );
  }

  // Usado exclusivamente pela pré-visualização de um editor (ignora o estado editorial,
  // mas nunca é exposto ao catálogo público nem à navegação por slug normal).
  getForPreview(slug: string): Observable<Resource | undefined> {
    return of(this.resourcesSignal().find((candidate) => candidate.slug === slug)).pipe(
      delay(SIMULATED_DELAY_MS),
    );
  }

  isSlugTaken(slug: string, excludeId?: string): boolean {
    const normalized = slug.trim().toLowerCase();
    return this.resourcesSignal().some(
      (candidate) => candidate.id !== excludeId && candidate.slug.toLowerCase() === normalized,
    );
  }

  isTaxonomyInUse(kind: TaxonomyKind, label: string): boolean {
    return this.resourcesSignal().some((resource) => {
      if (kind === 'workflow') return resource.workflow === label;
      if (kind === 'documentType') return resource.documentType === label;
      return resource.tags.includes(label);
    });
  }

  create(input: ResourceFormInput): Observable<Resource> {
    if (this.isSlugTaken(input.slug)) {
      return throwError(() => new Error('Já existe um recurso com este slug.'));
    }
    const user = this.requireCurrentUser();
    const now = nowIso();
    const resource: Resource = {
      id: `res-${nextResourceSequence++}`,
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      description: input.description,
      type: input.type,
      workflow: input.workflow,
      documentType: input.documentType,
      difficulty: input.difficulty,
      tags: input.tags,
      duration: input.duration,
      pages: input.pages,
      videoUrl: input.videoUrl,
      captionsUrl: input.captionsUrl,
      pdfUrl: input.pdfUrl,
      thumbnailUrl: input.thumbnailUrl,
      thumbnailAlt: input.thumbnailAlt,
      publishedAt: now,
      updatedAt: now,
      status: 'draft',
      author: user.name,
      relatedResourceIds: [],
    };
    this.resourcesSignal.update((current) => [...current, resource]);
    return of(resource).pipe(delay(SIMULATED_DELAY_MS));
  }

  update(id: string, input: ResourceFormInput): Observable<Resource> {
    const resource = this.findAny(id);
    if (!resource) {
      return throwError(() => new Error('Recurso não encontrado.'));
    }
    if (this.isSlugTaken(input.slug, id)) {
      return throwError(() => new Error('Já existe um recurso com este slug.'));
    }
    const updated: Resource = {
      ...resource,
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      description: input.description,
      type: input.type,
      workflow: input.workflow,
      documentType: input.documentType,
      difficulty: input.difficulty,
      tags: input.tags,
      duration: input.duration,
      pages: input.pages,
      videoUrl: input.videoUrl,
      captionsUrl: input.captionsUrl,
      pdfUrl: input.pdfUrl,
      thumbnailUrl: input.thumbnailUrl,
      thumbnailAlt: input.thumbnailAlt,
      updatedAt: nowIso(),
    };
    this.replaceResource(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  duplicate(id: string): Observable<Resource> {
    const resource = this.findAny(id);
    if (!resource) {
      return throwError(() => new Error('Recurso não encontrado.'));
    }
    const user = this.requireCurrentUser();
    const now = nowIso();
    let slug = `${resource.slug}-copia`;
    let suffix = 2;
    while (this.isSlugTaken(slug)) {
      slug = `${resource.slug}-copia-${suffix++}`;
    }
    const copy: Resource = {
      ...resource,
      id: `res-${nextResourceSequence++}`,
      slug,
      title: `${resource.title} (cópia)`,
      status: 'draft',
      author: user.name,
      publishedAt: now,
      updatedAt: now,
      relatedResourceIds: [],
    };
    this.resourcesSignal.update((current) => [...current, copy]);
    return of(copy).pipe(delay(SIMULATED_DELAY_MS));
  }

  publish(id: string): Observable<Resource> {
    const resource = this.findAny(id);
    if (!resource) {
      return throwError(() => new Error('Recurso não encontrado.'));
    }
    const missing = missingFieldsForPublish(resource);
    if (missing.length > 0) {
      return throwError(
        () => new Error(`Não é possível publicar: faltam os campos: ${missing.join(', ')}.`),
      );
    }
    const now = nowIso();
    const updated: Resource = {
      ...resource,
      status: 'published',
      publishedAt: resource.status === 'draft' ? now : resource.publishedAt,
      updatedAt: now,
    };
    this.replaceResource(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  unpublish(id: string): Observable<Resource> {
    const resource = this.findAny(id);
    if (!resource) {
      return throwError(() => new Error('Recurso não encontrado.'));
    }
    const updated: Resource = { ...resource, status: 'draft', updatedAt: nowIso() };
    this.replaceResource(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  archive(id: string): Observable<Resource> {
    const resource = this.findAny(id);
    if (!resource) {
      return throwError(() => new Error('Recurso não encontrado.'));
    }
    const updated: Resource = { ...resource, status: 'archived', updatedAt: nowIso() };
    this.replaceResource(updated);
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }

  // Traz um recurso arquivado de volta a rascunho — mesma transição de estado que
  // `unpublish`, apenas com um nome mais claro quando a origem é "arquivado" (nunca fica
  // preso sem saída, tal como as restantes ações editoriais desta fase).
  restore(id: string): Observable<Resource> {
    return this.unpublish(id);
  }

  private isVisible(resource: Resource, roles: readonly UserRole[]): boolean {
    if (resource.status === 'archived') {
      return false;
    }
    if (resource.status === 'draft') {
      return hasAnyRole(roles, EDITOR_ROLES);
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

  private findAny(id: string): Resource | undefined {
    return this.resourcesSignal().find((candidate) => candidate.id === id);
  }

  private replaceResource(updated: Resource): void {
    this.resourcesSignal.update((current) =>
      current.map((resource) => (resource.id === updated.id ? updated : resource)),
    );
  }

  private requireCurrentUser() {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('Não é possível efetuar esta operação sem sessão iniciada.');
    }
    return user;
  }
}
