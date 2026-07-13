export const TICKET_CATEGORIES = [
  'Acesso ou permissões',
  'Criação e registo',
  'Tramitação',
  'Assinatura',
  'Pesquisa ou arquivo',
  'Erro técnico',
  'Outra questão',
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export type TicketPriority = 'baixa' | 'normal' | 'alta' | 'bloqueante';

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  bloqueante: 'Bloqueante',
};

// project-spec.md, secção H: aviso obrigatório sempre que a prioridade "Bloqueante" é selecionada.
export const BLOCKING_PRIORITY_WARNING =
  'Utilize apenas quando o problema impedir totalmente a execução de uma tarefa urgente.';

// Valores internos alinhados com project-spec.md (secção H — "Estados internos correspondentes").
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED';

export const TICKET_STATUSES: readonly TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_USER',
  'RESOLVED',
  'CLOSED',
];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em tratamento',
  WAITING_FOR_USER: 'A aguardar resposta do utilizador',
  RESOLVED: 'Resolvido',
  CLOSED: 'Encerrado',
};

export interface TicketAttachment {
  readonly id: string;
  readonly fileName: string;
}

// "status-change" identifica entradas geradas automaticamente pelas operações de agente
// (Fase 7 — UI), com o mesmo formato de uma mensagem normal, para reutilização direta
// pelo `TicketTimelineComponent`.
export type TicketMessageKind = 'message' | 'status-change';

export interface TicketMessage {
  readonly id: string;
  readonly author: string;
  readonly authorRole?: string;
  readonly createdAt: string;
  readonly content: string;
  readonly internal: boolean;
  readonly kind?: TicketMessageKind;
  readonly attachments?: readonly TicketAttachment[];
}

export interface SupportTicket {
  readonly id: string;
  readonly reference: string;
  readonly subject: string;
  readonly description: string;
  readonly category: TicketCategory;
  readonly priority: TicketPriority;
  readonly status: TicketStatus;
  readonly requesterId: string;
  readonly requester: string;
  readonly requesterRole: string;
  readonly assigneeId?: string;
  readonly relatedResourceId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly resolvedAt?: string;
  readonly closedAt?: string;
  readonly messages: readonly TicketMessage[];
}
