import { Role } from '@prisma/client';
import type { CurrentUserPayload } from '../auth/auth.types';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { CreateTipDto } from './dto/create-tip.dto';
import { ReorderContentDto } from './dto/reorder-content.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { UpdateTipDto } from './dto/update-tip.dto';

const user: CurrentUserPayload = {
  id: 'user-1',
  name: 'Marta Silva',
  email: 'marta.silva@dgadr.gov.pt',
  roles: [Role.EMPLOYEE],
};

const editor: CurrentUserPayload = {
  id: 'user-3',
  name: 'João Antunes',
  email: 'joao.antunes@dgadr.gov.pt',
  roles: [Role.CONTENT_EDITOR],
};

describe('ContentController', () => {
  let controller: ContentController;
  let service: {
    listTips: jest.Mock;
    listFaqs: jest.Mock;
    listAllTips: jest.Mock;
    listAllFaqs: jest.Mock;
    createTip: jest.Mock;
    updateTip: jest.Mock;
    publishTip: jest.Mock;
    unpublishTip: jest.Mock;
    archiveTip: jest.Mock;
    restoreTip: jest.Mock;
    reorderTip: jest.Mock;
    createFaq: jest.Mock;
    updateFaq: jest.Mock;
    publishFaq: jest.Mock;
    unpublishFaq: jest.Mock;
    archiveFaq: jest.Mock;
    restoreFaq: jest.Mock;
    reorderFaq: jest.Mock;
  };

  beforeEach(() => {
    service = {
      listTips: jest.fn(),
      listFaqs: jest.fn(),
      listAllTips: jest.fn(),
      listAllFaqs: jest.fn(),
      createTip: jest.fn(),
      updateTip: jest.fn(),
      publishTip: jest.fn(),
      unpublishTip: jest.fn(),
      archiveTip: jest.fn(),
      restoreTip: jest.fn(),
      reorderTip: jest.fn(),
      createFaq: jest.fn(),
      updateFaq: jest.fn(),
      publishFaq: jest.fn(),
      unpublishFaq: jest.fn(),
      archiveFaq: jest.fn(),
      restoreFaq: jest.fn(),
      reorderFaq: jest.fn(),
    };
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

  it('listTipsForManagement / listFaqsForManagement delegam sem argumentos', async () => {
    service.listAllTips.mockResolvedValue([]);
    service.listAllFaqs.mockResolvedValue([]);

    await controller.listTipsForManagement();
    await controller.listFaqsForManagement();

    expect(service.listAllTips).toHaveBeenCalledWith();
    expect(service.listAllFaqs).toHaveBeenCalledWith();
  });

  it('createTip / updateTip delegam com o corpo e o utilizador autenticado', async () => {
    const createDto = new CreateTipDto();
    const updateDto = new UpdateTipDto();
    service.createTip.mockResolvedValue({});
    service.updateTip.mockResolvedValue({});

    await controller.createTip(createDto, editor);
    await controller.updateTip('tip-1', updateDto, editor);

    expect(service.createTip).toHaveBeenCalledWith(createDto, editor);
    expect(service.updateTip).toHaveBeenCalledWith('tip-1', updateDto, editor);
  });

  it.each(['publishTip', 'unpublishTip', 'archiveTip', 'restoreTip'] as const)(
    '%s delega no serviço com o id e o utilizador autenticado',
    async (method) => {
      service[method].mockResolvedValue({});
      await controller[method]('tip-1', editor);
      expect(service[method]).toHaveBeenCalledWith('tip-1', editor);
    },
  );

  it('reorderTip delega no serviço com o id e a direção', async () => {
    const dto = Object.assign(new ReorderContentDto(), {
      id: 'tip-1',
      direction: 'up',
    });
    service.reorderTip.mockResolvedValue([]);

    await controller.reorderTip(dto);

    expect(service.reorderTip).toHaveBeenCalledWith('tip-1', 'up');
  });

  it('createFaq / updateFaq delegam com o corpo e o utilizador autenticado', async () => {
    const createDto = new CreateFaqDto();
    const updateDto = new UpdateFaqDto();
    service.createFaq.mockResolvedValue({});
    service.updateFaq.mockResolvedValue({});

    await controller.createFaq(createDto, editor);
    await controller.updateFaq('faq-1', updateDto, editor);

    expect(service.createFaq).toHaveBeenCalledWith(createDto, editor);
    expect(service.updateFaq).toHaveBeenCalledWith('faq-1', updateDto, editor);
  });

  it.each(['publishFaq', 'unpublishFaq', 'archiveFaq', 'restoreFaq'] as const)(
    '%s delega no serviço com o id e o utilizador autenticado',
    async (method) => {
      service[method].mockResolvedValue({});
      await controller[method]('faq-1', editor);
      expect(service[method]).toHaveBeenCalledWith('faq-1', editor);
    },
  );

  it('reorderFaq delega no serviço com o id e a direção', async () => {
    const dto = Object.assign(new ReorderContentDto(), {
      id: 'faq-1',
      direction: 'down',
    });
    service.reorderFaq.mockResolvedValue([]);

    await controller.reorderFaq(dto);

    expect(service.reorderFaq).toHaveBeenCalledWith('faq-1', 'down');
  });
});
