// Slugs/ids de dados mock (`shared/mocks`) usados como parâmetros de rota nos testes E2E —
// sempre recursos/pedidos publicados e visíveis a `testUsers.employee` (Marta Silva),
// escolhidos por já existirem nos dados de demonstração, não por serem criados pelo teste.
export const sampleVideoResourceSlug = 'criar-um-novo-processo-de-correspondencia'; // res-1
export const sampleGuideResourceSlug = 'assinar-um-despacho-digitalmente'; // res-2
export const draftGuideResourceId = 'res-3'; // draft, guia, com pdfUrl já definido (fluxo 12)

export const employeeOpenTicketId = 'sup-1'; // OPEN, de Marta Silva (testUsers.employee)
export const employeeInProgressTicketId = 'sup-2'; // IN_PROGRESS, de Marta Silva
export const employeeWaitingTicketId = 'sup-3'; // WAITING_FOR_USER, de Marta Silva
export const otherUserTicketId = 'sup-6'; // de João Antunes — nunca deve ser visível a Marta

// As catorze rotas mínimas da tarefa A de `fase-11-ui-acessibilidade-e2e.md`. Duas variantes
// de `/recursos/:slug` (vídeo e guia) contam como uma única rota da lista da especificação.
export const auditRoutes = [
  '/login',
  '/inicio',
  '/recursos',
  `/recursos/${sampleVideoResourceSlug}`,
  `/recursos/${sampleGuideResourceSlug}`,
  '/dicas-faq',
  '/suporte',
  '/suporte/novo',
  `/suporte/${employeeOpenTicketId}`,
  '/suporte/gestao',
  '/conteudos',
  '/administracao',
  '/acesso-negado',
  '/uma-rota-que-nao-existe',
] as const;
