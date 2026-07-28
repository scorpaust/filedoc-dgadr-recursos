import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ListResourcesQueryDto } from './dto/list-resources-query.dto';
import {
  RESOURCE_NOT_FOUND_MESSAGE,
  ResourcesService,
} from './resources.service';

function baseQuery(
  overrides: Partial<ListResourcesQueryDto> = {},
): ListResourcesQueryDto {
  const query = new ListResourcesQueryDto();
  Object.assign(query, { page: 1, pageSize: 12, sort: 'recent', ...overrides });
  return query;
}

function makeResource(overrides: Record<string, unknown> = {}) {
  return {
    id: 'res-1',
    slug: 'exemplo',
    title: 'Título de exemplo',
    summary: 'Resumo',
    description: 'Descrição',
    resourceType: 'VIDEO',
    difficulty: 'INICIACAO',
    status: 'PUBLISHED',
    durationMinutes: 6,
    pageCount: null,
    fileObjectKey: 'dev/resource/main.mp4',
    thumbnailObjectKey: 'dev/resource/thumbnail.jpg',
    workflowId: 'wf-1',
    publishedAt: new Date('2026-06-30T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    workflow: { id: 'wf-1', name: 'Assinatura' },
    documentType: { id: 'dt-1', name: 'Despacho' },
    tags: [{ tagId: 'tag-1', tag: { id: 'tag-1', name: 'assinatura' } }],
    createdBy: { id: 'user-3', name: 'João Antunes' },
    ...overrides,
  };
}

describe('ResourcesService', () => {
  let service: ResourcesService;
  let prisma: {
    resource: {
      findMany: jest.Mock<Promise<unknown[]>, [Prisma.ResourceFindManyArgs]>;
      findUnique: jest.Mock;
      count: jest.Mock;
    };
  };
  let storageService: { createDownloadUrl: jest.Mock };

  beforeEach(async () => {
    prisma = {
      resource: {
        findMany: jest.fn<Promise<unknown[]>, [Prisma.ResourceFindManyArgs]>(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
    };
    storageService = { createDownloadUrl: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get(ResourcesService);
  });

  describe('search', () => {
    it('restringe a EMPLOYEE ao estado PUBLISHED e mapeia os campos de resposta', async () => {
      prisma.resource.findMany.mockResolvedValue([makeResource()]);
      prisma.resource.count.mockResolvedValue(1);

      const result = await service.search(baseQuery(), [Role.EMPLOYEE]);

      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['PUBLISHED'] } },
        }),
      );
      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({
        id: 'res-1',
        type: 'video',
        workflow: 'Assinatura',
        documentType: 'Despacho',
        difficulty: 'iniciacao',
        tags: ['assinatura'],
        duration: '6:00',
        status: 'published',
        author: 'João Antunes',
      });
    });

    it('inclui DRAFT para CONTENT_EDITOR/ADMIN, mas nunca ARCHIVED', async () => {
      prisma.resource.findMany.mockResolvedValue([]);
      prisma.resource.count.mockResolvedValue(0);

      await service.search(baseQuery(), [Role.CONTENT_EDITOR]);

      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['PUBLISHED', 'DRAFT'] } },
        }),
      );
    });

    it('combina pesquisa de texto e filtros por fluxo/dificuldade/tipo', async () => {
      prisma.resource.findMany.mockResolvedValue([]);
      prisma.resource.count.mockResolvedValue(0);

      await service.search(
        baseQuery({
          q: 'despacho',
          type: 'guide',
          workflow: ['Assinatura'],
          difficulty: ['iniciacao'],
        }),
        [Role.EMPLOYEE],
      );

      const call = prisma.resource.findMany.mock.calls[0][0];
      const where = call.where as Prisma.ResourceWhereInput;
      expect(where.resourceType).toBe('PDF_GUIDE');
      expect(where.workflow).toEqual({ name: { in: ['Assinatura'] } });
      expect(where.difficulty).toEqual({ in: ['INICIACAO'] });
      expect(where.OR).toEqual([
        { title: { contains: 'despacho', mode: 'insensitive' } },
        { summary: { contains: 'despacho', mode: 'insensitive' } },
        {
          tags: {
            some: {
              tag: { name: { contains: 'despacho', mode: 'insensitive' } },
            },
          },
        },
      ]);
    });

    it('ordena por título quando sort="alphabetical", por publishedAt desc por omissão', async () => {
      prisma.resource.findMany.mockResolvedValue([]);
      prisma.resource.count.mockResolvedValue(0);

      await service.search(baseQuery({ sort: 'alphabetical' }), [
        Role.EMPLOYEE,
      ]);
      expect(prisma.resource.findMany.mock.calls[0][0].orderBy).toEqual({
        title: 'asc',
      });

      await service.search(baseQuery(), [Role.EMPLOYEE]);
      expect(prisma.resource.findMany.mock.calls[1][0].orderBy).toEqual({
        publishedAt: 'desc',
      });
    });
  });

  describe('getBySlug', () => {
    it('devolve o recurso e os relacionados (mesmo fluxo ou etiqueta em comum)', async () => {
      const resource = makeResource();
      const related = makeResource({
        id: 'res-2',
        slug: 'exemplo-relacionado',
      });
      prisma.resource.findUnique.mockResolvedValue(resource);
      prisma.resource.findMany.mockResolvedValue([related]);

      const result = await service.getBySlug('exemplo', [Role.EMPLOYEE]);

      expect(result.resource.id).toBe('res-1');
      expect(result.related).toHaveLength(1);
      expect(result.related[0].id).toBe('res-2');
      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: 'res-1' },
            status: { in: ['PUBLISHED'] },
          }) as Prisma.ResourceWhereInput,
          take: 4,
        }),
      );
    });

    it('lança 404 genérico para slug inexistente', async () => {
      prisma.resource.findUnique.mockResolvedValue(null);

      await expect(
        service.getBySlug('inexistente', [Role.EMPLOYEE]),
      ).rejects.toThrow(new NotFoundException(RESOURCE_NOT_FOUND_MESSAGE));
    });

    it('lança o mesmo 404 genérico para um rascunho sem permissão (nunca revela a existência)', async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResource({ status: 'DRAFT' }),
      );

      await expect(
        service.getBySlug('exemplo', [Role.EMPLOYEE]),
      ).rejects.toThrow(new NotFoundException(RESOURCE_NOT_FOUND_MESSAGE));
    });

    it('mostra um rascunho a CONTENT_EDITOR', async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResource({ status: 'DRAFT' }),
      );
      prisma.resource.findMany.mockResolvedValue([]);

      const result = await service.getBySlug('exemplo', [Role.CONTENT_EDITOR]);
      expect(result.resource.status).toBe('draft');
    });
  });

  describe('getFileDownloadUrl / getThumbnailDownloadUrl', () => {
    it('devolve o URL pré-assinado do StorageService para um recurso publicado', async () => {
      prisma.resource.findUnique.mockResolvedValue(makeResource());
      storageService.createDownloadUrl.mockResolvedValue(
        'https://storage.example/presigned',
      );

      const url = await service.getFileDownloadUrl('res-1', [Role.EMPLOYEE]);

      expect(storageService.createDownloadUrl).toHaveBeenCalledWith(
        'dev/resource/main.mp4',
      );
      expect(url).toBe('https://storage.example/presigned');
    });

    it('lança 404 quando o recurso não tem ficheiro associado', async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResource({ fileObjectKey: null }),
      );

      await expect(
        service.getFileDownloadUrl('res-1', [Role.EMPLOYEE]),
      ).rejects.toThrow(NotFoundException);
    });

    it('lança 404 ao pedir o ficheiro de um recurso em rascunho sem permissão', async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResource({ status: 'DRAFT' }),
      );

      await expect(
        service.getFileDownloadUrl('res-1', [Role.EMPLOYEE]),
      ).rejects.toThrow(NotFoundException);
    });

    it('lança 404 ao pedir a miniatura de um recurso arquivado', async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResource({ status: 'ARCHIVED' }),
      );

      await expect(
        service.getThumbnailDownloadUrl('res-1', [Role.ADMIN]),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
