import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Audit } from '../audit/audit.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/auth.types';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ListSupportTicketsQueryDto } from './dto/list-support-tickets-query.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketsService } from './tickets.service';
import {
  SupportAgentResponse,
  SupportTicketMessageResponse,
  SupportTicketResponse,
} from './tickets.types';

// Vista de agente (fase-6-integracao-gestao-suporte.md) — endpoints distintos dos de
// `TicketsController` (`/tickets/mine/*`), nunca partilhados nem condicionais: um
// trabalhador que manipule diretamente o pedido HTTP é sempre rejeitado pelo `RolesGuard`,
// antes de qualquer lógica do serviço correr.
@Controller('support/tickets')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SUPPORT_AGENT, Role.ADMIN)
export class SupportTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  list(
    @Query() query: ListSupportTicketsQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<readonly SupportTicketResponse[]> {
    return this.ticketsService.listForAgents(query, user);
  }

  // Registada antes de `:id` (mesma ordem de rotas já usada em `GET /resources/management`,
  // fase-7-integracao-gestao-conteudos.md) — caso contrário "agents" seria interpretado como
  // um `:id`.
  @Get('agents')
  listAgents(): Promise<readonly SupportAgentResponse[]> {
    return this.ticketsService.listAssignableAgents();
  }

  @Get(':id')
  getById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SupportTicketResponse> {
    return this.ticketsService.getForAgent(id, user);
  }

  @Patch(':id')
  @Audit('ticket.update', 'ticket', {
    metadataKeys: ['category', 'priority', 'status', 'relatedResourceId'],
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SupportTicketResponse> {
    return this.ticketsService.update(id, dto, user);
  }

  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SupportTicketMessageResponse> {
    return this.ticketsService.addAgentMessage(id, user, dto);
  }

  @Post(':id/internal-notes')
  addInternalNote(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SupportTicketMessageResponse> {
    return this.ticketsService.addInternalNote(id, user, dto);
  }

  @Post(':id/assign')
  @Audit('ticket.assign', 'ticket', { metadataKeys: ['agentId'] })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SupportTicketResponse> {
    return this.ticketsService.assign(id, dto, user);
  }

  @Post(':id/resolve')
  @Audit('ticket.resolve', 'ticket')
  resolve(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SupportTicketResponse> {
    return this.ticketsService.resolveForAgent(id, user);
  }

  @Post(':id/close')
  @Audit('ticket.close', 'ticket')
  close(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SupportTicketResponse> {
    return this.ticketsService.closeForAgent(id, user);
  }
}
