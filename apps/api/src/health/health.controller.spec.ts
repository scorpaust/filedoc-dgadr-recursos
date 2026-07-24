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

  it('/health devolve status "ok" sem consultar a base de dados', () => {
    expect(controller.check()).toEqual({ status: 'ok' });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('/ready devolve status "ok" quando a base de dados responde', async () => {
    await expect(controller.checkReady()).resolves.toEqual({ status: 'ok' });
    expect(queryRaw).toHaveBeenCalled();
  });

  it('/ready propaga o erro quando a base de dados não responde', async () => {
    queryRaw.mockRejectedValueOnce(new Error('connection refused'));

    await expect(controller.checkReady()).rejects.toThrow('connection refused');
  });
});
