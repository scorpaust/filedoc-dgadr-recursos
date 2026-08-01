import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController', () => {
  it('list delega no serviço com a query', async () => {
    const service = {
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const controller = new AuditController(service as unknown as AuditService);
    const query = { page: 1, pageSize: 20 };

    await controller.list(query);

    expect(service.list).toHaveBeenCalledWith(query);
  });
});
