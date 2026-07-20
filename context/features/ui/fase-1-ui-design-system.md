# Fase 1 (UI) — Design System & Casca da Aplicação

Esta especificação define a **primeira fase da via de desenvolvimento do UI** do **Filedoc Recursos Formativos**, em Angular, construída com dados simulados (mock), antes de qualquer integração com a API NestJS.

Faz parte de uma série de 10 fases dedicadas exclusivamente à interface (`fase-1-ui-design-system.md`, `fase-2-ui-autenticacao.md`, ...). A integração com a API real é tratada separadamente, fase a fase, depois de cada ecrã estar visualmente validado.

Coerente com `project-spec.md`, `project-overview.md`, `coding-standards.md` e `ai-interaction.md`. Serve de referência visual o protótipo estático já validado (`filedoc-ui-prototype.html`) — esta fase recria esse sistema visual em Angular real, com componentes reutilizáveis e tipados.

---

## Objetivo

No final desta fase, deve existir uma aplicação Angular a correr localmente com:

- o layout completo da aplicação autenticada (cabeçalho, navegação principal, área de conteúdo, rodapé), fiel ao protótipo visual aprovado;
- o sistema de tema claro/escuro, com deteção da preferência do sistema, alternância manual, persistência e sem flash de tema incorreto;
- o roteamento principal com lazy loading, incluindo páginas placeholder para todas as áreas previstas (Início, Catálogo, Recurso, Dicas & FAQ, Suporte, Gestão de suporte, Conteúdos, Administração), mesmo sem conteúdo funcional;
- uma biblioteca de componentes partilhados, reutilizáveis nas fases seguintes;
- identidade visual aplicada (logótipos DGADR e Filedoc, paleta, tipografia).

Não existe nesta fase: autenticação real, dados vindos da API, formulários funcionais, nem qualquer lógica de negócio. Tudo o que aparecer em ecrã pode usar dados estáticos/mock, claramente identificados como tal no código (nunca apresentados como dados reais).

---

## Âmbito

### Incluído

- Configuração de SCSS com tokens de design (cores, espaçamento, tipografia, raios, sombras) para os dois temas;
- Tipografia e importação de tipos de letra;
- Layout da aplicação (`core/layout`): cabeçalho, navegação principal, rodapé;
- Serviço de tema (deteção, alternância, persistência) como serviço Angular (`core/services`), usando Signals;
- Roteamento principal com lazy loading e páginas placeholder;
- Guarda de navegação para o menu móvel (abrir/fechar), sem qualquer verificação de autorização real;
- Biblioteca de componentes partilhados (`shared/components`) — ver lista na secção de tarefas;
- Página de acesso negado e página de recurso não encontrado (visuais, sem lógica de autorização real);
- Acessibilidade de base: `lang="pt-PT"`, HTML semântico, link para saltar para o conteúdo, foco visível, navegação por teclado no cabeçalho e na navegação.

### Fora de âmbito

- Ecrãs de autenticação (Fase 2 do UI);
- Qualquer chamada HTTP real (`HttpClient` pode ser configurado, mas sem endpoints de negócio a consumir);
- Dados provenientes da API — usar dados mock tipados em `shared/models` ou em ficheiros de fixture;
- Formulários com validação de negócio;
- Testes E2E com Playwright (introduzidos a partir da Fase 2, quando existirem fluxos reais);
- Integração com armazenamento de ficheiros (MinIO/S3);
- Qualquer verificação de função/permissão real — os elementos de interface que dependem de função (ex.: itens de navegação de "Gestão") podem ficar todos visíveis nesta fase, com uma nota de que a autorização é tratada em fase posterior.

---

## Entregáveis

1. `apps/web` com o layout, tema e roteamento a funcionar;
2. Biblioteca de componentes partilhados documentada (Storybook é opcional; no mínimo, cada componente deve ter um exemplo de utilização nos placeholders das páginas);
3. Tokens SCSS (`_tokens.scss`, `_themes.scss`, `_typography.scss`) coerentes com o protótipo visual aprovado;
4. Páginas placeholder para todas as rotas principais;
5. Testes unitários dos componentes partilhados e do serviço de tema.

---

## Tarefas

### A. Tokens e tema

- Criar `_tokens.scss` com as variáveis de cor (petróleo, verde, azul, âmbar, laranja/terracota, ameixa, cinzentos), espaçamento, raios e sombras, para os dois temas (claro e escuro);
- Criar `ThemeService` (`core/services/theme.service.ts`):
  - Signal com o tema atual;
  - deteção inicial via `prefers-color-scheme`;
  - persistência da escolha (não usar `localStorage` como base de dados de negócio — apenas para esta preferência de interface, o que é aceitável);
  - método para alternar e para definir explicitamente;
  - aplicação do tema via atributo no `<html>`, sem flash de tema incorreto no arranque;
- Garantir contraste WCAG AA em ambos os temas.

### B. Layout (`core/layout`)

- `AppHeaderComponent`: logótipos (DGADR + Filedoc, sem distorcer nem recolorir), pesquisa global (input visual, sem lógica de pesquisa ainda), botão de alternância de tema, cartão do utilizador (avatar, nome, carreira profissional — com dados mock), botão de menu para o modo móvel;
- `AppNavComponent`: navegação principal por separadores/ícones, agrupada tal como em `project-overview.md` (Portal, Pedidos, Gestão), com indicação do item ativo;
- `AppFooterComponent`: rodapé simples;
- `AppShellComponent` ou equivalente: composição do layout (cabeçalho + navegação + `<router-outlet>` + rodapé), com o comportamento responsivo (a navegação transforma-se em gaveta/*drawer* em ecrãs estreitos, com fundo semi-transparente e fecho ao clicar fora ou ao navegar);
- Testar exaustivamente a responsividade nas larguras definidas em `project-spec.md` (320 px, 375 px, 768 px, 1024 px, 1440 px), sem qualquer elemento cortado ou sobreposto.

### C. Roteamento

- `app.routes.ts` com lazy loading (`loadComponent` ou `loadChildren`) para:

```text
/inicio
/recursos            (placeholder do Catálogo)
/recursos/:slug      (placeholder do Detalhe)
/dicas-faq
/suporte
/suporte/gestao
/conteudos
/administracao
/acesso-negado
/** (não encontrado)
```

- Cada rota carrega, por agora, um componente placeholder simples com o nome do ecrã e uma nota "Conteúdo desta fase: [número da fase futura]";
- Página de "acesso negado" e página "não encontrado" com aparência final (não apenas texto simples), reutilizando os componentes partilhados de estado vazio/erro.

### D. Componentes partilhados (`shared/components`)

Construir, tipados e testados, os componentes que o protótipo já valida visualmente:

- `ButtonComponent` (variantes: primário, contorno, fantasma; tamanhos normal/pequeno);
- `TagComponent` (etiqueta simples e variante de dificuldade);
- `PillComponent` (estado/prioridade, com variantes de cor genéricas — verde, cinzento, ameixa, azul);
- `CarimboComponent` (a etiqueta em monospace com contorno tracejado, usada em referências e datas);
- `ResourceCardComponent` (cartão de recurso do catálogo, com `input()` tipado para os dados do recurso);
- `SegmentedControlComponent` (controlo de tipo, genérico, com `input()`/`output()`);
- `DropdownFilterComponent` (dropdown de filtro com contagem de selecionados, abre/fecha, fecha ao clicar fora);
- `ChipComponent` (chip de filtro de estado, selecionável);
- `EmptyStateComponent` (estado vazio genérico, com ícone, título, descrição e ação opcional);
- `SkeletonComponent` (skeleton genérico para carregamento);
- `ToastComponent` / `ToastService` (notificações de sucesso/erro, sem lógica de negócio associada ainda);
- `AccordionComponent` (usado nas Perguntas Frequentes);
- `DialogComponent` (diálogo acessível, com foco contido e devolução do foco ao fechar).

Cada componente deve:

- ser standalone;
- usar `input()`/`output()` tipados;
- usar `ChangeDetectionStrategy.OnPush`;
- não conter lógica de negócio, apenas apresentação;
- ter pelo menos um teste unitário que confirme a renderização condicional e os estados (normal, hover/foco, desativado, conforme aplicável).

### E. Dados mock

- Criar `shared/models` com os tipos TypeScript de `Resource`, `Tip`, `Faq`, `SupportTicket`, etc., coerentes com o modelo de dados de `project-spec.md` (apenas os campos relevantes para o UI nesta fase);
- Criar fixtures mock (ex.: `shared/mocks/resources.mock.ts`) claramente assinaladas como dados de demonstração, nunca como dados reais da DGADR.

---

## Critérios de aceitação

- [ ] A aplicação arranca e mostra o layout completo (cabeçalho, navegação, conteúdo, rodapé);
- [ ] O tema alterna corretamente entre claro e escuro, persiste após recarregar a página, e não há flash de tema incorreto;
- [ ] Todas as rotas principais navegam para o respetivo placeholder, sem erros de consola;
- [ ] A navegação funciona por teclado (tabulação, `Enter`/`Espaço` a ativar), com foco visível em todos os elementos interativos;
- [ ] Em ecrãs estreitos, a navegação transforma-se em gaveta funcional (abre, fecha ao clicar fora, fecha ao escolher um item);
- [ ] Testado sem sobreposição ou corte de elementos em 320 px, 375 px, 768 px, 1024 px e 1440 px;
- [ ] Todos os componentes partilhados têm testes unitários a passar;
- [ ] Lint, verificação de tipos e build passam sem erros nem avisos ignorados;
- [ ] Nenhum dado mock é apresentado de forma que possa ser confundido com dado real ou oficial.

---

## Comandos de validação

```text
lint
format:check
typecheck
test
build
```

---

## Riscos e decisões em aberto

- Confirmar se `Angular Material`/`CDK` serão usados para o diálogo e o menu, ou se os componentes serão construídos de raiz (o protótipo não depende de nenhuma biblioteca de UI externa — decisão a confirmar antes de iniciar a Fase 1);
- Definir, antes de começar, os *design tokens* finais de cor a usar nos dois temas (o protótipo é a referência, mas as cores não são institucionais oficiais confirmadas — ver `project-spec.md`, secção de identidade visual);
- Confirmar o prefixo de *selector* dos componentes Angular do projeto (ex.: `fdr-`).

---

## Dependência para a fase seguinte

A **Fase 2 (UI) — Ecrãs de autenticação** assume como ponto de partida:

- os componentes partilhados já existentes (botão, campo, estados);
- o layout e o tema já funcionais;
- as rotas `/acesso-negado` e a estrutura de rotas públicas vs. autenticadas já preparadas (mesmo que ainda sem guardas reais).

---

> Fase 1 (UI) — a base visual e estrutural de que todas as fases seguintes dependem. Sem dados reais, sem lógica de negócio: só a casca, bem feita.
