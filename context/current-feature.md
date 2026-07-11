# Funcionalidade Atual

Fase 3 (UI) — Catálogo de Recursos

<!-- Ver especificação completa em context/features/fase-3-ui-catalogo.md -->

## Estado

<!-- Não iniciada|Em progresso|Concluída -->

Concluída

## Objetivos

<!-- Objetivos e requisitos -->

Ver `context/features/fase-3-ui-catalogo.md`.

## Notas

<!-- Notas adicionais -->

## Histórico

<!-- Manter atualizado. Da mais antiga para a mais recente -->

- Configuração do projeto e limpeza do boilerplate
- Adaptação do `.gitignore` ao projeto, commit inicial ("Configuração inicial") e push para o repositório remoto `git@github.com:scorpaust/filedoc-dgadr-recursos.git`
- Criação de `src/lib/mock-data.ts` com dados mock do dashboard (recursos, dicas, FAQs, pedidos de suporte, utilizadores), a partir dos screenshots de referência
- Início da Fase 1 (UI) — Design System & Casca da Aplicação, na branch `feature/fase-1-ui-design-system`
- Implementação completa da Fase 1 (UI):
  - infraestrutura: ESLint (`angular-eslint`) e scripts `lint`/`format:check`/`typecheck`; `@angular/cdk` instalado (sem `@angular/material`); prefixo de selector alterado para `fdr-`;
  - tema: tokens SCSS (`src/styles/`), `ThemeService` com Signals, deteção via `prefers-color-scheme`, persistência e script inline no `index.html` para evitar flash de tema incorreto;
  - modelos e mocks movidos de `src/lib/mock-data.ts` para `src/app/shared/models` e `src/app/shared/mocks`, com aviso de dados de demonstração;
  - 15 componentes partilhados em `src/app/shared/components` (Icon, Button, Tag, Pill, Carimbo, Skeleton, Chip, EmptyState, SegmentedControl, Toast+ToastService, Accordion+AccordionItem, DropdownFilter, Dialog+DialogService, ResourceCard, RoutePlaceholder), todos standalone/OnPush/`input()`/`output()`, com testes unitários;
  - layout (`core/layout`): AppHeader, AppNav (grupos Portal/Pedidos/Gestão), AppFooter, AppShell com navegação em gaveta (CDK) em ecrãs estreitos;
  - roteamento com lazy loading para `/inicio`, `/recursos`, `/recursos/:slug`, `/dicas-faq`, `/suporte`, `/suporte/gestao`, `/conteudos`, `/administracao`, `/acesso-negado` e `/**`, com páginas placeholder e páginas de erro com `EmptyStateComponent`;
  - validação automática: `lint`, `format:check`, `typecheck`, `test` (72/72 testes) e `build` (produção) todos a passar sem erros;
  - validação manual no browser (Playwright, ferramenta temporária não guardada no projeto): as 10 rotas renderizam sem erros de consola; alternância de tema funciona e persiste após recarregar; navegação em gaveta funcional a 375 px sem scroll horizontal.
  - Nota: validação manual não cobriu explicitamente todas as larguras da checklist (320/768/1024 px) nem uma passagem completa de navegação só por teclado no browser — os componentes usam elementos nativos (`button`/`a`) e os comportamentos de teclado (Escape, setas, foco contido/devolvido) estão cobertos por testes unitários, mas falta confirmação visual manual dessas larguras e desse fluxo antes de considerar a fase concluída.
  - Ainda por fazer antes de marcar como concluída: validação manual das larguras/teclado em falta, autorização do utilizador para commit.
- Início da Fase 2 (UI) — Ecrãs de Autenticação, na branch `feature/fase-2-ui-autenticacao`
- Implementação completa da Fase 2 (UI):
  - `AuthService` simulado (`core/auth`), com Signals (`currentUser`, `currentRole`, `isAuthenticated`), `login`/`logout`/`changePassword` com atraso simulado e mensagem de erro sempre genérica; `mock-credentials.ts` com credenciais de demonstração para os 4 utilizadores mock ativos;
  - adicionado um 5.º utilizador mock (`ADMIN`, Ana Ferreira) a `shared/mocks/users.mock.ts`, cobrindo as 4 funções da aplicação; removido o `currentUser` estático (substituído pelo `AuthService`);
  - `authGuard` e `roleGuard` (`core/auth`), funcionais e testados, incluindo os caminhos negativos (sem sessão → `/login`; função não permitida → `/acesso-negado`);
  - reestruturação do roteamento (`app.routes.ts`): `/login` pública e fora da casca; `AppShellComponent` movido para uma rota-pai `''` protegida por `authGuard`, com as restantes rotas da Fase 1 como filhas; `roleGuard` aplicado a `/suporte/gestao` (`SUPPORT_AGENT`/`ADMIN`), `/conteudos` (`CONTENT_EDITOR`/`ADMIN`) e `/administracao` (`ADMIN`); nova rota autenticada `/definicoes/palavra-passe`; `App` (raiz) passou a expor apenas `<router-outlet />`;
  - ecrã de login (`features/auth/login-page`) com Reactive Forms tipado, validação de e-mail/palavra-passe, alternar visibilidade da palavra-passe, erro genérico de credenciais inválidas, foco automático no campo de e-mail, e ferramenta de desenvolvimento (claramente identificada) para iniciar sessão rapidamente com um utilizador mock por função;
  - ecrã de alteração de palavra-passe (`features/auth/change-password-page`), rota autenticada, com validação de campos obrigatórios e confirmação igual à nova palavra-passe, sucesso via `ToastService` e erro genérico simulado;
  - `UserMenuComponent` (`core/layout/user-menu`, padrão CDK Overlay igual ao `DropdownFilterComponent`) com as opções "Alterar palavra-passe" e "Terminar sessão"; `AppHeaderComponent` ligado ao `AuthService` em vez de dados estáticos;
  - novos ícones `eye`/`eye-off`/`log-out`/`key` no `IconComponent`; estilos de campo de formulário partilhados em `src/styles/_forms.scss`, reutilizados pelos dois ecrãs;
  - validação automática: `lint`, `typecheck`, `test` (99/99 testes) e `build` (produção) todos a passar sem erros; `format:check` sem problemas nos ficheiros desta fase (o aviso pré-existente em ~105 ficheiros não tocados por esta fase replica-se também numa checkout limpa de `main`, por diferença de fim de linha `core.autocrlf` neste ambiente Windows — não é uma regressão introduzida aqui);
  - validação manual no browser (Playwright, ferramenta temporária não guardada no projeto): acesso não autenticado a `/inicio` redireciona para `/login`; ecrã de login sem cabeçalho/navegação; credenciais inválidas mostram erro genérico; ferramenta de simulação de função autentica e redireciona para `/inicio`; utilizador `EMPLOYEE` bloqueado em `/administracao` e redirecionado para `/acesso-negado`; alteração de palavra-passe valida a confirmação e mostra sucesso; terminar sessão redireciona para `/login` com foco devolvido ao campo de e-mail; zero erros de consola; inspeção visual em modo claro, escuro e a 375 px sem problemas aparentes;
  - decisões tomadas: ferramenta de simulação de função colocada no rodapé do ecrã de login (opção sugerida na especificação); alteração de palavra-passe implementada como página dedicada (`/definicoes/palavra-passe`), não como diálogo, por consistência com os restantes formulários da aplicação.
  - correções de acessibilidade encontradas e resolvidas a pedido do utilizador (via Microsoft Edge Tools/webhint e verificação manual), com confirmação por axe-core real e não apenas pela build: `[attr.aria-label]="expr()"` reescrito como `aria-label="{{ expr() }}"` em vários componentes (o linter estático do editor não avalia bindings Angular, embora o runtime já estivesse correto); contraste insuficiente (3.12:1) do avatar do `UserMenuComponent` corrigido para `--fdr-accent-primary-hover` (~4.86:1); aviso "axe/list" em `AppNavComponent` investigado e confirmado como falso positivo do linter estático (não entende `@for`) — mantido `@for`, sem alteração de código, por exigência de `.claude/CLAUDE.md`;
  - validação manual completa a pedido do utilizador, antes do commit: larguras 320/375/768/1024/1440 px em `/login`, `/inicio`, `/recursos`, `/dicas-faq`, `/suporte` (incl. gaveta móvel aberta), `/definicoes/palavra-passe` e `/acesso-negado` — sem scroll horizontal nem erros de consola; passagem completa de navegação só por teclado (login incl. alternância de palavra-passe e submissão com Enter, cabeçalho, gaveta de navegação móvel, menu do utilizador, alteração de palavra-passe, logout);
  - esta validação encontrou e corrigiu 3 bugs reais não cobertos pelos testes unitários: (1) `UserMenuComponent` — o chevron do gatilho ficava sempre visível e causava overflow horizontal a 320 px; escondido também abaixo de 768 px, junto com o nome/cargo; (2) `AppShellComponent` (gaveta de navegação móvel, herdada da Fase 1) — os links da gaveta fechada continuavam focáveis fora do ecrã (só havia `transform`, sem `visibility: hidden`), e não existia atalho de Escape para fechar a gaveta nem devolução de foco ao botão que a abriu; ambos corrigidos; (3) `UserMenuComponent` — o painel do menu não tinha `cdkTrapFocus` nem foco automático no primeiro item, pelo que o Tab saltava da barra lateral em vez de percorrer as opções do menu; corrigido com `cdkTrapFocus`/`cdkTrapFocusAutoCapture` e foco devolvido ao gatilho ao fechar;
  - `lint`, `typecheck`, `test` (99/99) e `build` revalidados após todas as correções, todos a passar sem erros.
  - Commit ainda por autorizar.
- Início da Fase 3 (UI) — Catálogo de Recursos, na branch `feature/fase-3-ui-catalogo`
- Implementação completa da Fase 3 (UI):
  - `Resource` (`shared/models/resource.model.ts`) estendido com `slug`, `summary` (resumo, usado no cartão), `tags`, `publishedAt`, e `workflow`/`documentType` passaram a uniões literais tipadas (`Workflow`/`DocumentType`, com as listas `WORKFLOWS`/`DOCUMENT_TYPES` da secção B do `project-spec.md`); `description` mantido para a Fase 4 (detalhe);
  - `shared/mocks/resources.mock.ts` expandido de 6 para 24 recursos, cobrindo os 3 estados editoriais (16 publicados, 5 rascunho, 3 arquivados), os 2 tipos, as 3 dificuldades, os 8 fluxos e os 7 tipos de documento;
  - `ResourceCardComponent` (Fase 1) atualizado para navegar por `resource().slug` (em vez de `id`) e mostrar `resource().summary`; testes ajustados;
  - `PaginationComponent` novo (`shared/components/pagination`), acessível (`nav[aria-label]`, `aria-current="page"`, reticências para muitas páginas), com testes;
  - `ResourceMockService` novo (`features/resources/data`), com `search(params): Observable<{ items; total }>` e `getBySlug(slug)`, atraso simulado de 300 ms (`delay`), pesquisa por título/resumo/etiquetas (sem distinção de maiúsculas/acentos), filtros por tipo/fluxo/dificuldade, ordenação "mais recentes"/alfabética, paginação, e visibilidade por estado editorial e função (`CONTENT_EDITOR`/`ADMIN` veem rascunhos; arquivados nunca aparecem); testado exaustivamente;
  - `ResourceCatalogPageComponent` (`features/resources/resource-catalog-page`) reescrito por completo: barra de pesquisa com debounce de 250 ms (Reactive Forms), `SegmentedControlComponent` (tipo), dois `DropdownFilterComponent` (fluxo/dificuldade), `select` nativo de ordenação, grelha responsiva (`auto-fill`), skeletons durante o carregamento, `EmptyStateComponent` com ação de limpar filtros, `PaginationComponent`, e sincronização de todos os parâmetros com a URL (`q`, `tipo`, `fluxo`, `dificuldade`, `ordenar`, `pagina`) através de `Router.navigate(..., { replaceUrl: true })`; usa `switchMap` (via `toObservable`/`toSignal`) para cancelar pesquisas em curso;
  - decisão registada (risco em aberto do `fase-3-ui-catalogo.md`): "mais recentes" ordena por `publishedAt` (data de publicação), não por `updatedAt`; documentado em comentário no `ResourceMockService`;
  - decisão: o filtro por tipo de documento previsto no `project-spec.md` (secção C) não foi incluído nesta fase — o `fase-3-ui-catalogo.md` (tarefa D) restringe explicitamente os filtros a pesquisa/tipo/fluxo/dificuldade;
  - validação automática: `lint`, `typecheck`, `test` (126/126 testes) e `build` (produção) todos a passar sem erros; `format:check` sem regressões (o aviso pré-existente por fim de linha `core.autocrlf` replica-se numa checkout limpa de `main`, tal como documentado na Fase 2);
  - validação manual no browser (Playwright, ferramenta temporária não guardada no projeto, script descartável fora do repositório): 29 de 30 verificações automatizadas passaram — pesquisa por texto, filtros de tipo/fluxo isolados, "limpar filtros" (barra de ferramentas e estado vazio), paginação (páginas com conteúdo distinto, URL atualizada), sincronização de filtros/pesquisa/página com a URL, teclado (setas no controlo segmentado, Escape a fechar o dropdown), zero erros de consola, e a regra de visibilidade confirmada com os 3 utilizadores mock relevantes (`EMPLOYEE`: 16 recursos, sem rascunhos nem arquivados; `CONTENT_EDITOR` e `ADMIN`: 21 recursos, incluindo rascunhos, nunca arquivados); sem scroll horizontal a 320/375/1024/1440 px;
  - encontrado (não corrigido, fora do âmbito desta fase): overflow horizontal de 2 px a 768 px, reproduzido também em `/inicio` e causado pela gaveta de navegação móvel da `AppShellComponent` (herdada da Fase 1) após múltiplos ciclos de login/logout — elemento com `visibility: hidden`, sem impacto visual percetível, mas a corrigir numa fase futura que toque o `AppShellComponent`;
  - encontrado (não corrigido, fora do âmbito desta fase): devido à sessão simulada da Fase 2 não ter persistência (só em memória), recarregar o browser numa página com filtros na URL perde a sessão e redireciona para `/login` sem preservar o URL de destino (sem `returnUrl`); o comportamento de "restaurar filtros a partir do URL" em si está validado ao nível do componente (testes unitários com `ActivatedRoute` simulada), mas o fluxo completo "recarregar a página autenticada" só poderá ser validado em browser depois de uma fase que adicione persistência de sessão;
  - Commit ainda por autorizar.
