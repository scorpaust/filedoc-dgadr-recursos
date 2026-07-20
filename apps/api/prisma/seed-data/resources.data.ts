import { Difficulty, ResourceStatus, ResourceType } from '@prisma/client';

export interface ResourceSeedData {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly resourceType: ResourceType;
  readonly difficulty: Difficulty;
  readonly workflowName: string;
  readonly documentTypeName: string;
  /** Subconjunto das etiquetas do recurso original que também existem em `tagSeedData`. */
  readonly tagNames: readonly string[];
  readonly status: ResourceStatus;
  /** Só definido para recursos `PUBLISHED`/`ARCHIVED` (nunca para `DRAFT`). */
  readonly publishedAt?: string;
  /** `key` de `userSeedData` — autor de criação e de última atualização. */
  readonly authorKey: string;
}

const DIFFICULTY: Record<'iniciacao' | 'intermedia' | 'avancada', Difficulty> =
  {
    iniciacao: Difficulty.INICIACAO,
    intermedia: Difficulty.INTERMEDIA,
    avancada: Difficulty.AVANCADA,
  };

const STATUS: Record<'draft' | 'published' | 'archived', ResourceStatus> = {
  draft: ResourceStatus.DRAFT,
  published: ResourceStatus.PUBLISHED,
  archived: ResourceStatus.ARCHIVED,
};

interface RawResourceRow {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly kind: 'video' | 'guide';
  readonly difficulty: keyof typeof DIFFICULTY;
  readonly workflowName: string;
  readonly documentTypeName: string;
  readonly tagNames: readonly string[];
  readonly status: keyof typeof STATUS;
  readonly publishedAt?: string;
  readonly authorKey: 'joao' | 'ana';
}

// Textos (título, resumo, descrição), fluxo, tipo de documento, dificuldade e estado
// editorial reutilizados tal e qual de `shared/mocks/resources.mock.ts` (via de UI,
// Fase 3), conforme exigido pela tarefa C da especificação. `tagNames` é o subconjunto
// das etiquetas originais do mock que também existe em `tagSeedData` (ver
// `docs/decisoes-seeds.md`). O autor (`authorKey`) foi reatribuído a utilizadores com
// função de edição de conteúdo (`joao`/`ana`, alternados) — o mock de UI não validava o
// campo `author` contra a função do utilizador, pelo que não é reutilizável tal e qual
// aqui, onde `createdById`/`updatedById` são chaves estrangeiras reais.
const RAW_RESOURCES: readonly RawResourceRow[] = [
  {
    slug: 'criar-um-novo-processo-de-correspondencia',
    title: 'Criar um novo processo de correspondência',
    summary: 'Como registar corretamente um processo desde o primeiro passo.',
    description:
      'Guia passo a passo para registar um novo processo de correspondência, desde a criação até à validação inicial.',
    kind: 'video',
    difficulty: 'iniciacao',
    workflowName: 'Criação e registo',
    documentTypeName: 'Correspondência',
    tagNames: ['registo', 'correspondência'],
    status: 'published',
    publishedAt: '2026-06-30',
    authorKey: 'joao',
  },
  {
    slug: 'assinar-um-despacho-digitalmente',
    title: 'Assinar um despacho digitalmente',
    summary: 'Passos para validar e assinar despachos no Filedoc.',
    description:
      'Explica como rever, validar e assinar digitalmente um despacho antes do envio, incluindo a verificação da assinatura.',
    kind: 'guide',
    difficulty: 'intermedia',
    workflowName: 'Assinatura',
    documentTypeName: 'Despacho',
    tagNames: ['assinatura'],
    status: 'published',
    publishedAt: '2026-06-25',
    authorKey: 'ana',
  },
  {
    slug: 'corrigir-metadados-de-um-oficio',
    title: 'Corrigir metadados de um ofício',
    summary: 'Como corrigir campos preenchidos incorretamente.',
    description:
      'Descreve o procedimento para corrigir metadados incorretos num ofício já registado, sem perder o histórico.',
    kind: 'guide',
    difficulty: 'intermedia',
    workflowName: 'Correções',
    documentTypeName: 'Ofício',
    tagNames: ['correção'],
    status: 'draft',
    authorKey: 'joao',
  },
  {
    slug: 'localizar-um-processo-arquivado',
    title: 'Localizar um processo arquivado',
    summary: 'Técnicas de pesquisa avançada para processos antigos.',
    description:
      'Mostra como usar os filtros de pesquisa avançada para localizar processos já arquivados.',
    kind: 'video',
    difficulty: 'avancada',
    workflowName: 'Pesquisa',
    documentTypeName: 'Processo',
    tagNames: ['pesquisa', 'arquivo'],
    status: 'archived',
    publishedAt: '2026-06-16',
    authorKey: 'ana',
  },
  {
    slug: 'tramitar-um-processo-entre-unidades',
    title: 'Tramitar um processo entre unidades',
    summary: 'Como encaminhar um processo para outra unidade orgânica.',
    description:
      'Explica o fluxo de tramitação de um processo entre unidades orgânicas, incluindo a confirmação de receção.',
    kind: 'video',
    difficulty: 'intermedia',
    workflowName: 'Tramitação',
    documentTypeName: 'Processo',
    tagNames: ['tramitação'],
    status: 'published',
    publishedAt: '2026-06-15',
    authorKey: 'joao',
  },
  {
    slug: 'anexar-documentos-a-um-oficio',
    title: 'Anexar documentos a um ofício',
    summary: 'Como associar anexos a um ofício antes do envio.',
    description:
      'Passo a passo para carregar e associar ficheiros anexos a um ofício antes da respetiva expedição.',
    kind: 'guide',
    difficulty: 'iniciacao',
    workflowName: 'Gestão documental',
    documentTypeName: 'Anexo',
    tagNames: ['anexos'],
    status: 'published',
    publishedAt: '2026-06-12',
    authorKey: 'ana',
  },
  {
    slug: 'registar-entrada-de-correspondencia-externa',
    title: 'Registar entrada de correspondência externa',
    summary: 'Como registar a chegada de correspondência de origem externa.',
    description:
      'Cobre o registo de entrada de correspondência externa, desde a receção física até ao registo eletrónico.',
    kind: 'video',
    difficulty: 'iniciacao',
    workflowName: 'Criação e registo',
    documentTypeName: 'Correspondência',
    tagNames: ['registo'],
    status: 'published',
    publishedAt: '2026-04-10',
    authorKey: 'joao',
  },
  {
    slug: 'preencher-um-formulario-de-informacao-interna',
    title: 'Preencher um formulário de informação interna',
    summary: 'Como preencher corretamente uma informação de serviço.',
    description:
      'Detalha os campos obrigatórios e as boas práticas para redigir uma informação interna clara e objetiva.',
    kind: 'guide',
    difficulty: 'iniciacao',
    workflowName: 'Criação e registo',
    documentTypeName: 'Informação',
    tagNames: [],
    status: 'published',
    publishedAt: '2026-04-14',
    authorKey: 'ana',
  },
  {
    slug: 'reencaminhar-correspondencia-para-outro-servico',
    title: 'Reencaminhar correspondência para outro serviço',
    summary: 'Como reencaminhar correspondência recebida por engano.',
    description:
      'Explica como identificar o serviço correto e reencaminhar correspondência recebida indevidamente.',
    kind: 'video',
    difficulty: 'intermedia',
    workflowName: 'Correspondência',
    documentTypeName: 'Correspondência',
    tagNames: ['correspondência'],
    status: 'published',
    publishedAt: '2026-04-20',
    authorKey: 'joao',
  },
  {
    slug: 'classificar-correspondencia-recebida',
    title: 'Classificar correspondência recebida',
    summary:
      'Como atribuir a classificação correta à correspondência recebida.',
    description:
      'Apresenta os critérios de classificação de correspondência recebida antes da respetiva distribuição.',
    kind: 'guide',
    difficulty: 'iniciacao',
    workflowName: 'Correspondência',
    documentTypeName: 'Diversos',
    tagNames: ['classificação', 'correspondência'],
    status: 'published',
    publishedAt: '2026-04-25',
    authorKey: 'ana',
  },
  {
    slug: 'tramitar-um-processo-urgente',
    title: 'Tramitar um processo urgente',
    summary: 'Como assinalar e acompanhar a tramitação de um processo urgente.',
    description:
      'Explica como marcar um processo como urgente e acompanhar o respetivo estado durante a tramitação.',
    kind: 'video',
    difficulty: 'avancada',
    workflowName: 'Tramitação',
    documentTypeName: 'Processo',
    tagNames: ['tramitação'],
    status: 'published',
    publishedAt: '2026-05-02',
    authorKey: 'joao',
  },
  {
    slug: 'devolver-um-processo-ao-remetente',
    title: 'Devolver um processo ao remetente',
    summary: 'Como devolver um processo com indicação do motivo.',
    description:
      'Cobre o procedimento para devolver um processo ao remetente original, com registo do motivo da devolução.',
    kind: 'guide',
    difficulty: 'intermedia',
    workflowName: 'Tramitação',
    documentTypeName: 'Processo',
    tagNames: ['tramitação'],
    status: 'draft',
    authorKey: 'ana',
  },
  {
    slug: 'assinar-um-oficio-em-lote',
    title: 'Assinar um ofício em lote',
    summary: 'Como assinar vários ofícios numa única operação.',
    description:
      'Explica como selecionar vários ofícios pendentes e assiná-los em lote, poupando tempo em processos repetitivos.',
    kind: 'guide',
    difficulty: 'avancada',
    workflowName: 'Assinatura',
    documentTypeName: 'Ofício',
    tagNames: ['assinatura'],
    status: 'published',
    publishedAt: '2026-05-10',
    authorKey: 'joao',
  },
  {
    slug: 'delegar-competencias-de-assinatura',
    title: 'Delegar competências de assinatura',
    summary: 'Como configurar uma delegação temporária de assinatura.',
    description:
      'Descreve como atribuir e revogar uma delegação temporária de competências de assinatura a outro colaborador.',
    kind: 'video',
    difficulty: 'avancada',
    workflowName: 'Assinatura',
    documentTypeName: 'Despacho',
    tagNames: ['assinatura'],
    status: 'draft',
    authorKey: 'ana',
  },
  {
    slug: 'pesquisar-processos-por-palavra-chave',
    title: 'Pesquisar processos por palavra-chave',
    summary: 'Como encontrar rapidamente um processo por palavra-chave.',
    description:
      'Explica como usar o campo de pesquisa geral para localizar processos a partir de palavras-chave do título ou resumo.',
    kind: 'guide',
    difficulty: 'iniciacao',
    workflowName: 'Pesquisa',
    documentTypeName: 'Processo',
    tagNames: ['pesquisa'],
    status: 'published',
    publishedAt: '2026-05-18',
    authorKey: 'joao',
  },
  {
    slug: 'usar-filtros-avancados-de-pesquisa',
    title: 'Usar filtros avançados de pesquisa',
    summary: 'Como combinar filtros para afinar os resultados de pesquisa.',
    description:
      'Mostra como combinar filtros de tipo, fluxo e dificuldade para obter resultados de pesquisa mais precisos.',
    kind: 'video',
    difficulty: 'intermedia',
    workflowName: 'Pesquisa',
    documentTypeName: 'Diversos',
    tagNames: [],
    status: 'published',
    publishedAt: '2026-05-20',
    authorKey: 'ana',
  },
  {
    slug: 'organizar-pastas-de-gestao-documental',
    title: 'Organizar pastas de gestão documental',
    summary: 'Como estruturar pastas para facilitar a gestão documental.',
    description:
      'Apresenta boas práticas para organizar pastas e subpastas na gestão documental do dia a dia.',
    kind: 'guide',
    difficulty: 'iniciacao',
    workflowName: 'Gestão documental',
    documentTypeName: 'Diversos',
    tagNames: ['organização'],
    status: 'published',
    publishedAt: '2026-05-25',
    authorKey: 'joao',
  },
  {
    slug: 'rever-permissoes-de-acesso-a-documentos',
    title: 'Rever permissões de acesso a documentos',
    summary: 'Como rever e ajustar quem pode aceder a um documento.',
    description:
      'Explica como consultar e ajustar as permissões de acesso a um documento sensível, respeitando os perfis definidos.',
    kind: 'video',
    difficulty: 'avancada',
    workflowName: 'Gestão documental',
    documentTypeName: 'Informação',
    tagNames: ['permissões'],
    status: 'draft',
    authorKey: 'ana',
  },
  {
    slug: 'preparar-um-processo-para-arquivo',
    title: 'Preparar um processo para arquivo',
    summary: 'Como preparar um processo concluído para ser arquivado.',
    description:
      'Cobre os passos de verificação e organização de um processo antes de o enviar para arquivo definitivo.',
    kind: 'guide',
    difficulty: 'intermedia',
    workflowName: 'Arquivo',
    documentTypeName: 'Processo',
    tagNames: ['arquivo'],
    status: 'published',
    publishedAt: '2026-06-02',
    authorKey: 'joao',
  },
  {
    slug: 'consultar-o-arquivo-historico',
    title: 'Consultar o arquivo histórico',
    summary: 'Como aceder e consultar documentos do arquivo histórico.',
    description:
      'Mostra como pesquisar e consultar documentos guardados no arquivo histórico da instituição.',
    kind: 'video',
    difficulty: 'avancada',
    workflowName: 'Arquivo',
    documentTypeName: 'Diversos',
    tagNames: [],
    status: 'published',
    publishedAt: '2026-06-06',
    authorKey: 'ana',
  },
  {
    slug: 'corrigir-a-data-de-um-despacho',
    title: 'Corrigir a data de um despacho',
    summary: 'Como corrigir uma data incorretamente registada num despacho.',
    description:
      'Explica o procedimento para corrigir a data de um despacho já registado, preservando o histórico de alterações.',
    kind: 'guide',
    difficulty: 'iniciacao',
    workflowName: 'Correções',
    documentTypeName: 'Despacho',
    tagNames: ['correção'],
    status: 'published',
    publishedAt: '2026-06-10',
    authorKey: 'joao',
  },
  {
    slug: 'anular-um-registo-criado-por-engano',
    title: 'Anular um registo criado por engano',
    summary: 'Como anular corretamente um registo criado indevidamente.',
    description:
      'Descreve como anular um registo criado por engano, deixando um rasto claro da anulação.',
    kind: 'video',
    difficulty: 'intermedia',
    workflowName: 'Correções',
    documentTypeName: 'Informação',
    tagNames: ['correção', 'registo'],
    status: 'archived',
    publishedAt: '2026-06-11',
    authorKey: 'ana',
  },
  {
    slug: 'criar-um-modelo-de-oficio-reutilizavel',
    title: 'Criar um modelo de ofício reutilizável',
    summary: 'Como criar um modelo de ofício para reutilização futura.',
    description:
      'Explica como configurar um modelo de ofício reutilizável, com campos variáveis prontos a preencher.',
    kind: 'guide',
    difficulty: 'avancada',
    workflowName: 'Criação e registo',
    documentTypeName: 'Ofício',
    tagNames: ['modelo'],
    status: 'draft',
    authorKey: 'joao',
  },
  {
    slug: 'arquivar-correspondencia-sem-resposta',
    title: 'Arquivar correspondência sem resposta',
    summary: 'Como arquivar correspondência que não obteve resposta.',
    description:
      'Cobre o procedimento para arquivar correspondência sem resposta após o prazo de espera definido.',
    kind: 'guide',
    difficulty: 'intermedia',
    workflowName: 'Arquivo',
    documentTypeName: 'Correspondência',
    tagNames: ['arquivo', 'correspondência'],
    status: 'archived',
    publishedAt: '2026-06-14',
    authorKey: 'ana',
  },
];

export const resourceSeedData: readonly ResourceSeedData[] = RAW_RESOURCES.map(
  (row) => ({
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    resourceType:
      row.kind === 'video' ? ResourceType.VIDEO : ResourceType.PDF_GUIDE,
    difficulty: DIFFICULTY[row.difficulty],
    workflowName: row.workflowName,
    documentTypeName: row.documentTypeName,
    tagNames: row.tagNames,
    status: STATUS[row.status],
    publishedAt: row.publishedAt,
    authorKey: row.authorKey,
  }),
);
