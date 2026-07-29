import {
  MessageVisibility,
  Prisma,
  Role,
  TicketCategory,
  TicketPriority,
} from '@prisma/client';
import { CreateUploadUrlResult } from '../storage/storage.types';

/**
 * Rótulos em português consumidos pelo frontend (`shared/models/support-ticket.model.ts`,
 * `TICKET_CATEGORIES`) — a API aceita e devolve estes rótulos, nunca os valores internos do
 * Prisma, mantendo a API e a UI desacopladas do nome exato do enum (coding-standards.md —
 * "não expor diretamente tipos internos do Prisma na interface do utilizador").
 */
export const TICKET_CATEGORY_LABELS = [
  'Acesso ou permissões',
  'Criação e registo',
  'Tramitação',
  'Assinatura',
  'Pesquisa ou arquivo',
  'Erro técnico',
  'Outra questão',
] as const;
export type TicketCategoryLabel = (typeof TICKET_CATEGORY_LABELS)[number];

export const TICKET_PRIORITY_LABELS = [
  'baixa',
  'normal',
  'alta',
  'bloqueante',
] as const;
export type TicketPriorityLabel = (typeof TICKET_PRIORITY_LABELS)[number];

export const CATEGORY_LABEL_TO_PRISMA: Record<
  TicketCategoryLabel,
  TicketCategory
> = {
  'Acesso ou permissões': TicketCategory.ACCESS_PERMISSIONS,
  'Criação e registo': TicketCategory.REGISTRATION,
  Tramitação: TicketCategory.ROUTING,
  Assinatura: TicketCategory.SIGNATURE,
  'Pesquisa ou arquivo': TicketCategory.SEARCH_ARCHIVE,
  'Erro técnico': TicketCategory.TECHNICAL_ERROR,
  'Outra questão': TicketCategory.OTHER,
};

export const CATEGORY_TO_LABEL: Record<TicketCategory, TicketCategoryLabel> = {
  ACCESS_PERMISSIONS: 'Acesso ou permissões',
  REGISTRATION: 'Criação e registo',
  ROUTING: 'Tramitação',
  SIGNATURE: 'Assinatura',
  SEARCH_ARCHIVE: 'Pesquisa ou arquivo',
  TECHNICAL_ERROR: 'Erro técnico',
  OTHER: 'Outra questão',
};

export const PRIORITY_LABEL_TO_PRISMA: Record<
  TicketPriorityLabel,
  TicketPriority
> = {
  baixa: TicketPriority.LOW,
  normal: TicketPriority.NORMAL,
  alta: TicketPriority.HIGH,
  bloqueante: TicketPriority.BLOCKING,
};

export const PRIORITY_TO_LABEL: Record<TicketPriority, TicketPriorityLabel> = {
  LOW: 'baixa',
  NORMAL: 'normal',
  HIGH: 'alta',
  BLOCKING: 'bloqueante',
};

/** Mesmos rótulos de `USER_ROLE_LABELS` (frontend, `shared/models/app-user.model.ts`). */
const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: 'Trabalhador',
  CONTENT_EDITOR: 'Editor de conteúdos',
  SUPPORT_AGENT: 'Agente de suporte',
  ADMIN: 'Administrador',
};

export function formatRoleLabels(roles: readonly Role[]): string {
  return roles.map((role) => ROLE_LABELS[role]).join(' + ');
}

/** `select`/`include` mínimos para listar/detalhar um pedido sem N+1. Nunca inclui notas
 * internas (`visibility: INTERNAL`) — o trabalhador nunca deve poder obtê-las através da
 * manipulação de pedidos HTTP (project-spec.md, secção I). */
export const TICKET_INCLUDE = {
  requester: { include: { roles: true } },
  messages: {
    where: { visibility: MessageVisibility.PUBLIC },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { include: { roles: true } },
      attachments: true,
    },
  },
} satisfies Prisma.SupportTicketInclude;

export type TicketWithRelations = Prisma.SupportTicketGetPayload<{
  include: typeof TICKET_INCLUDE;
}>;

export interface TicketAttachmentResponse {
  readonly id: string;
  readonly fileName: string;
}

/** `authorRole` só é preenchido para mensagens de um autor que não seja o próprio
 * solicitante (ex. um agente) — mensagens do próprio trabalhador não mostram função,
 * tal como já acontecia em `SupportTicketMockService` (via de UI, Fase 6). */
export interface TicketMessageResponse {
  readonly id: string;
  readonly author: string;
  readonly authorRole?: string;
  readonly createdAt: string;
  readonly content: string;
  readonly internal: false;
  readonly attachments?: readonly TicketAttachmentResponse[];
}

/** Forma devolvida ao cliente — alinhada com `SupportTicket` do frontend
 * (`shared/models/support-ticket.model.ts`). */
export interface TicketResponse {
  readonly id: string;
  readonly reference: string;
  readonly subject: string;
  readonly description: string;
  readonly category: TicketCategoryLabel;
  readonly priority: TicketPriorityLabel;
  readonly status: string;
  readonly requesterId: string;
  readonly requester: string;
  readonly requesterRole: string;
  readonly assigneeId?: string;
  readonly relatedResourceId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly resolvedAt?: string;
  readonly closedAt?: string;
  readonly messages: readonly TicketMessageResponse[];
}

/** Resposta de `POST /tickets/mine/:id/attachments` — a forma exata depende da fase
 * pedida pelo cliente (`init` devolve instruções de carregamento; `confirm` devolve o
 * anexo já associado à mensagem). */
export type CreateAttachmentResult =
  CreateUploadUrlResult | TicketAttachmentResponse;
