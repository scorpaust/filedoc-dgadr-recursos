import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrphanCleanupService } from './orphan-cleanup.service';
import { StorageService } from './storage.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OrphanCleanupService', () => {
  let service: OrphanCleanupService;
  let storage: {
    listAllObjects: jest.Mock;
    deleteObject: jest.Mock;
  };
  let prisma: {
    resource: { findMany: jest.Mock };
    ticketAttachment: { findMany: jest.Mock };
  };
  let gracePeriodSeconds: number;

  beforeEach(async () => {
    storage = { listAllObjects: jest.fn(), deleteObject: jest.fn() };
    prisma = {
      resource: { findMany: jest.fn().mockResolvedValue([]) },
      ticketAttachment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    gracePeriodSeconds = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrphanCleanupService,
        { provide: StorageService, useValue: storage },
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => gracePeriodSeconds),
          },
        },
      ],
    }).compile();

    service = module.get(OrphanCleanupService);
  });

  it('remove um objeto sem qualquer referência ativa na base de dados', async () => {
    storage.listAllObjects.mockResolvedValue([
      { key: 'videos/orfao.mp4', lastModified: new Date('2020-01-01') },
    ]);
    storage.deleteObject.mockResolvedValue(undefined);

    const result = await service.cleanupOrphanObjects();

    expect(storage.deleteObject).toHaveBeenCalledWith('videos/orfao.mp4');
    expect(result.removed).toEqual(['videos/orfao.mp4']);
  });

  it('nunca remove um objeto referenciado por um recurso, mesmo arquivado', async () => {
    prisma.resource.findMany.mockResolvedValue([
      {
        fileObjectKey: 'videos/arquivado.mp4',
        thumbnailObjectKey: null,
        captionObjectKey: null,
      },
    ]);
    storage.listAllObjects.mockResolvedValue([
      { key: 'videos/arquivado.mp4', lastModified: new Date('2020-01-01') },
    ]);

    const result = await service.cleanupOrphanObjects();

    expect(storage.deleteObject).not.toHaveBeenCalled();
    expect(result.removed).toEqual([]);
  });

  it('nunca remove um objeto referenciado por um anexo de ticket', async () => {
    prisma.ticketAttachment.findMany.mockResolvedValue([
      { objectKey: 'ticket-attachments/anexo.pdf' },
    ]);
    storage.listAllObjects.mockResolvedValue([
      {
        key: 'ticket-attachments/anexo.pdf',
        lastModified: new Date('2020-01-01'),
      },
    ]);

    const result = await service.cleanupOrphanObjects();

    expect(storage.deleteObject).not.toHaveBeenCalled();
    expect(result.removed).toEqual([]);
  });

  it('não remove um objeto sem referência mas ainda dentro da janela de graça', async () => {
    gracePeriodSeconds = 24 * 60 * 60;
    storage.listAllObjects.mockResolvedValue([
      { key: 'videos/recente.mp4', lastModified: new Date() },
    ]);

    const result = await service.cleanupOrphanObjects();

    expect(storage.deleteObject).not.toHaveBeenCalled();
    expect(result.removed).toEqual([]);
  });
});
