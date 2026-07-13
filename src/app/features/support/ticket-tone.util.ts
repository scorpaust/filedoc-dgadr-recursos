import { TagTone } from '../../shared/components/tag/tag.component';
import { TicketPriority, TicketStatus } from '../../shared/models';

// Mapeamento de tom partilhado entre os ecrãs de suporte (lista e detalhe), para que
// a mesma prioridade/estado use sempre a mesma cor em toda a aplicação.
export const TICKET_PRIORITY_TONES: Record<TicketPriority, TagTone> = {
  baixa: 'neutral',
  normal: 'info',
  alta: 'warning',
  bloqueante: 'danger',
};

export const TICKET_STATUS_TONES: Record<TicketStatus, TagTone> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  WAITING_FOR_USER: 'plum',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};
