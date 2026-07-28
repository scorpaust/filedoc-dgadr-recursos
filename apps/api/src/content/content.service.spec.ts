import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from './content.service';

function makeTip(overrides: Record<string, unknown> = {}) {
  return {
    id: 'seed-tip-1',
    title: 'Confirmar metadados',
    content: 'Confirme os metadados antes de submeter um documento.',
    status: 'PUBLISHED',
    sortOrder: 1,
    ...overrides,
  };
}

function makeFaq(overrides: Record<string, unknown> = {}) {
  return {
    id: 'seed-faq-1',
    question: 'Não consigo aceder ao Filedoc. O que devo verificar?',
    answer: 'Confirme a ligação à rede institucional.',
    category: 'Acesso e permissões',
    status: 'PUBLISHED',
    sortOrder: 1,
    ...overrides,
  };
}

describe('ContentService', () => {
  let service: ContentService;
  let prisma: {
    tip: { findMany: jest.Mock };
    faq: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      tip: { findMany: jest.fn() },
      faq: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ContentService);
  });

  describe('listTips', () => {
    it('restringe a EMPLOYEE ao estado PUBLISHED e mapeia `content` para `text`', async () => {
      prisma.tip.findMany.mockResolvedValue([makeTip()]);

      const result = await service.listTips([Role.EMPLOYEE]);

      expect(prisma.tip.findMany).toHaveBeenCalledWith({
        where: { status: { in: ['PUBLISHED'] } },
        orderBy: { sortOrder: 'asc' },
      });
      expect(result).toEqual([
        {
          id: 'seed-tip-1',
          text: 'Confirme os metadados antes de submeter um documento.',
          status: 'published',
          sortOrder: 1,
        },
      ]);
    });

    it('inclui DRAFT para CONTENT_EDITOR/ADMIN, mas nunca ARCHIVED', async () => {
      prisma.tip.findMany.mockResolvedValue([]);

      await service.listTips([Role.CONTENT_EDITOR]);

      expect(prisma.tip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['PUBLISHED', 'DRAFT'] } },
        }),
      );
    });
  });

  describe('listFaqs', () => {
    it('mapeia a categoria e devolve undefined quando ausente', async () => {
      prisma.faq.findMany.mockResolvedValue([
        makeFaq(),
        makeFaq({ id: 'seed-faq-6', category: null }),
      ]);

      const result = await service.listFaqs([Role.EMPLOYEE]);

      expect(result[0].category).toBe('Acesso e permissões');
      expect(result[1].category).toBeUndefined();
    });

    it('restringe a EMPLOYEE ao estado PUBLISHED', async () => {
      prisma.faq.findMany.mockResolvedValue([]);

      await service.listFaqs([Role.EMPLOYEE]);

      expect(prisma.faq.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: { in: ['PUBLISHED'] } } }),
      );
    });
  });
});
