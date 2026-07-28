import { Prisma } from '@prisma/client';

/** `select`/`include` mínimos para listar/detalhar um recurso sem N+1 (uma query por relação, não por recurso). */
export const RESOURCE_INCLUDE = {
  workflow: true,
  documentType: true,
  tags: { include: { tag: true } },
  createdBy: true,
} satisfies Prisma.ResourceInclude;

export type ResourceWithRelations = Prisma.ResourceGetPayload<{
  include: typeof RESOURCE_INCLUDE;
}>;

/** Forma devolvida ao cliente — alinhada com `Resource` do frontend (`shared/models/resource.model.ts`), sem os campos de URL de ficheiro/miniatura (construídos no cliente a partir de `id`/`type`, nunca embutidos aqui). */
export interface ResourceResponse {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly type: 'video' | 'guide';
  readonly workflow: string;
  readonly documentType: string;
  readonly difficulty: 'iniciacao' | 'intermedia' | 'avancada';
  readonly tags: readonly string[];
  readonly duration?: string;
  readonly pages?: number;
  readonly publishedAt: string;
  readonly updatedAt: string;
  readonly status: 'draft' | 'published' | 'archived';
  readonly author: string;
  readonly hasFile: boolean;
  readonly hasThumbnail: boolean;
}

export interface ResourceSearchResponse {
  readonly items: readonly ResourceResponse[];
  readonly total: number;
}

export interface ResourceDetailResponse {
  readonly resource: ResourceResponse;
  readonly related: readonly ResourceResponse[];
}
