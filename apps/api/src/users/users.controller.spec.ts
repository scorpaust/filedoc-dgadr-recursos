import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: {
    list: jest.Mock;
    create: jest.Mock;
    updateName: jest.Mock;
    assignRoles: jest.Mock;
    activate: jest.Mock;
    deactivate: jest.Mock;
    invalidateSessions: jest.Mock;
  };

  beforeEach(() => {
    service = {
      list: jest.fn(),
      create: jest.fn(),
      updateName: jest.fn(),
      assignRoles: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      invalidateSessions: jest.fn(),
    };
    controller = new UsersController(service as unknown as UsersService);
  });

  it('list delega no serviço com a query', async () => {
    service.list.mockResolvedValue([]);
    const query = { status: 'all' as const };
    await controller.list(query);
    expect(service.list).toHaveBeenCalledWith(query);
  });

  it('create delega no serviço com o DTO', async () => {
    const dto = { name: 'Marta', email: 'marta@dgadr.gov.pt', roles: [] };
    service.create.mockResolvedValue({});
    await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('updateName delega no serviço com o id e o DTO', async () => {
    const dto = { name: 'Novo Nome' };
    service.updateName.mockResolvedValue({});
    await controller.updateName('user-1', dto);
    expect(service.updateName).toHaveBeenCalledWith('user-1', dto);
  });

  it('assignRoles delega no serviço com o id e o DTO', async () => {
    const dto = { roles: [] };
    service.assignRoles.mockResolvedValue({});
    await controller.assignRoles('user-1', dto);
    expect(service.assignRoles).toHaveBeenCalledWith('user-1', dto);
  });

  it('activate delega no serviço com o id', async () => {
    service.activate.mockResolvedValue({});
    await controller.activate('user-1');
    expect(service.activate).toHaveBeenCalledWith('user-1');
  });

  it('deactivate delega no serviço com o id', async () => {
    service.deactivate.mockResolvedValue({});
    await controller.deactivate('user-1');
    expect(service.deactivate).toHaveBeenCalledWith('user-1');
  });

  it('invalidateSessions delega no serviço com o id', async () => {
    service.invalidateSessions.mockResolvedValue(undefined);
    await controller.invalidateSessions('user-1');
    expect(service.invalidateSessions).toHaveBeenCalledWith('user-1');
  });
});
