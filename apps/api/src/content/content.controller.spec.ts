import { Role } from '@prisma/client';
import type { CurrentUserPayload } from '../auth/auth.types';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

const user: CurrentUserPayload = {
  id: 'user-1',
  name: 'Marta Silva',
  email: 'marta.silva@dgadr.gov.pt',
  roles: [Role.EMPLOYEE],
};

describe('ContentController', () => {
  let controller: ContentController;
  let service: { listTips: jest.Mock; listFaqs: jest.Mock };

  beforeEach(() => {
    service = { listTips: jest.fn(), listFaqs: jest.fn() };
    controller = new ContentController(service as unknown as ContentService);
  });

  it('getTips delega no serviço com as funções do utilizador autenticado', async () => {
    service.listTips.mockResolvedValue([]);

    const result = await controller.getTips(user);

    expect(service.listTips).toHaveBeenCalledWith(user.roles);
    expect(result).toEqual([]);
  });

  it('getFaqs delega no serviço com as funções do utilizador autenticado', async () => {
    service.listFaqs.mockResolvedValue([]);

    const result = await controller.getFaqs(user);

    expect(service.listFaqs).toHaveBeenCalledWith(user.roles);
    expect(result).toEqual([]);
  });
});
