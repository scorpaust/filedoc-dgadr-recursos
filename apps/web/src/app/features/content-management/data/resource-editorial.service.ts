import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
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
import { AppConfigService } from '../../../core/config/app-config.service';
import { Difficulty, EditorialStatus, Resource, ResourceType } from '../../../shared/models';
import { ResourceFormInput } from './resource-form-input.model';

const GENERIC_ERROR_MESSAGE = 'Não foi possível concluir o pedido. Tente novamente.';

export interface ResourceManagementFilters {
  readonly status?: EditorialStatus | 'all';
  readonly query?: string;
}

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

type UploadContext = 'video' | 'pdfGuide' | 'thumbnail';

interface UploadInitResponse {
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
 * Consome os endpoints reais de escrita do módulo `resources/` da API
 * (fase-7-integracao-gestao-conteudos.md), com a mesma assinatura pública de
 * `ResourceMockService.listAllForManagement`/`getByIdForManagement`/`create`/`update`/
 * `duplicate`/`publish`/`unpublish`/`archive`/`restore` — `ResourceTableComponent` e
 * `ResourceFormPageComponent` trocam apenas o serviço injetado. A leitura pública
 * (catálogo/detalhe) continua em `ResourceService` (Fase 3 — Integração); a pré-visualização
 * de editor e outros consumidores de leitura (fora do âmbito desta fase) continuam em
 * `ResourceMockService`.
 *
 * Diferença deliberada face ao mock: `create`/`update` recebem agora ficheiros reais
 * (`ResourceFormInput.mainFile`/`thumbnailFile`), carregados diretamente para o
 * armazenamento (`StorageService`, Fase 2 — Integração) através de um segundo pedido em
 * cadeia, sem bytes a passar pela API — mesmo padrão de `TicketService.addMessage` (Fase 5 —
 * Integração). O modo `multipart` não é tratado no cliente (mesma decisão, e pelo mesmo
 * motivo, de `TicketService.uploadOne`): um erro explícito e amigável em vez de um
 * carregamento em várias partes.
 */
@Injectable({ providedIn: 'root' })
export class ResourceEditorialService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);

  listAllForManagement(filters?: ResourceManagementFilters): Observable<readonly Resource[]> {
    let params = new HttpParams().set('status', filters?.status ?? 'all');
    if (filters?.query) {
      params = params.set('q', filters.query);
    }
    return this.http.get<readonly ResourceApiItem[]>('/resources/management', { params }).pipe(
      map((items) => items.map((item) => this.toResource(item))),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  getByIdForManagement(id: string): Observable<Resource | undefined> {
    return this.http.get<ResourceApiItem>(`/resources/management/${encodeURIComponent(id)}`).pipe(
      map((item) => this.toResource(item)),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of(undefined);
        }
        return throwError(() => new Error(extractErrorMessage(error)));
      }),
    );
  }

  create(input: ResourceFormInput): Observable<Resource> {
    return this.http.post<ResourceApiItem>('/resources', this.toBody(input)).pipe(
      switchMap((item) => this.applyUploads(item.id, input)),
      catchError((error: unknown) =>
        throwError(() => (error instanceof Error ? error : new Error(extractErrorMessage(error)))),
      ),
    );
  }

  update(id: string, input: ResourceFormInput): Observable<Resource> {
    return this.http.patch<ResourceApiItem>(`/resources/${id}`, this.toBody(input)).pipe(
      switchMap(() => this.applyUploads(id, input)),
      catchError((error: unknown) =>
        throwError(() => (error instanceof Error ? error : new Error(extractErrorMessage(error)))),
      ),
    );
  }

  duplicate(id: string): Observable<Resource> {
    return this.mutate(`/resources/${id}/duplicate`);
  }

  publish(id: string): Observable<Resource> {
    return this.mutate(`/resources/${id}/publish`);
  }

  unpublish(id: string): Observable<Resource> {
    return this.mutate(`/resources/${id}/unpublish`);
  }

  archive(id: string): Observable<Resource> {
    return this.mutate(`/resources/${id}/archive`);
  }

  restore(id: string): Observable<Resource> {
    return this.mutate(`/resources/${id}/restore`);
  }

  private mutate(url: string): Observable<Resource> {
    return this.http.post<ResourceApiItem>(url, {}).pipe(
      map((item) => this.toResource(item)),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  private toBody(input: ResourceFormInput): Record<string, unknown> {
    return {
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      description: input.description,
      resourceType: input.type,
      difficulty: input.difficulty,
      workflow: input.workflow || undefined,
      documentType: input.documentType || undefined,
      tags: input.tags,
      duration: input.duration,
      pages: input.pages,
      thumbnailAlt: input.thumbnailAlt,
    };
  }

  private applyUploads(id: string, input: ResourceFormInput): Observable<Resource> {
    const uploads: Observable<void>[] = [];
    if (input.mainFile) {
      uploads.push(
        this.uploadFile(id, input.mainFile, input.type === 'video' ? 'video' : 'pdfGuide'),
      );
    }
    if (input.thumbnailFile) {
      uploads.push(this.uploadFile(id, input.thumbnailFile, 'thumbnail'));
    }

    const afterUploads$ =
      uploads.length > 0
        ? from(uploads).pipe(
            concatMap((upload) => upload),
            toArray(),
          )
        : of([]);

    return afterUploads$.pipe(
      switchMap(() => this.getByIdForManagement(id)),
      map((resource) => {
        if (!resource) {
          throw new Error(GENERIC_ERROR_MESSAGE);
        }
        return resource;
      }),
    );
  }

  private uploadFile(id: string, file: File, context: UploadContext): Observable<void> {
    const mimeType = file.type || 'application/octet-stream';
    return this.http
      .post<UploadInitResponse>(`/resources/${id}/upload-url`, {
        context,
        phase: 'init',
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
      })
      .pipe(
        switchMap((init) => {
          if (init.mode !== 'single' || !init.uploadUrl) {
            return throwError(
              () => new Error('Este ficheiro é demasiado grande para ser carregado diretamente.'),
            );
          }
          return this.putFile(init.uploadUrl, file, mimeType).pipe(
            switchMap(() =>
              this.http.post(`/resources/${id}/upload-url`, {
                context,
                phase: 'confirm',
                fileName: file.name,
                mimeType,
                objectKey: init.objectKey,
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
  // deve recebê-lo — mesma decisão de `TicketService.putFile` (Fase 5 — Integração).
  private putFile(uploadUrl: string, file: File, mimeType: string): Observable<void> {
    return from(
      fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: file }),
    ).pipe(
      switchMap((response) =>
        response.ok
          ? of(undefined)
          : throwError(() => new Error('Não foi possível carregar o ficheiro.')),
      ),
    );
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
