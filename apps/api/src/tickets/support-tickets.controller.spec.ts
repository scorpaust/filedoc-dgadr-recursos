import { Role } from '@prisma/client';
import type { CurrentUserPayload } from '../auth/auth.types';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ListSupportTicketsQueryDto } from './dto/list-support-tickets-query.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { SupportTicketsController } from './support-tickets.controller';
import { TicketsService } from './tickets.service';

const agent: CurrentUserPayload = {
  id: 'agent-1',
  name: 'Carlos Nunes',
  email: 'carlos.nunes@dgadr.gov.pt',
  roles: [Role.SUPPORT_AGENT],
};

describe('SupportTicketsController', () => {
  let controller: SupportTicketsController;
  let service: {
    listForAgents: jest.Mock;
    listAssignableAgents: jest.Mock;
    getForAgent: jest.Mock;
    update: jest.Mock;
    addAgentMessage: jest.Mock;
    addInternalNote: jest.Mock;
    assign: jest.Mock;
    resolveForAgent: jest.Mock;
    closeForAgent: jest.Mock;
  };

  beforeEach(() => {
    service = {
      listForAgents: jest.fn(),
      listAssignableAgents: jest.fn(),
      getForAgent: jest.fn(),
      update: jest.fn(),
      addAgentMessage: jest.fn(),
      addInternalNote: jest.fn(),
      assign: jest.fn(),
      resolveForAgent: jest.fn(),
      closeForAgent: jest.fn(),
    };
    controller = new SupportTicketsController(
      service as unknown as TicketsService,
    );
  });

  it('list delega no serviço com os parâmetros de pesquisa e o agente autenticado', async () => {
    const query = new ListSupportTicketsQueryDto();
    service.listForAgents.mockResolvedValue([]);

    await controller.list(query, agent);

    expect(service.listForAgents).toHaveBeenCalledWith(query, agent);
  });

  it('listAgents delega no serviço sem parâmetros', async () => {
    service.listAssignableAgents.mockResolvedValue([
      { id: 'agent-2', name: 'Sofia Ramos' },
    ]);

    const result = await controller.listAgents();

    expect(service.listAssignableAgents).toHaveBeenCalledWith();
    expect(result).toEqual([{ id: 'agent-2', name: 'Sofia Ramos' }]);
  });

  it('getById delega no serviço com o id do pedido e o agente autenticado', async () => {
    service.getForAgent.mockResolvedValue({ id: 'ticket-1' });

    await controller.getById('ticket-1', agent);

    expect(service.getForAgent).toHaveBeenCalledWith('ticket-1', agent);
  });

  it('update delega no serviço com o id do pedido, o corpo e o agente autenticado', async () => {
    const dto = new UpdateTicketDto();
    service.update.mockResolvedValue({ id: 'ticket-1' });

    await controller.update('ticket-1', dto, agent);

    expect(service.update).toHaveBeenCalledWith('ticket-1', dto, agent);
  });

  it('addMessage delega no serviço criando uma resposta pública', async () => {
    const dto = new CreateMessageDto();
    service.addAgentMessage.mockResolvedValue({ id: 'msg-1' });

    await controller.addMessage('ticket-1', dto, agent);

    expect(service.addAgentMessage).toHaveBeenCalledWith(
      'ticket-1',
      agent,
      dto,
    );
  });

  it('addInternalNote delega no serviço criando uma nota interna', async () => {
    const dto = new CreateMessageDto();
    service.addInternalNote.mockResolvedValue({ id: 'msg-1', internal: true });

    await controller.addInternalNote('ticket-1', dto, agent);

    expect(service.addInternalNote).toHaveBeenCalledWith(
      'ticket-1',
      agent,
      dto,
    );
  });

  it('assign delega no serviço com o id do pedido, o corpo e o agente autenticado', async () => {
    const dto = new AssignTicketDto();
    service.assign.mockResolvedValue({ id: 'ticket-1' });

    await controller.assign('ticket-1', dto, agent);

    expect(service.assign).toHaveBeenCalledWith('ticket-1', dto, agent);
  });

  it('resolve delega no serviço com o id do pedido e o agente autenticado', async () => {
    service.resolveForAgent.mockResolvedValue({
      id: 'ticket-1',
      status: 'RESOLVED',
    });

    await controller.resolve('ticket-1', agent);

    expect(service.resolveForAgent).toHaveBeenCalledWith('ticket-1', agent);
  });

  it('close delega no serviço com o id do pedido e o agente autenticado', async () => {
    service.closeForAgent.mockResolvedValue({
      id: 'ticket-1',
      status: 'CLOSED',
    });

    await controller.close('ticket-1', agent);

    expect(service.closeForAgent).toHaveBeenCalledWith('ticket-1', agent);
  });
});
