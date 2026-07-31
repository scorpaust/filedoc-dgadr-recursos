import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { AppConfigService } from '../../../core/config/app-config.service';
import { Difficulty, EditorialStatus, Resource, ResourceType } from '../../../shared/models';
import { ResourceSearchParams, ResourceSearchResult } from './resource-search.model';

const GENERIC_ERROR_MESSAGE = 'Não foi possível concluir o pedido. Tente novamente.';

interface ResourceApiItem {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly type: ResourceType;
  readonly workflow: string;
  readonly documentType: string;
  readonly difficulty: Difficulty;
  readonly tags: readonly string[];
  readonly duration?: string;
  readonly pages?: number;
  readonly publishedAt: string;
  readonly updatedAt: string;
  readonly status: EditorialStatus;
  readonly author: string;
  readonly hasFile: boolean;
  readonly hasThumbnail: boolean;
  readonly thumbnailAlt?: string;
}

interface ResourceSearchApiResponse {
  readonly items: readonly ResourceApiItem[];
  readonly total: number;
}

interface ResourceDetailApiResponse {
  readonly resource: ResourceApiItem;
  readonly related: readonly ResourceApiItem[];
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
 * Consome os endpoints reais do módulo `resources/` da API (fase-3-integracao-catalogo.md),
 * com a mesma assinatura pública de `ResourceMockService.search`/`getBySlug`/`getRelated` —
 * os componentes do Catálogo (via de UI, Fase 3) e do Detalhe (via de UI, Fase 4) trocam
 * apenas o serviço injetado, sem outras alterações. As operações de gestão editorial
 * (Fase 7 — fora de âmbito desta fase) continuam em `ResourceMockService`.
 */
@Injectable({ providedIn: 'root' })
export class ResourceService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);

  // Relacionados devolvidos junto com o próprio recurso em `GET /resources/:slug` (a API não
  // tem um endpoint "por ids") — guardados aqui para que `getRelated` os possa devolver sem
  // um pedido adicional, preservando a chamada em dois passos já usada pelos componentes.
  private readonly relatedCache = new Map<string, Resource>();

  search(params: ResourceSearchParams): Observable<ResourceSearchResult> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('pageSize', params.pageSize)
      .set('sort', params.sort);
    if (params.query) {
      httpParams = httpParams.set('q', params.query);
    }
    if (params.type !== 'all') {
      httpParams = httpParams.set('type', params.type);
    }
    for (const workflow of params.workflows) {
      httpParams = httpParams.append('workflow', workflow);
    }
    for (const difficulty of params.difficulties) {
      httpParams = httpParams.append('difficulty', difficulty);
    }

    return this.http.get<ResourceSearchApiResponse>('/resources', { params: httpParams }).pipe(
      map((body) => ({
        items: body.items.map((item) => this.toResource(item)),
        total: body.total,
      })),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  getBySlug(slug: string): Observable<Resource | undefined> {
    return this.http.get<ResourceDetailApiResponse>(`/resources/${encodeURIComponent(slug)}`).pipe(
      map((body) => {
        for (const related of body.related) {
          this.relatedCache.set(related.id, this.toResource(related));
        }
        return {
          ...this.toResource(body.resource),
          relatedResourceIds: body.related.map((related) => related.id),
        };
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of(undefined);
        }
        return throwError(() => new Error(extractErrorMessage(error)));
      }),
    );
  }

  getRelated(ids: readonly string[]): Observable<readonly Resource[]> {
    const related = ids
      .map((id) => this.relatedCache.get(id))
      .filter((resource): resource is Resource => resource !== undefined);
    return of(related);
  }

  private toResource(item: ResourceApiItem): Resource {
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      description: item.description,
      type: item.type,
      workflow: item.workflow,
      documentType: item.documentType,
      difficulty: item.difficulty,
      tags: [...item.tags],
      duration: item.duration,
      pages: item.pages,
      publishedAt: item.publishedAt,
      updatedAt: item.updatedAt,
      status: item.status,
      author: item.author,
      relatedResourceIds: [],
      videoUrl: item.type === 'video' && item.hasFile ? this.fileUrl(item.id) : undefined,
      pdfUrl: item.type === 'guide' && item.hasFile ? this.fileUrl(item.id) : undefined,
      thumbnailUrl: item.hasThumbnail ? this.thumbnailUrl(item.id) : undefined,
      thumbnailAlt: item.thumbnailAlt,
    };
  }

  private fileUrl(id: string): string {
    return `${this.appConfig.apiUrl}/resources/${id}/file`;
  }

  private thumbnailUrl(id: string): string {
    return `${this.appConfig.apiUrl}/resources/${id}/thumbnail`;
  }
}
