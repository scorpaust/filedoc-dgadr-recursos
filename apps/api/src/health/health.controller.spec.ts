import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let queryRaw: jest.Mock;

  beforeEach(async () => {
    queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('devolve status "ok" quando a base de dados responde', async () => {
    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
    expect(queryRaw).toHaveBeenCalled();
  });

  it('propaga o erro quando a base de dados não responde', async () => {
    queryRaw.mockRejectedValueOnce(new Error('connection refused'));

    await expect(controller.check()).rejects.toThrow('connection refused');
  });
});
