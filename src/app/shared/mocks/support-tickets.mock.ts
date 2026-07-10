// Dados de demonstração — não representam pedidos de suporte reais de trabalhadores da DGADR.
import { SupportTicket } from '../models';

export const supportTickets: readonly SupportTicket[] = [
  {
    id: 'sup-1',
    reference: 'SUP-2026-041392',
    subject: 'Não consigo aceder ao Filedoc',
    description:
      'Desde ontem que não consigo iniciar sessão no Filedoc. Aparece uma mensagem de credenciais inválidas, mas a palavra-passe está correta.',
    category: 'Acesso ou permissões',
    priority: 'alta',
    status: 'aberto',
    requester: 'Marta Silva',
    requesterRole: 'Técnico Superior',
    createdAt: '2026-07-08T09:14:00',
    messages: [
      {
        author: 'Marta Silva',
        createdAt: '2026-07-08T09:14:00',
        content:
          'Desde ontem que não consigo iniciar sessão no Filedoc. Aparece uma mensagem de credenciais inválidas, mas a palavra-passe está correta.',
        internal: false,
      },
      {
        author: 'Carlos Vieira',
        authorRole: 'agente de suporte',
        createdAt: '2026-07-08T10:02:00',
        content:
          'Verificado no diretório institucional — a conta está ativa. Pode ser bloqueio por tentativas repetidas; a confirmar com a equipa de infraestrutura antes de responder.',
        internal: true,
      },
      {
        author: 'Carlos Vieira',
        authorRole: 'agente de suporte',
        createdAt: '2026-07-08T10:20:00',
        content:
          'Olá Marta, obrigado pelo aviso. Estamos a validar o acesso da sua conta e voltamos a contactá-la em breve com uma solução.',
        internal: false,
      },
    ],
  },
  {
    id: 'sup-2',
    reference: 'SUP-2026-041210',
    subject: 'Documento devolvido sem motivo aparente',
    description: 'Um ofício foi devolvido sem indicação clara do motivo.',
    category: 'Tramitação',
    priority: 'normal',
    status: 'em_tratamento',
    requester: 'Marta Silva',
    requesterRole: 'Técnico Superior',
    assignee: 'Carlos Vieira',
    relatedResourceId: 'res-3',
    createdAt: '2026-07-05T14:30:00',
    messages: [],
  },
  {
    id: 'sup-3',
    reference: 'SUP-2026-040998',
    subject: 'Erro ao carregar anexo de grandes dimensões',
    description: 'O carregamento de um anexo falha sempre que o ficheiro ultrapassa os 20 MB.',
    category: 'Erro técnico',
    priority: 'bloqueante',
    status: 'a_aguardar_resposta',
    requester: 'João Antunes',
    requesterRole: 'Chefe de Divisão',
    assignee: 'Carlos Vieira',
    createdAt: '2026-07-01T11:00:00',
    messages: [],
  },
  {
    id: 'sup-4',
    reference: 'SUP-2026-040711',
    subject: 'Como arquivar um processo concluído',
    description: 'Dúvida sobre o procedimento correto para arquivar um processo já concluído.',
    category: 'Pesquisa ou arquivo',
    priority: 'baixa',
    status: 'resolvido',
    requester: 'Paulo Matos',
    requesterRole: 'Assistente Operacional',
    assignee: 'Carlos Vieira',
    relatedResourceId: 'res-4',
    createdAt: '2026-06-20T16:45:00',
    messages: [],
  },
];
