import {
  MessageVisibility,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@prisma/client';

export interface TicketMessageSeedData {
  readonly id: string;
  /** `key` de `userSeedData`. */
  readonly authorKey: string;
  readonly content: string;
  readonly visibility: MessageVisibility;
  /** Data/hora local (sem fuso) — tratada como UTC pelo script de seed. */
  readonly createdAt: string;
}

export interface SupportTicketSeedData {
  readonly id: string;
  readonly reference: string;
  readonly subject: string;
  readonly description: string;
  readonly category: TicketCategory;
  readonly priority: TicketPriority;
  readonly status: TicketStatus;
  /** `key` de `userSeedData`. */
  readonly requesterKey: string;
  /** `key` de `userSeedData`, quando o pedido já foi assumido por um agente. */
  readonly assigneeKey?: string;
  /** `slug` de `resourceSeedData`, quando o pedido está relacionado com um recurso. */
  readonly relatedResourceSlug?: string;
  readonly createdAt: string;
  readonly resolvedAt?: string;
  readonly closedAt?: string;
  readonly messages: readonly TicketMessageSeedData[];
}

// Assunto, descrição, categoria, prioridade, estado e histórico de mensagens reutilizados
// tal e qual de `shared/mocks/support-tickets.mock.ts` (via de UI, Fase 6) para os 7
// primeiros pedidos (`seed-ticket-1` a `seed-ticket-7`). `seed-ticket-8` é novo nesta fase:
// cobre a categoria `OTHER` ("Outra questão"), a única das sete categorias de
// `project-spec.md` ainda sem exemplo no mock da via de UI, e demonstra o histórico
// completo exigido pela tarefa D (mensagem de criação, mensagem pública do trabalhador,
// nota interna do agente, resposta pública do agente, resolução e confirmação).
export const supportTicketSeedData: readonly SupportTicketSeedData[] = [
  {
    id: 'seed-ticket-1',
    reference: 'SUP-2026-041392',
    subject: 'Não consigo aceder ao Filedoc',
    description:
      'Desde ontem que não consigo iniciar sessão no Filedoc. Aparece uma mensagem de credenciais inválidas, mas a palavra-passe está correta.',
    category: TicketCategory.ACCESS_PERMISSIONS,
    priority: TicketPriority.HIGH,
    status: TicketStatus.OPEN,
    requesterKey: 'marta',
    createdAt: '2026-07-08T09:14:00',
    messages: [
      {
        id: 'seed-ticket-1-msg-1',
        authorKey: 'marta',
        content:
          'Desde ontem que não consigo iniciar sessão no Filedoc. Aparece uma mensagem de credenciais inválidas, mas a palavra-passe está correta.',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-07-08T09:14:00',
      },
    ],
  },
  {
    id: 'seed-ticket-2',
    reference: 'SUP-2026-041210',
    subject: 'Documento devolvido sem motivo aparente',
    description: 'Um ofício foi devolvido sem indicação clara do motivo.',
    category: TicketCategory.ROUTING,
    priority: TicketPriority.NORMAL,
    status: TicketStatus.IN_PROGRESS,
    requesterKey: 'marta',
    assigneeKey: 'carlos',
    relatedResourceSlug: 'corrigir-metadados-de-um-oficio',
    createdAt: '2026-07-05T14:30:00',
    messages: [
      {
        id: 'seed-ticket-2-msg-1',
        authorKey: 'marta',
        content: 'Um ofício foi devolvido sem indicação clara do motivo.',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-07-05T14:30:00',
      },
      {
        id: 'seed-ticket-2-msg-2',
        authorKey: 'carlos',
        content:
          'Olá Marta, estamos a analisar o processo em causa e voltamos em breve.',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-07-06T09:05:00',
      },
    ],
  },
  {
    id: 'seed-ticket-3',
    reference: 'SUP-2026-041055',
    subject: 'Preciso de confirmar um dado antes de continuar',
    description:
      'A equipa de suporte pediu mais informação sobre o processo em causa.',
    category: TicketCategory.SEARCH_ARCHIVE,
    priority: TicketPriority.NORMAL,
    status: TicketStatus.WAITING_FOR_USER,
    requesterKey: 'marta',
    assigneeKey: 'carlos',
    createdAt: '2026-07-03T10:00:00',
    messages: [
      {
        id: 'seed-ticket-3-msg-1',
        authorKey: 'marta',
        content: 'Não encontro o processo arquivado no separador correto.',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-07-03T10:00:00',
      },
      {
        id: 'seed-ticket-3-msg-2',
        authorKey: 'carlos',
        content:
          'Pode indicar o número do processo e a data aproximada de arquivo?',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-07-03T15:40:00',
      },
    ],
  },
  {
    id: 'seed-ticket-4',
    reference: 'SUP-2026-040998',
    subject: 'Como arquivar um processo concluído',
    description:
      'Dúvida sobre o procedimento correto para arquivar um processo já concluído.',
    category: TicketCategory.SEARCH_ARCHIVE,
    priority: TicketPriority.LOW,
    status: TicketStatus.RESOLVED,
    requesterKey: 'marta',
    assigneeKey: 'carlos',
    relatedResourceSlug: 'localizar-um-processo-arquivado',
    createdAt: '2026-06-20T16:45:00',
    resolvedAt: '2026-06-21T11:10:00',
    messages: [
      {
        id: 'seed-ticket-4-msg-1',
        authorKey: 'marta',
        content:
          'Dúvida sobre o procedimento correto para arquivar um processo já concluído.',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-06-20T16:45:00',
      },
      {
        id: 'seed-ticket-4-msg-2',
        authorKey: 'carlos',
        content:
          'Pode arquivar diretamente a partir do separador "Processo", opção "Arquivar". Fico a aguardar confirmação de que resolve a situação.',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-06-21T11:10:00',
      },
    ],
  },
  {
    id: 'seed-ticket-5',
    reference: 'SUP-2026-040711',
    subject: 'Erro ao carregar anexo de grandes dimensões',
    description:
      'O carregamento de um anexo falha sempre que o ficheiro ultrapassa os 20 MB.',
    category: TicketCategory.TECHNICAL_ERROR,
    priority: TicketPriority.BLOCKING,
    status: TicketStatus.CLOSED,
    requesterKey: 'marta',
    assigneeKey: 'carlos',
    createdAt: '2026-06-10T11:00:00',
    resolvedAt: '2026-06-11T17:20:00',
    closedAt: '2026-06-12T09:00:00',
    messages: [
      {
        id: 'seed-ticket-5-msg-1',
        authorKey: 'marta',
        content:
          'O carregamento de um anexo falha sempre que o ficheiro ultrapassa os 20 MB.',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-06-10T11:00:00',
      },
      {
        id: 'seed-ticket-5-msg-2',
        authorKey: 'carlos',
        content:
          'Foi corrigido um limite mal configurado. Pode confirmar se já consegue carregar o anexo?',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-06-11T17:20:00',
      },
      {
        id: 'seed-ticket-5-msg-3',
        authorKey: 'marta',
        content:
          'Confirmo, já consigo carregar o anexo sem problemas. Obrigada.',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-06-12T09:00:00',
      },
    ],
  },
  // Pedidos de outros utilizadores — nunca devem ficar visíveis a Marta Silva na consulta
  // "os meus pedidos" (ver testes de integração da tarefa E).
  {
    id: 'seed-ticket-6',
    reference: 'SUP-2026-040512',
    subject: 'Dúvida sobre assinatura digital',
    description:
      'Não é claro em que passo do processo devo assinar digitalmente o documento.',
    category: TicketCategory.SIGNATURE,
    priority: TicketPriority.NORMAL,
    status: TicketStatus.OPEN,
    requesterKey: 'joao',
    createdAt: '2026-07-01T09:00:00',
    messages: [
      {
        id: 'seed-ticket-6-msg-1',
        authorKey: 'joao',
        content:
          'Não é claro em que passo do processo devo assinar digitalmente o documento.',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-07-01T09:00:00',
      },
    ],
  },
  {
    id: 'seed-ticket-7',
    reference: 'SUP-2026-040388',
    subject: 'Registo de novo processo sem categoria correta',
    description:
      'Ao registar um novo processo não encontro a categoria pretendida na lista.',
    category: TicketCategory.REGISTRATION,
    priority: TicketPriority.LOW,
    status: TicketStatus.IN_PROGRESS,
    requesterKey: 'paulo',
    assigneeKey: 'carlos',
    createdAt: '2026-06-25T08:30:00',
    messages: [
      {
        id: 'seed-ticket-7-msg-1',
        authorKey: 'paulo',
        content:
          'Ao registar um novo processo não encontro a categoria pretendida na lista.',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-06-25T08:30:00',
      },
    ],
  },
  {
    id: 'seed-ticket-8',
    reference: 'SUP-2026-042117',
    subject: 'Dúvida sobre a categoria correta para um pedido',
    description:
      'Não sei em que categoria devo enquadrar uma dúvida que não é sobre um procedimento específico.',
    category: TicketCategory.OTHER,
    priority: TicketPriority.NORMAL,
    status: TicketStatus.CLOSED,
    requesterKey: 'marta',
    assigneeKey: 'sofia',
    createdAt: '2026-05-28T10:00:00',
    resolvedAt: '2026-05-29T11:30:00',
    closedAt: '2026-05-29T15:00:00',
    messages: [
      {
        id: 'seed-ticket-8-msg-1',
        authorKey: 'marta',
        content:
          'Não sei em que categoria devo enquadrar uma dúvida que não é sobre um procedimento específico.',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-05-28T10:00:00',
      },
      {
        id: 'seed-ticket-8-msg-2',
        authorKey: 'marta',
        content:
          'A dúvida em concreto é sobre como sugerir uma melhoria a um recurso já publicado.',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-05-28T10:05:00',
      },
      {
        id: 'seed-ticket-8-msg-3',
        authorKey: 'sofia',
        content:
          'Nota interna: confirmar com a equipa de conteúdos se já existe um procedimento formal para sugestões de melhoria antes de responder.',
        visibility: MessageVisibility.INTERNAL,
        createdAt: '2026-05-28T16:00:00',
      },
      {
        id: 'seed-ticket-8-msg-4',
        authorKey: 'sofia',
        content:
          'Pode usar a categoria "Outra questão" para este tipo de dúvida. Ficamos a aguardar a sua confirmação de que esclarece a situação.',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-05-29T11:30:00',
      },
      {
        id: 'seed-ticket-8-msg-5',
        authorKey: 'marta',
        content: 'Confirmo, ficou esclarecido. Obrigada.',
        visibility: MessageVisibility.PUBLIC,
        createdAt: '2026-05-29T15:00:00',
      },
    ],
  },
];
