import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import type { CurrentUserPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from './content.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { CreateTipDto } from './dto/create-tip.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { UpdateTipDto } from './dto/update-tip.dto';

const EDITOR: CurrentUserPayload = {
  id: 'user-3',
  name: 'João Antunes',
  email: 'joao.antunes@dgadr.gov.pt',
  roles: [Role.CONTENT_EDITOR],
};

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
    tip: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock<Promise<unknown>, [{ data: Record<string, unknown> }]>;
      update: jest.Mock;
      aggregate: jest.Mock;
    };
    faq: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      aggregate: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      tip: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn<
          Promise<unknown>,
          [{ data: Record<string, unknown> }]
        >(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      faq: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
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

  describe('createTip / updateTip', () => {
    it('deriva o título a partir da primeira linha do conteúdo', async () => {
      prisma.tip.aggregate.mockResolvedValue({ _max: { sortOrder: 2 } });
      prisma.tip.create.mockResolvedValue(makeTip({ sortOrder: 3 }));

      await service.createTip(
        Object.assign(new CreateTipDto(), {
          content: 'Primeira linha\nSegunda linha, ignorada.',
        }),
        EDITOR,
      );

      const data = prisma.tip.create.mock.calls[0][0].data;
      expect(data.title).toBe('Primeira linha');
      expect(data.sortOrder).toBe(3);
      expect(data.createdById).toBe(EDITOR.id);
    });

    it('trunca títulos derivados demasiado longos com reticências', async () => {
      prisma.tip.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
      prisma.tip.create.mockResolvedValue(makeTip());

      const longContent = 'a'.repeat(120);
      await service.createTip(
        Object.assign(new CreateTipDto(), { content: longContent }),
        EDITOR,
      );

      const data = prisma.tip.create.mock.calls[0][0].data;
      expect(data.title).toHaveLength(81);
      expect((data.title as string).endsWith('…')).toBe(true);
    });

    it('lança 404 ao atualizar uma dica inexistente', async () => {
      prisma.tip.findUnique.mockResolvedValue(null);
      await expect(
        service.updateTip(
          'inexistente',
          Object.assign(new UpdateTipDto(), { content: 'Novo texto' }),
          EDITOR,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorderTip', () => {
    it('troca a sortOrder com o vizinho seguinte', async () => {
      prisma.tip.findMany.mockResolvedValueOnce([
        makeTip({ id: 'tip-1', sortOrder: 1 }),
        makeTip({ id: 'tip-2', sortOrder: 2 }),
      ]);
      prisma.tip.update.mockResolvedValue(makeTip());
      prisma.tip.findMany.mockResolvedValueOnce([]);

      await service.reorderTip('tip-1', 'down');

      expect(prisma.tip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tip-1' },
          data: { sortOrder: 2 },
        }),
      );
      expect(prisma.tip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tip-2' },
          data: { sortOrder: 1 },
        }),
      );
    });

    it('lança 404 para um id inexistente', async () => {
      prisma.tip.findMany.mockResolvedValue([makeTip({ id: 'tip-1' })]);
      await expect(service.reorderTip('inexistente', 'up')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createFaq / updateFaq', () => {
    it('cria com a categoria opcional e a sortOrder seguinte', async () => {
      prisma.faq.aggregate.mockResolvedValue({ _max: { sortOrder: 4 } });
      prisma.faq.create.mockResolvedValue(makeFaq({ sortOrder: 5 }));

      await service.createFaq(
        Object.assign(new CreateFaqDto(), {
          question: 'Pergunta?',
          answer: 'Resposta.',
        }),
        EDITOR,
      );

      expect(prisma.faq.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 5 }) as unknown,
        }),
      );
    });

    it('lança 404 ao atualizar uma pergunta inexistente', async () => {
      prisma.faq.findUnique.mockResolvedValue(null);
      await expect(
        service.updateFaq(
          'inexistente',
          Object.assign(new UpdateFaqDto(), {
            question: 'Pergunta?',
            answer: 'Resposta.',
          }),
          EDITOR,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('publishTip / unpublishTip / archiveTip / restoreTip', () => {
    it.each([
      ['publishTip', 'PUBLISHED'],
      ['unpublishTip', 'DRAFT'],
      ['archiveTip', 'ARCHIVED'],
      ['restoreTip', 'DRAFT'],
    ] as const)('%s move a dica para %s', async (method, expectedStatus) => {
      prisma.tip.findUnique.mockResolvedValue(makeTip());
      prisma.tip.update.mockResolvedValue(makeTip({ status: expectedStatus }));

      await service[method]('seed-tip-1', EDITOR);

      expect(prisma.tip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: expectedStatus }) as unknown,
        }),
      );
    });
  });
});
