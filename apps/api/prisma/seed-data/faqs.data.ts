import { ContentStatus } from '@prisma/client';

export interface FaqSeedData {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly category?: string;
  readonly status: ContentStatus;
  readonly sortOrder: number;
  /** Só definido para perguntas `PUBLISHED` (nunca para `DRAFT`). */
  readonly publishedAt?: string;
  /** `key` de `userSeedData` — autor de criação e de última atualização. */
  readonly authorKey: string;
}

// `question`/`answer`/`category` reutilizados tal e qual de `shared/mocks/faqs.mock.ts`
// (via de UI, Fase 5), que já cobre os quatro exemplos de `project-spec.md` (secção G),
// mais duas perguntas adicionais. `seed-faq-7` é novo nesta fase, para cobrir uma terceira
// categoria distinta, conforme a tarefa C ("mais alguns adicionais para cobrir categorias
// diferentes"); `seed-faq-6` mantém-se sem categoria, para validar o agrupamento "Outras
// perguntas" também com dados reais.
export const faqSeedData: readonly FaqSeedData[] = [
  {
    id: 'seed-faq-1',
    question: 'Não consigo aceder ao Filedoc. O que devo verificar?',
    answer:
      'Confirme a ligação à rede institucional, as credenciais utilizadas e se a conta se encontra ativa. Caso o problema persista, registe um pedido de suporte na categoria "Acesso ou permissões".',
    category: 'Acesso e permissões',
    status: ContentStatus.PUBLISHED,
    sortOrder: 1,
    publishedAt: '2026-05-01',
    authorKey: 'joao',
  },
  {
    id: 'seed-faq-2',
    question: 'Como posso recuperar a palavra-passe?',
    answer:
      'Utilize a opção de alteração de palavra-passe disponível na aplicação. Se não conseguir iniciar sessão, contacte o suporte para confirmar a sua identidade.',
    category: 'Acesso e permissões',
    status: ContentStatus.PUBLISHED,
    sortOrder: 2,
    publishedAt: '2026-05-01',
    authorKey: 'joao',
  },
  {
    id: 'seed-faq-3',
    question: 'Um documento foi devolvido. Como devo proceder?',
    answer:
      'Consulte a nota de devolução, corrija os campos indicados e volte a submeter o documento.',
    category: 'Documentos e processos',
    status: ContentStatus.PUBLISHED,
    sortOrder: 3,
    publishedAt: '2026-05-05',
    authorKey: 'ana',
  },
  {
    id: 'seed-faq-4',
    question: 'Como posso localizar um processo antigo?',
    answer:
      'Utilize a pesquisa avançada no catálogo, filtrando por fluxo, tipo de documento ou período.',
    category: 'Documentos e processos',
    status: ContentStatus.PUBLISHED,
    sortOrder: 4,
    publishedAt: '2026-05-05',
    authorKey: 'ana',
  },
  {
    id: 'seed-faq-5',
    question:
      'Um procedimento não está descrito em nenhum guia. Onde posso confirmar o passo a seguir?',
    answer:
      'Esta situação ainda não tem um procedimento institucional confirmado nesta aplicação. Registe um pedido de suporte para que a equipa responsável possa esclarecer o caso.',
    category: 'Documentos e processos',
    status: ContentStatus.DRAFT,
    sortOrder: 5,
    authorKey: 'joao',
  },
  {
    id: 'seed-faq-6',
    question: 'Quando devo abrir um pedido de suporte?',
    answer:
      'Sempre que não conseguir resolver a situação através dos guias, vídeos ou dicas disponíveis.',
    status: ContentStatus.PUBLISHED,
    sortOrder: 6,
    publishedAt: '2026-05-10',
    authorKey: 'ana',
  },
  {
    id: 'seed-faq-7',
    question:
      'Como posso sugerir uma melhoria ou reportar um erro num recurso publicado?',
    answer:
      'Utilize a opção de suporte para reportar o erro ou sugestão, indicando o recurso em causa sempre que possível. A equipa responsável avalia o pedido e atualiza o recurso quando aplicável.',
    category: 'Recursos formativos',
    status: ContentStatus.PUBLISHED,
    sortOrder: 7,
    publishedAt: '2026-06-20',
    authorKey: 'joao',
  },
];
