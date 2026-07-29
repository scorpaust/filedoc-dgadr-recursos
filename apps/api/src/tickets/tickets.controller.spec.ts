import { Role } from '@prisma/client';
import type { CurrentUserPayload } from '../auth/auth.types';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

const user: CurrentUserPayload = {
  id: 'user-1',
  name: 'Marta Silva',
  email: 'marta.silva@dgadr.gov.pt',
  roles: [Role.EMPLOYEE],
};

describe('TicketsController', () => {
  let controller: TicketsController;
  let service: {
    create: jest.Mock;
    listMine: jest.Mock;
    getMineById: jest.Mock;
    addMessage: jest.Mock;
    createAttachment: jest.Mock;
    confirmResolution: jest.Mock;
  };

  beforeEach(() => {
    service = {
      create: jest.fn(),
      listMine: jest.fn(),
      getMineById: jest.fn(),
      addMessage: jest.fn(),
      createAttachment: jest.fn(),
      confirmResolution: jest.fn(),
    };
    controller = new TicketsController(service as unknown as TicketsService);
  });

  it('create delega no serviço com o utilizador autenticado como solicitante', async () => {
    const dto = new CreateTicketDto();
    service.create.mockResolvedValue({ id: 'ticket-1' });

    const result = await controller.create(dto, user);

    expect(service.create).toHaveBeenCalledWith(dto, user.id);
    expect(result).toEqual({ id: 'ticket-1' });
  });

  it('listMine delega no serviço com o id do utilizador autenticado', async () => {
    service.listMine.mockResolvedValue([]);

    await controller.listMine(user);

    expect(service.listMine).toHaveBeenCalledWith(user.id);
  });

  it('getMineById delega no serviço com o id do pedido e o id do utilizador autenticado', async () => {
    service.getMineById.mockResolvedValue({ id: 'ticket-1' });

    await controller.getMineById('ticket-1', user);

    expect(service.getMineById).toHaveBeenCalledWith('ticket-1', user.id);
  });

  it('addMessage delega no serviço com o id do pedido, o autor e o corpo do pedido', async () => {
    const dto = new CreateMessageDto();
    service.addMessage.mockResolvedValue({ id: 'msg-1' });

    await controller.addMessage('ticket-1', dto, user);

    expect(service.addMessage).toHaveBeenCalledWith('ticket-1', user.id, dto);
  });

  it('createAttachment delega no serviço com o id do pedido, o autor e o corpo do pedido', async () => {
    const dto = new CreateAttachmentDto();
    service.createAttachment.mockResolvedValue({ mode: 'single' });

    await controller.createAttachment('ticket-1', dto, user);

    expect(service.createAttachment).toHaveBeenCalledWith(
      'ticket-1',
      user.id,
      dto,
    );
  });

  it('confirmResolution delega no serviço com o id do pedido e o utilizador autenticado', async () => {
    service.confirmResolution.mockResolvedValue({
      id: 'ticket-1',
      status: 'CLOSED',
    });

    await controller.confirmResolution('ticket-1', user);

    expect(service.confirmResolution).toHaveBeenCalledWith('ticket-1', user.id);
  });
});
