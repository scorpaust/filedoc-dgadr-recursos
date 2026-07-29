import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/auth.types';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketsService } from './tickets.service';
import {
  CreateAttachmentResult,
  TicketMessageResponse,
  TicketResponse,
} from './tickets.types';

// Todas as rotas exigem sessão (`AuthGuard`); a autorização por propriedade (só os
// próprios pedidos) é sempre decidida em `TicketsService`, nunca aqui — o `requesterId`
// vem sempre do utilizador autenticado, nunca do corpo do pedido.
@Controller('tickets')
@UseGuards(AuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<TicketResponse> {
    return this.ticketsService.create(dto, user.id);
  }

  @Get('mine')
  listMine(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<readonly TicketResponse[]> {
    return this.ticketsService.listMine(user.id);
  }

  @Get('mine/:id')
  getMineById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<TicketResponse> {
    return this.ticketsService.getMineById(id, user.id);
  }

  @Post('mine/:id/messages')
  addMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<TicketMessageResponse> {
    return this.ticketsService.addMessage(id, user.id, dto);
  }

  @Post('mine/:id/attachments')
  createAttachment(
    @Param('id') id: string,
    @Body() dto: CreateAttachmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<CreateAttachmentResult> {
    return this.ticketsService.createAttachment(id, user.id, dto);
  }

  @Post('mine/:id/confirm-resolution')
  confirmResolution(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<TicketResponse> {
    return this.ticketsService.confirmResolution(id, user.id);
  }
}
