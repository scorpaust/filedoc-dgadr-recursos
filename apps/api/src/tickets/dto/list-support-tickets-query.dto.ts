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

export class ListSupportTicketsQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsIn(TICKET_CATEGORY_LABELS)
  category?: TicketCategoryLabel;

  @IsOptional()
  @IsIn(TICKET_PRIORITY_LABELS)
  priority?: TicketPriorityLabel;

  @IsOptional()
  @IsString()
  q?: string;
}
