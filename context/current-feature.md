# Funcionalidade Atual

Fase 1 (UI) — Design System & Casca da Aplicação

<!-- Ver especificação completa em context/features/fase-1-ui-design-system.md -->

## Estado

<!-- Não iniciada|Em curso|Concluída -->

Concluída

## Objetivos

<!-- Objetivos e requisitos -->

Ver `context/features/fase-1-ui-design-system.md`.

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
