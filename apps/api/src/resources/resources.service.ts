import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Difficulty,
  Prisma,
  ResourceStatus,
  ResourceType,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ListResourcesQueryDto } from './dto/list-resources-query.dto';
import {
  RESOURCE_INCLUDE,
  ResourceDetailResponse,
  ResourceResponse,
  ResourceSearchResponse,
  ResourceWithRelations,
} from './resources.types';

export const RESOURCE_NOT_FOUND_MESSAGE = 'Recurso não encontrado.';

const EDITOR_ROLES: readonly Role[] = [Role.CONTENT_EDITOR, Role.ADMIN];
const MAX_RELATED = 4;

const DIFFICULTY_TO_PRISMA: Record<string, Difficulty> = {
  iniciacao: Difficulty.INICIACAO,
  intermedia: Difficulty.INTERMEDIA,
  avancada: Difficulty.AVANCADA,
};
const DIFFICULTY_TO_RESPONSE: Record<
  Difficulty,
  'iniciacao' | 'intermedia' | 'avancada'
> = {
  INICIACAO: 'iniciacao',
  INTERMEDIA: 'intermedia',
  AVANCADA: 'avancada',
};
const RESOURCE_TYPE_TO_PRISMA: Record<string, ResourceType> = {
  video: ResourceType.VIDEO,
  guide: ResourceType.PDF_GUIDE,
};
const RESOURCE_TYPE_TO_RESPONSE: Record<ResourceType, 'video' | 'guide'> = {
  VIDEO: 'video',
  PDF_GUIDE: 'guide',
};
const STATUS_TO_RESPONSE: Record<
  ResourceStatus,
  'draft' | 'published' | 'archived'
> = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

/**
 * Regras de negócio do catálogo/detalhe de recursos (fase-3-integracao-catalogo.md).
 * A visibilidade por estado editorial é sempre aplicada aqui, nunca confiada ao cliente:
 * `PUBLISHED` é sempre visível; `DRAFT` só a `CONTENT_EDITOR`/`ADMIN`; `ARCHIVED` nunca.
 */
@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async search(
    query: ListResourcesQueryDto,
    roles: readonly Role[],
  ): Promise<ResourceSearchResponse> {
    const where = this.buildWhere(query, roles);
    const orderBy = this.buildOrderBy(query.sort);

    const [items, total] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        include: RESOURCE_INCLUDE,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.resource.count({ where }),
    ]);

    return { items: items.map((item) => this.toResponse(item)), total };
  }

  async getBySlug(
    slug: string,
    roles: readonly Role[],
  ): Promise<ResourceDetailResponse> {
    const resource = await this.prisma.resource.findUnique({
      where: { slug },
      include: RESOURCE_INCLUDE,
    });
    if (!resource || !this.isVisible(resource.status, roles)) {
      throw new NotFoundException(RESOURCE_NOT_FOUND_MESSAGE);
    }

    const related = await this.findRelated(resource, roles);
    return {
      resource: this.toResponse(resource),
      related: related.map((item) => this.toResponse(item)),
    };
  }

  async getFileDownloadUrl(
    id: string,
    roles: readonly Role[],
  ): Promise<string> {
    const resource = await this.findVisibleById(id, roles);
    if (!resource.fileObjectKey) {
      throw new NotFoundException(RESOURCE_NOT_FOUND_MESSAGE);
    }
    return this.storageService.createDownloadUrl(resource.fileObjectKey);
  }

  async getThumbnailDownloadUrl(
    id: string,
    roles: readonly Role[],
  ): Promise<string> {
    const resource = await this.findVisibleById(id, roles);
    if (!resource.thumbnailObjectKey) {
      throw new NotFoundException(RESOURCE_NOT_FOUND_MESSAGE);
    }
    return this.storageService.createDownloadUrl(resource.thumbnailObjectKey);
  }

  private async findVisibleById(id: string, roles: readonly Role[]) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
    });
    if (!resource || !this.isVisible(resource.status, roles)) {
      throw new NotFoundException(RESOURCE_NOT_FOUND_MESSAGE);
    }
    return resource;
  }

  /** Mesmo fluxo, ou pelo menos uma etiqueta em comum — limitado a `MAX_RELATED`. */
  private async findRelated(
    resource: ResourceWithRelations,
    roles: readonly Role[],
  ): Promise<readonly ResourceWithRelations[]> {
    const tagIds = resource.tags.map((resourceTag) => resourceTag.tagId);
    const orConditions: Prisma.ResourceWhereInput[] = [];
    if (resource.workflowId) {
      orConditions.push({ workflowId: resource.workflowId });
    }
    if (tagIds.length > 0) {
      orConditions.push({ tags: { some: { tagId: { in: tagIds } } } });
    }
    if (orConditions.length === 0) {
      return [];
    }

    return this.prisma.resource.findMany({
      where: {
        id: { not: resource.id },
        status: { in: this.visibleStatuses(roles) },
        OR: orConditions,
      },
      include: RESOURCE_INCLUDE,
      orderBy: { publishedAt: 'desc' },
      take: MAX_RELATED,
    });
  }

  private buildWhere(
    query: ListResourcesQueryDto,
    roles: readonly Role[],
  ): Prisma.ResourceWhereInput {
    const where: Prisma.ResourceWhereInput = {
      status: { in: this.visibleStatuses(roles) },
    };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { summary: { contains: query.q, mode: 'insensitive' } },
        {
          tags: {
            some: { tag: { name: { contains: query.q, mode: 'insensitive' } } },
          },
        },
      ];
    }
    if (query.type) {
      where.resourceType = RESOURCE_TYPE_TO_PRISMA[query.type];
    }
    if (query.workflow && query.workflow.length > 0) {
      where.workflow = { name: { in: query.workflow } };
    }
    if (query.documentType && query.documentType.length > 0) {
      where.documentType = { name: { in: query.documentType } };
    }
    if (query.difficulty && query.difficulty.length > 0) {
      where.difficulty = {
        in: query.difficulty.map((value) => DIFFICULTY_TO_PRISMA[value]),
      };
    }

    return where;
  }

  private buildOrderBy(
    sort: ListResourcesQueryDto['sort'],
  ): Prisma.ResourceOrderByWithRelationInput {
    return sort === 'alphabetical' ? { title: 'asc' } : { publishedAt: 'desc' };
  }

  private visibleStatuses(roles: readonly Role[]): ResourceStatus[] {
    const canSeeDrafts = roles.some((role) => EDITOR_ROLES.includes(role));
    return canSeeDrafts
      ? [ResourceStatus.PUBLISHED, ResourceStatus.DRAFT]
      : [ResourceStatus.PUBLISHED];
  }

  private isVisible(status: ResourceStatus, roles: readonly Role[]): boolean {
    return this.visibleStatuses(roles).includes(status);
  }

  private toResponse(resource: ResourceWithRelations): ResourceResponse {
    const isVideo = resource.resourceType === ResourceType.VIDEO;
    return {
      id: resource.id,
      slug: resource.slug,
      title: resource.title,
      summary: resource.summary,
      description: resource.description,
      type: RESOURCE_TYPE_TO_RESPONSE[resource.resourceType],
      workflow: resource.workflow?.name ?? '',
      documentType: resource.documentType?.name ?? '',
      difficulty: DIFFICULTY_TO_RESPONSE[resource.difficulty],
      tags: resource.tags.map((resourceTag) => resourceTag.tag.name),
      duration: isVideo ? `${resource.durationMinutes ?? 0}:00` : undefined,
      pages: isVideo ? undefined : (resource.pageCount ?? undefined),
      // DRAFT nunca tem `publishedAt` — usa `updatedAt` como equivalente para o campo
      // (não opcional) do modelo `Resource` do frontend; só afeta pré-visualizações de
      // editor, já que rascunhos nunca aparecem na ordenação "mais recentes" pública.
      publishedAt: (resource.publishedAt ?? resource.updatedAt)
        .toISOString()
        .slice(0, 10),
      updatedAt: resource.updatedAt.toISOString().slice(0, 10),
      status: STATUS_TO_RESPONSE[resource.status],
      author: resource.createdBy.name,
      hasFile: resource.fileObjectKey !== null,
      hasThumbnail: resource.thumbnailObjectKey !== null,
    };
  }
}
