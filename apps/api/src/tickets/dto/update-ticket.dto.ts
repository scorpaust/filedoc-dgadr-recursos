import { TicketStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
} from '../tickets.types';
import type {
  TicketCategoryLabel,
  TicketPriorityLabel,
} from '../tickets.types';

// Todos os campos são opcionais e independentes — um pedido só altera os campos
// enviados, permitindo ao cliente enviar uma única alteração de cada vez (categoria,
// prioridade, estado ou recurso associado), tal como já fazia `SupportTicketMockService`
// (via de UI, Fase 7) através de métodos distintos sobre o mesmo pedido.
export class UpdateTicketDto {
  @IsOptional()
  @IsIn(TICKET_CATEGORY_LABELS)
  category?: TicketCategoryLabel;

  @IsOptional()
  @IsIn(TICKET_PRIORITY_LABELS)
  priority?: TicketPriorityLabel;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsString()
  relatedResourceId?: string;
}
