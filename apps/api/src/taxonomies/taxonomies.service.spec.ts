import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  TAXONOMY_NOT_FOUND_MESSAGE,
  TaxonomiesService,
} from './taxonomies.service';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wf-1',
    name: 'Assinatura',
    slug: 'assinatura',
    isActive: true,
    sortOrder: 1,
    ...overrides,
  };
}

describe('TaxonomiesService', () => {
  let service: TaxonomiesService;
  let prisma: {
    workflow: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    documentType: { findMany: jest.Mock };
    tag: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      workflow: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      documentType: { findMany: jest.fn() },
      tag: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxonomiesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TaxonomiesService);
  });

  describe('list', () => {
    it('devolve as taxonomias do tipo pedido, ordenadas por sortOrder, mapeadas para a forma do frontend', async () => {
      prisma.workflow.findMany.mockResolvedValue([makeRow()]);

      const result = await service.list('workflow');

      expect(prisma.workflow.findMany).toHaveBeenCalledWith({
        orderBy: { sortOrder: 'asc' },
      });
      expect(result).toEqual([
        { id: 'wf-1', label: 'Assinatura', order: 1, active: true },
      ]);
    });
  });

  describe('create', () => {
    it('gera o slug e usa a sortOrder seguinte', async () => {
      prisma.workflow.findMany.mockResolvedValue([makeRow({ sortOrder: 3 })]);
      prisma.workflow.create.mockResolvedValue(
        makeRow({ id: 'wf-2', name: 'Nova Taxonomia', sortOrder: 4 }),
      );

      await service.create('workflow', 'Nova Taxonomia');

      expect(prisma.workflow.create).toHaveBeenCalledWith({
        data: { name: 'Nova Taxonomia', slug: 'nova-taxonomia', sortOrder: 4 },
      });
    });

    it('traduz um conflito de slug (P2002) num erro amigável', async () => {
      prisma.workflow.findMany.mockResolvedValue([]);
      prisma.workflow.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create('workflow', 'Assinatura'),
      ).rejects.toMatchObject({
        response: { fieldErrors: { name: expect.any(Array) as unknown } },
      });
    });
  });

  describe('toggleActive', () => {
    it('lança 404 para um id inexistente', async () => {
      prisma.workflow.findUnique.mockResolvedValue(null);
      await expect(
        service.toggleActive('workflow', 'inexistente'),
      ).rejects.toThrow(new NotFoundException(TAXONOMY_NOT_FOUND_MESSAGE));
    });

    it('inverte o estado ativo', async () => {
      prisma.workflow.findUnique.mockResolvedValue(makeRow({ isActive: true }));
      prisma.workflow.update.mockResolvedValue(makeRow({ isActive: false }));

      const result = await service.toggleActive('workflow', 'wf-1');

      expect(prisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'wf-1' },
        data: { isActive: false },
      });
      expect(result.active).toBe(false);
    });
  });

  describe('reorder', () => {
    it('troca a sortOrder com o vizinho anterior', async () => {
      prisma.workflow.findMany.mockResolvedValue([
        makeRow({ id: 'wf-1', sortOrder: 1 }),
        makeRow({ id: 'wf-2', sortOrder: 2 }),
      ]);
      prisma.workflow.update.mockResolvedValue(makeRow());

      await service.reorder('workflow', 'wf-2', 'up');

      expect(prisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'wf-2' },
        data: { sortOrder: 1 },
      });
      expect(prisma.workflow.update).toHaveBeenCalledWith({
        where: { id: 'wf-1' },
        data: { sortOrder: 2 },
      });
    });

    it('não altera nada quando já está na posição limite', async () => {
      prisma.workflow.findMany.mockResolvedValue([makeRow({ sortOrder: 1 })]);

      await service.reorder('workflow', 'wf-1', 'up');

      expect(prisma.workflow.update).not.toHaveBeenCalled();
    });

    it('lança 404 para um id inexistente', async () => {
      prisma.workflow.findMany.mockResolvedValue([makeRow()]);
      await expect(
        service.reorder('workflow', 'inexistente', 'up'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('lança 404 para um id inexistente', async () => {
      prisma.workflow.findUnique.mockResolvedValue(null);
      await expect(service.delete('workflow', 'inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('traduz uma violação de restrição (P2003) num erro amigável, nunca um erro cru', async () => {
      prisma.workflow.findUnique.mockResolvedValue(makeRow());
      prisma.workflow.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Foreign key constraint failed',
          {
            code: 'P2003',
            clientVersion: 'test',
          },
        ),
      );

      await expect(service.delete('workflow', 'wf-1')).rejects.toMatchObject({
        response: {
          message: 'Não é possível eliminar; existem recursos associados.',
        },
      });
    });

    it('elimina quando não há recursos associados', async () => {
      prisma.workflow.findUnique.mockResolvedValue(makeRow());
      prisma.workflow.delete.mockResolvedValue(makeRow());

      await service.delete('workflow', 'wf-1');

      expect(prisma.workflow.delete).toHaveBeenCalledWith({
        where: { id: 'wf-1' },
      });
    });
  });
});
