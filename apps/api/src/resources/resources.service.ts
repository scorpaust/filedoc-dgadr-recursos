import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Difficulty,
  Prisma,
  ResourceStatus,
  ResourceType,
  Role,
} from '@prisma/client';
import type { CurrentUserPayload } from '../auth/auth.types';
import { ValidationException } from '../common/exceptions/validation.exception';
import { slugify } from '../common/utils/slugify.util';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { CreateUploadUrlResult } from '../storage/storage.types';
import { CreateResourceDto } from './dto/create-resource.dto';
import {
  ListManagementResourcesQueryDto,
  ManagementStatusFilter,
} from './dto/list-management-resources-query.dto';
import { ListResourcesQueryDto } from './dto/list-resources-query.dto';
import { ResourceUploadUrlDto } from './dto/resource-upload-url.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
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

const UPLOAD_CONTEXT_TO_FIELD: Record<
  'video' | 'pdfGuide' | 'thumbnail',
  'fileObjectKey' | 'thumbnailObjectKey'
> = {
  video: 'fileObjectKey',
  pdfGuide: 'fileObjectKey',
  thumbnail: 'thumbnailObjectKey',
};

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

  // ---------------------------------------------------------------------------
  // Gestão editorial (fase-7-integracao-gestao-conteudos.md) — `CONTENT_EDITOR`/`ADMIN`
  // apenas, garantido a montante pelo `RolesGuard` (`ResourcesController`). Ao contrário de
  // `search`/`getBySlug` (leitura pública), estes métodos nunca escondem `ARCHIVED`.
  // ---------------------------------------------------------------------------

  async listForManagement(
    query: ListManagementResourcesQueryDto,
  ): Promise<readonly ResourceResponse[]> {
    const where: Prisma.ResourceWhereInput = {};
    if (query.status !== 'all') {
      where.status = this.managementStatusToPrisma(query.status);
    }
    const search = query.q?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }
    const resources = await this.prisma.resource.findMany({
      where,
      include: RESOURCE_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    return resources.map((resource) => this.toResponse(resource));
  }

  async getByIdForManagement(id: string): Promise<ResourceResponse> {
    return this.toResponse(await this.findAnyById(id));
  }

  async create(
    dto: CreateResourceDto,
    user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    const [workflowId, documentTypeId, tagIds] = await Promise.all([
      this.resolveWorkflowId(dto.workflow),
      this.resolveDocumentTypeId(dto.documentType),
      this.resolveTagIds(dto.tags),
    ]);

    try {
      const resource = await this.prisma.resource.create({
        data: {
          title: dto.title,
          slug: dto.slug,
          summary: dto.summary,
          description: dto.description,
          resourceType: RESOURCE_TYPE_TO_PRISMA[dto.resourceType],
          difficulty: DIFFICULTY_TO_PRISMA[dto.difficulty],
          workflowId,
          documentTypeId,
          durationMinutes: this.parseDurationMinutes(dto.duration),
          pageCount: dto.pages,
          thumbnailAlt: dto.thumbnailAlt,
          createdById: user.id,
          updatedById: user.id,
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
        include: RESOURCE_INCLUDE,
      });
      return this.toResponse(resource);
    } catch (error) {
      throw this.translateSlugConflict(error);
    }
  }

  async update(
    id: string,
    dto: UpdateResourceDto,
    user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    await this.findAnyById(id);
    const [workflowId, documentTypeId, tagIds] = await Promise.all([
      dto.workflow !== undefined
        ? this.resolveWorkflowId(dto.workflow)
        : undefined,
      dto.documentType !== undefined
        ? this.resolveDocumentTypeId(dto.documentType)
        : undefined,
      dto.tags !== undefined ? this.resolveTagIds(dto.tags) : undefined,
    ]);

    try {
      const resource = await this.prisma.resource.update({
        where: { id },
        data: {
          title: dto.title,
          slug: dto.slug,
          summary: dto.summary,
          description: dto.description,
          resourceType: dto.resourceType
            ? RESOURCE_TYPE_TO_PRISMA[dto.resourceType]
            : undefined,
          difficulty: dto.difficulty
            ? DIFFICULTY_TO_PRISMA[dto.difficulty]
            : undefined,
          workflowId: dto.workflow !== undefined ? workflowId : undefined,
          documentTypeId:
            dto.documentType !== undefined ? documentTypeId : undefined,
          durationMinutes:
            dto.duration !== undefined
              ? this.parseDurationMinutes(dto.duration)
              : undefined,
          pageCount: dto.pages,
          thumbnailAlt: dto.thumbnailAlt,
          updatedById: user.id,
          tags:
            tagIds !== undefined
              ? {
                  deleteMany: {},
                  create: tagIds.map((tagId) => ({ tagId })),
                }
              : undefined,
        },
        include: RESOURCE_INCLUDE,
      });
      return this.toResponse(resource);
    } catch (error) {
      throw this.translateSlugConflict(error);
    }
  }

  /** Nunca copia ficheiros (`fileObjectKey`/`thumbnailObjectKey`/`captionObjectKey`) — evita
   * duas entradas a apontar para o mesmo objeto de armazenamento. */
  async duplicate(
    id: string,
    user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    const original = await this.findAnyById(id);
    const title = `${original.title} (cópia)`;
    const slug = await this.uniqueSlug(slugify(title));

    const resource = await this.prisma.resource.create({
      data: {
        title,
        slug,
        summary: original.summary,
        description: original.description,
        resourceType: original.resourceType,
        difficulty: original.difficulty,
        workflowId: original.workflowId,
        documentTypeId: original.documentTypeId,
        durationMinutes: original.durationMinutes,
        pageCount: original.pageCount,
        thumbnailAlt: original.thumbnailAlt,
        createdById: user.id,
        updatedById: user.id,
        tags: {
          create: original.tags.map((resourceTag) => ({
            tagId: resourceTag.tagId,
          })),
        },
      },
      include: RESOURCE_INCLUDE,
    });
    return this.toResponse(resource);
  }

  /** Valida os campos obrigatórios de `project-spec.md`, secção N — falha com
   * `fieldErrors` claros por campo, nunca uma mensagem genérica. */
  async publish(
    id: string,
    user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    const resource = await this.findAnyById(id);
    const fieldErrors: Record<string, string[]> = {};

    if (!resource.title.trim()) fieldErrors.title = ['O título é obrigatório.'];
    if (!resource.slug.trim()) fieldErrors.slug = ['O slug é obrigatório.'];
    if (!resource.summary.trim())
      fieldErrors.summary = ['O resumo é obrigatório.'];
    if (!resource.description.trim())
      fieldErrors.description = ['A descrição é obrigatória.'];
    if (!resource.workflowId) fieldErrors.workflow = ['O fluxo é obrigatório.'];
    if (!resource.documentTypeId)
      fieldErrors.documentType = ['O tipo de documento é obrigatório.'];
    if (!resource.fileObjectKey)
      fieldErrors.file = ['O ficheiro principal é obrigatório.'];
    // Texto alternativo sem miniatura não faz sentido — ambos exigidos em conjunto.
    if (!resource.thumbnailObjectKey || !resource.thumbnailAlt?.trim()) {
      fieldErrors.thumbnailAlt = [
        'A miniatura e o respetivo texto alternativo são obrigatórios.',
      ];
    }
    if (
      resource.resourceType === ResourceType.VIDEO &&
      !resource.durationMinutes
    ) {
      fieldErrors.duration = ['A duração é obrigatória para vídeos.'];
    }
    if (
      resource.resourceType === ResourceType.PDF_GUIDE &&
      !resource.pageCount
    ) {
      fieldErrors.pages = ['O número de páginas é obrigatório para guias.'];
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationException(
        'Existem campos obrigatórios por preencher para publicar este recurso.',
        fieldErrors,
      );
    }

    const updated = await this.prisma.resource.update({
      where: { id },
      data: {
        status: ResourceStatus.PUBLISHED,
        publishedAt: resource.publishedAt ?? new Date(),
        updatedById: user.id,
      },
      include: RESOURCE_INCLUDE,
    });
    return this.toResponse(updated);
  }

  async unpublish(
    id: string,
    user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    return this.setStatus(id, ResourceStatus.DRAFT, user);
  }

  async archive(
    id: string,
    user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    return this.setStatus(id, ResourceStatus.ARCHIVED, user);
  }

  // Traz um recurso arquivado de volta a rascunho — nunca fica preso sem saída.
  async restore(
    id: string,
    user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    return this.setStatus(id, ResourceStatus.DRAFT, user);
  }

  async initUpload(
    id: string,
    dto: ResourceUploadUrlDto,
  ): Promise<CreateUploadUrlResult> {
    await this.findAnyById(id);
    // Validado pelo DTO (`@ValidateIf` na fase "init") — sempre definido aqui.
    return this.storageService.createUploadUrl({
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes as number,
      context: dto.context,
    });
  }

  async confirmUpload(
    id: string,
    dto: ResourceUploadUrlDto,
    user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    await this.findAnyById(id);
    // Validado pelo DTO (`@ValidateIf` na fase "confirm") — sempre definido aqui.
    const objectKey = dto.objectKey as string;

    if (dto.uploadId && dto.parts) {
      await this.storageService.completeMultipartUpload(
        objectKey,
        dto.uploadId,
        dto.parts,
      );
    }

    const uploaded = await this.storageService.confirmUpload(objectKey);
    if (!uploaded) {
      throw new BadRequestException(
        'O ficheiro não foi carregado com sucesso.',
      );
    }
    const validSignature =
      await this.storageService.validateUploadedFileSignature(
        objectKey,
        dto.mimeType,
      );
    if (!validSignature) {
      throw new BadRequestException(
        'O conteúdo do ficheiro não corresponde ao tipo declarado.',
      );
    }

    const field = UPLOAD_CONTEXT_TO_FIELD[dto.context];
    const updated = await this.prisma.resource.update({
      where: { id },
      data: { [field]: objectKey, updatedById: user.id },
      include: RESOURCE_INCLUDE,
    });
    return this.toResponse(updated);
  }

  private async setStatus(
    id: string,
    status: ResourceStatus,
    user: CurrentUserPayload,
  ): Promise<ResourceResponse> {
    await this.findAnyById(id);
    const updated = await this.prisma.resource.update({
      where: { id },
      data: { status, updatedById: user.id },
      include: RESOURCE_INCLUDE,
    });
    return this.toResponse(updated);
  }

  private async findAnyById(id: string): Promise<ResourceWithRelations> {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
      include: RESOURCE_INCLUDE,
    });
    if (!resource) {
      throw new NotFoundException(RESOURCE_NOT_FOUND_MESSAGE);
    }
    return resource;
  }

  private async resolveWorkflowId(
    name: string | undefined,
  ): Promise<string | undefined> {
    if (!name) {
      return undefined;
    }
    const workflow = await this.prisma.workflow.findFirst({ where: { name } });
    if (!workflow) {
      throw new ValidationException('Fluxo desconhecido.', {
        workflow: ['Fluxo desconhecido.'],
      });
    }
    return workflow.id;
  }

  private async resolveDocumentTypeId(
    name: string | undefined,
  ): Promise<string | undefined> {
    if (!name) {
      return undefined;
    }
    const documentType = await this.prisma.documentType.findFirst({
      where: { name },
    });
    if (!documentType) {
      throw new ValidationException('Tipo de documento desconhecido.', {
        documentType: ['Tipo de documento desconhecido.'],
      });
    }
    return documentType.id;
  }

  /** Junta-se a uma etiqueta existente pelo `slug` ou cria uma nova — a UI recolhe
   * etiquetas como texto livre, sem um passo de seleção prévio na taxonomia. */
  private async resolveTagIds(
    names: readonly string[] | undefined,
  ): Promise<readonly string[]> {
    if (!names || names.length === 0) {
      return [];
    }
    const ids: string[] = [];
    for (const rawName of names) {
      const name = rawName.trim();
      if (!name) {
        continue;
      }
      const tag = await this.prisma.tag.upsert({
        where: { slug: slugify(name) },
        update: {},
        create: { name, slug: slugify(name) },
      });
      ids.push(tag.id);
    }
    return ids;
  }

  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base;
    let suffix = 2;
    while (
      await this.prisma.resource.findUnique({ where: { slug: candidate } })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private parseDurationMinutes(
    duration: string | undefined,
  ): number | undefined {
    if (!duration) {
      return undefined;
    }
    const minutes = Number.parseInt(duration.split(':')[0], 10);
    return Number.isNaN(minutes) ? undefined : minutes;
  }

  private managementStatusToPrisma(
    status: Exclude<ManagementStatusFilter, 'all'>,
  ): ResourceStatus {
    return {
      draft: ResourceStatus.DRAFT,
      published: ResourceStatus.PUBLISHED,
      archived: ResourceStatus.ARCHIVED,
    }[status];
  }

  private translateSlugConflict(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      (error.meta?.target as readonly string[] | undefined)?.includes('slug')
    ) {
      return new ValidationException('Já existe um recurso com este slug.', {
        slug: ['Já existe um recurso com este slug.'],
      });
    }
    return error;
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
      thumbnailAlt: resource.thumbnailAlt ?? undefined,
    };
  }
}
