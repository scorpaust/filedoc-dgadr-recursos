import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
} from '../tickets.types';
import type {
  TicketCategoryLabel,
  TicketPriorityLabel,
} from '../tickets.types';

const MAX_SUBJECT_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_SUBJECT_LENGTH)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_DESCRIPTION_LENGTH)
  description!: string;

  @IsIn(TICKET_CATEGORY_LABELS)
  category!: TicketCategoryLabel;

  @IsIn(TICKET_PRIORITY_LABELS)
  priority!: TicketPriorityLabel;

  // Nunca confiar num `requesterId` vindo do corpo — associado sempre à sessão
  // (coding-standards.md — "não confiar em identificadores fornecidos pelo cliente").
  @IsOptional()
  @IsString()
  relatedResourceId?: string;
}
