import { TicketCategory, TicketPriority } from '../../../shared/models';

export interface CreateTicketInput {
  readonly subject: string;
  readonly description: string;
  readonly category: TicketCategory;
  readonly priority: TicketPriority;
  readonly relatedResourceId?: string;
}
