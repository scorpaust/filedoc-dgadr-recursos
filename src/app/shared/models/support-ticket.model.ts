export type TicketPriority = 'baixa' | 'normal' | 'alta' | 'bloqueante';
export type TicketStatus =
  'aberto' | 'em_tratamento' | 'a_aguardar_resposta' | 'resolvido' | 'encerrado';

export interface TicketMessage {
  readonly author: string;
  readonly authorRole?: string;
  readonly createdAt: string;
  readonly content: string;
  readonly internal: boolean;
}

export interface SupportTicket {
  readonly id: string;
  readonly reference: string;
  readonly subject: string;
  readonly description: string;
  readonly category: string;
  readonly priority: TicketPriority;
  readonly status: TicketStatus;
  readonly requester: string;
  readonly requesterRole: string;
  readonly assignee?: string;
  readonly relatedResourceId?: string;
  readonly createdAt: string;
  readonly messages: readonly TicketMessage[];
}
