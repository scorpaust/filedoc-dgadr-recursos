import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'audit-1',
    actorId: 'user-1',
    actor: { name: 'Ana Ferreira' },
    action: 'ticket.assign',
    entityType: 'ticket',
    entityId: 'ticket-1',
    metadata: { agentId: 'user-2' },
    correlationId: 'corr-1',
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('AuditService', () => {
  let service: AuditService;
  let prisma: {
    auditLog: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AuditService);
  });

  describe('record', () => {
    it('grava a entrada com os campos recebidos', async () => {
      prisma.auditLog.create.mockResolvedValue(makeEntry());

      await service.record({
        actorId: 'user-1',
        action: 'ticket.assign',
        entityType: 'ticket',
        entityId: 'ticket-1',
        metadata: { agentId: 'user-2' },
        correlationId: 'corr-1',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 'user-1',
          action: 'ticket.assign',
          entityType: 'ticket',
          entityId: 'ticket-1',
          metadata: { agentId: 'user-2' },
          correlationId: 'corr-1',
        },
      });
    });

    it('nunca lança — uma falha ao escrever fica apenas registada em log', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('BD indisponível'));

      await expect(
        service.record({
          actorId: 'user-1',
          action: 'auth.login',
          entityType: 'user',
          entityId: 'user-1',
          correlationId: undefined,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('list', () => {
    it('filtra por tipo de entidade, ator e intervalo de datas, com paginação', async () => {
      prisma.auditLog.findMany.mockResolvedValue([makeEntry()]);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await service.list({
        entityType: 'ticket',
        actorId: 'user-1',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-31T23:59:59.000Z',
        page: 2,
        pageSize: 10,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'ticket',
          actorId: 'user-1',
          createdAt: {
            gte: new Date('2026-01-01T00:00:00.000Z'),
            lte: new Date('2026-01-31T23:59:59.000Z'),
          },
        },
        include: { actor: true },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
      expect(result).toEqual({
        items: [
          {
            id: 'audit-1',
            actor: 'Ana Ferreira',
            action: 'ticket.assign',
            entityType: 'ticket',
            entityId: 'ticket-1',
            metadata: { agentId: 'user-2' },
            correlationId: 'corr-1',
            createdAt: '2026-01-01T10:00:00.000Z',
          },
        ],
        total: 1,
      });
    });

    it('resolve o ator para "Sistema" quando a conta já não existe (actorId nulo)', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        makeEntry({ actorId: null, actor: null }),
      ]);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.items[0].actor).toBe('Sistema');
    });
  });
});
