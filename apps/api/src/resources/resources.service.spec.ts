import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role } from '@prisma/client';
import type { CurrentUserPayload } from '../auth/auth.types';
import { ValidationException } from '../common/exceptions/validation.exception';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ListManagementResourcesQueryDto } from './dto/list-management-resources-query.dto';
import { ListResourcesQueryDto } from './dto/list-resources-query.dto';
import { ResourceUploadUrlDto } from './dto/resource-upload-url.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import {
  RESOURCE_NOT_FOUND_MESSAGE,
  ResourcesService,
} from './resources.service';

const EDITOR: CurrentUserPayload = {
  id: 'user-3',
  name: 'João Antunes',
  email: 'joao.antunes@dgadr.gov.pt',
  roles: [Role.CONTENT_EDITOR],
};

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
    thumbnailAlt: null,
    workflowId: 'wf-1',
    documentTypeId: 'dt-1',
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
      create: jest.Mock<Promise<unknown>, [{ data: Record<string, unknown> }]>;
      update: jest.Mock<Promise<unknown>, [{ data: Record<string, unknown> }]>;
    };
    workflow: { findFirst: jest.Mock };
    documentType: { findFirst: jest.Mock };
    tag: { upsert: jest.Mock };
  };
  let storageService: {
    createDownloadUrl: jest.Mock;
    createUploadUrl: jest.Mock;
    confirmUpload: jest.Mock;
    validateUploadedFileSignature: jest.Mock;
    completeMultipartUpload: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      resource: {
        findMany: jest.fn<Promise<unknown[]>, [Prisma.ResourceFindManyArgs]>(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn<
          Promise<unknown>,
          [{ data: Record<string, unknown> }]
        >(),
        update: jest.fn<
          Promise<unknown>,
          [{ data: Record<string, unknown> }]
        >(),
      },
      workflow: { findFirst: jest.fn() },
      documentType: { findFirst: jest.fn() },
      tag: { upsert: jest.fn() },
    };
    storageService = {
      createDownloadUrl: jest.fn(),
      createUploadUrl: jest.fn(),
      confirmUpload: jest.fn(),
      validateUploadedFileSignature: jest.fn(),
      completeMultipartUpload: jest.fn(),
    };

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

  describe('listForManagement / getByIdForManagement', () => {
    it('não filtra por estado quando status="all" e inclui ARCHIVED', async () => {
      prisma.resource.findMany.mockResolvedValue([makeResource()]);

      await service.listForManagement(
        Object.assign(new ListManagementResourcesQueryDto(), { status: 'all' }),
      );

      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('filtra por estado explícito', async () => {
      prisma.resource.findMany.mockResolvedValue([]);

      await service.listForManagement(
        Object.assign(new ListManagementResourcesQueryDto(), {
          status: 'archived',
        }),
      );

      expect(prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'ARCHIVED' } }),
      );
    });

    it('lança 404 para um id inexistente', async () => {
      prisma.resource.findUnique.mockResolvedValue(null);
      await expect(service.getByIdForManagement('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    function createDto(
      overrides: Partial<CreateResourceDto> = {},
    ): CreateResourceDto {
      return Object.assign(new CreateResourceDto(), {
        title: 'Novo recurso',
        slug: 'novo-recurso',
        summary: 'Resumo',
        description: 'Descrição',
        resourceType: 'video',
        difficulty: 'iniciacao',
        ...overrides,
      });
    }

    it('resolve fluxo/tipo de documento por nome e cria em rascunho', async () => {
      prisma.workflow.findFirst.mockResolvedValue({ id: 'wf-1' });
      prisma.documentType.findFirst.mockResolvedValue({ id: 'dt-1' });
      prisma.resource.create.mockResolvedValue(
        makeResource({ status: 'DRAFT' }),
      );

      const result = await service.create(
        createDto({
          workflow: 'Assinatura',
          documentType: 'Despacho',
          tags: [],
        }),
        EDITOR,
      );

      expect(prisma.resource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workflowId: 'wf-1',
            documentTypeId: 'dt-1',
            createdById: EDITOR.id,
            updatedById: EDITOR.id,
          }) as unknown,
        }),
      );
      expect(result.status).toBe('draft');
    });

    it('lança ValidationException quando o fluxo indicado não existe', async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);

      await expect(
        service.create(createDto({ workflow: 'Inexistente' }), EDITOR),
      ).rejects.toThrow(ValidationException);
    });

    it('traduz um conflito de slug (P2002) num erro amigável com fieldErrors', async () => {
      prisma.resource.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['slug'] },
        }),
      );

      await expect(service.create(createDto(), EDITOR)).rejects.toMatchObject({
        response: { fieldErrors: { slug: expect.any(Array) as unknown } },
      });
    });

    it('junta-se a uma etiqueta existente ou cria uma nova pelo slug', async () => {
      prisma.tag.upsert.mockResolvedValue({ id: 'tag-1' });
      prisma.resource.create.mockResolvedValue(makeResource());

      await service.create(createDto({ tags: ['Assinatura Digital'] }), EDITOR);

      expect(prisma.tag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'assinatura-digital' } }),
      );
    });
  });

  describe('update', () => {
    it('lança 404 para um id inexistente', async () => {
      prisma.resource.findUnique.mockResolvedValue(null);
      await expect(
        service.update('inexistente', new UpdateResourceDto(), EDITOR),
      ).rejects.toThrow(NotFoundException);
    });

    it('só altera os campos enviados', async () => {
      prisma.resource.findUnique.mockResolvedValue(makeResource());
      prisma.resource.update.mockResolvedValue(
        makeResource({ title: 'Atualizado' }),
      );

      await service.update(
        'res-1',
        Object.assign(new UpdateResourceDto(), { title: 'Atualizado' }),
        EDITOR,
      );

      const data = prisma.resource.update.mock.calls[0][0].data;
      expect(data.title).toBe('Atualizado');
      expect(data.workflowId).toBeUndefined();
    });
  });

  describe('duplicate', () => {
    it('clona os metadados como novo rascunho, sem copiar ficheiros', async () => {
      prisma.resource.findUnique
        .mockResolvedValueOnce(makeResource())
        .mockResolvedValueOnce(null);
      prisma.resource.create.mockResolvedValue(
        makeResource({ id: 'res-2', status: 'DRAFT' }),
      );

      await service.duplicate('res-1', EDITOR);

      const data = prisma.resource.create.mock.calls[0][0].data;
      expect(data.title).toBe('Título de exemplo (cópia)');
      expect(data.fileObjectKey).toBeUndefined();
      expect(data.thumbnailObjectKey).toBeUndefined();
    });
  });

  describe('publish', () => {
    it('falha com fieldErrors quando faltam campos obrigatórios', async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResource({
          workflowId: null,
          documentType: null,
          documentTypeId: null,
          thumbnailObjectKey: null,
          thumbnailAlt: null,
        }),
      );

      await expect(service.publish('res-1', EDITOR)).rejects.toMatchObject({
        response: {
          fieldErrors: expect.objectContaining({
            workflow: expect.any(Array) as unknown,
            documentType: expect.any(Array) as unknown,
            thumbnailAlt: expect.any(Array) as unknown,
          }) as unknown,
        },
      });
    });

    it('publica com sucesso quando todos os campos obrigatórios estão preenchidos', async () => {
      prisma.resource.findUnique.mockResolvedValue(
        makeResource({ thumbnailAlt: 'Miniatura' }),
      );
      prisma.resource.update.mockResolvedValue(
        makeResource({ thumbnailAlt: 'Miniatura', status: 'PUBLISHED' }),
      );

      const result = await service.publish('res-1', EDITOR);
      expect(result.status).toBe('published');
    });
  });

  describe('unpublish / archive / restore', () => {
    it.each([
      ['unpublish', 'DRAFT'],
      ['archive', 'ARCHIVED'],
      ['restore', 'DRAFT'],
    ] as const)('%s move o recurso para %s', async (method, expectedStatus) => {
      prisma.resource.findUnique.mockResolvedValue(makeResource());
      prisma.resource.update.mockResolvedValue(
        makeResource({ status: expectedStatus }),
      );

      await service[method]('res-1', EDITOR);

      expect(prisma.resource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: expectedStatus }) as unknown,
        }),
      );
    });
  });

  describe('initUpload / confirmUpload', () => {
    function uploadDto(
      overrides: Partial<ResourceUploadUrlDto> = {},
    ): ResourceUploadUrlDto {
      return Object.assign(new ResourceUploadUrlDto(), {
        context: 'thumbnail',
        phase: 'init',
        fileName: 'foto.jpg',
        mimeType: 'image/jpeg',
        ...overrides,
      });
    }

    it('pede um URL de carregamento ao StorageService na fase init', async () => {
      prisma.resource.findUnique.mockResolvedValue(makeResource());
      storageService.createUploadUrl.mockResolvedValue({
        mode: 'single',
        objectKey: 'thumbnails/abc.jpg',
        uploadUrl: 'https://storage.example/put',
        expiresAt: new Date(),
      });

      const result = await service.initUpload(
        'res-1',
        uploadDto({ sizeBytes: 1024 }),
      );

      expect(storageService.createUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({ context: 'thumbnail', sizeBytes: 1024 }),
      );
      expect(result).toMatchObject({ mode: 'single' });
    });

    it('confirma o carregamento, valida a assinatura e atualiza o recurso', async () => {
      prisma.resource.findUnique.mockResolvedValue(makeResource());
      storageService.confirmUpload.mockResolvedValue(true);
      storageService.validateUploadedFileSignature.mockResolvedValue(true);
      prisma.resource.update.mockResolvedValue(
        makeResource({ thumbnailObjectKey: 'thumbnails/abc.jpg' }),
      );

      await service.confirmUpload(
        'res-1',
        uploadDto({ phase: 'confirm', objectKey: 'thumbnails/abc.jpg' }),
        EDITOR,
      );

      expect(prisma.resource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            thumbnailObjectKey: 'thumbnails/abc.jpg',
          }) as unknown,
        }),
      );
    });

    it('lança BadRequestException quando o ficheiro não foi efetivamente carregado', async () => {
      prisma.resource.findUnique.mockResolvedValue(makeResource());
      storageService.confirmUpload.mockResolvedValue(false);

      await expect(
        service.confirmUpload(
          'res-1',
          uploadDto({ phase: 'confirm', objectKey: 'thumbnails/abc.jpg' }),
          EDITOR,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando a assinatura do ficheiro não corresponde ao tipo declarado', async () => {
      prisma.resource.findUnique.mockResolvedValue(makeResource());
      storageService.confirmUpload.mockResolvedValue(true);
      storageService.validateUploadedFileSignature.mockResolvedValue(false);

      await expect(
        service.confirmUpload(
          'res-1',
          uploadDto({ phase: 'confirm', objectKey: 'thumbnails/abc.jpg' }),
          EDITOR,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('completa o carregamento em várias partes antes de confirmar, quando multipart', async () => {
      prisma.resource.findUnique.mockResolvedValue(makeResource());
      storageService.confirmUpload.mockResolvedValue(true);
      storageService.validateUploadedFileSignature.mockResolvedValue(true);
      prisma.resource.update.mockResolvedValue(makeResource());

      await service.confirmUpload(
        'res-1',
        uploadDto({
          phase: 'confirm',
          objectKey: 'thumbnails/abc.jpg',
          uploadId: 'upload-1',
          parts: [{ partNumber: 1, eTag: 'etag-1' }],
        }),
        EDITOR,
      );

      expect(storageService.completeMultipartUpload).toHaveBeenCalledWith(
        'thumbnails/abc.jpg',
        'upload-1',
        [{ partNumber: 1, eTag: 'etag-1' }],
      );
    });
  });
});
