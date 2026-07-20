# Fase 10 (UI) — Página Inicial

Esta especificação define a **décima fase da via de desenvolvimento do UI** do **Filedoc Recursos Formativos**, em Angular, com dados simulados (mock) — sem ligação à API NestJS.

Esta fase foi inserida depois da Fase 1 já ter criado apenas um *placeholder* para `/inicio` — a página inicial completa depende de dados que só existem a partir da Fase 3 (recursos) e da Fase 6 (pedidos de suporte), por isso só faz sentido construí-la depois de ambas estarem concluídas. Assume como ponto de partida a Fase 1 (Design System), a Fase 2 (Autenticação), a Fase 3 (Catálogo), a Fase 4 (Detalhe de recurso) e a Fase 6 (Suporte — pedidos do trabalhador).

Coerente com `project-spec.md` (secção "Página inicial", dentro de UI/UX), `project-overview.md`, `coding-standards.md` e `ai-interaction.md`.

> Nota de numeração: esta fase substitui o *placeholder* de `/inicio` criado na Fase 1. A fase seguinte, que fecha a via de UI (acessibilidade, responsividade e testes E2E de UI), passa a ser a **Fase 11**.

---

## Objetivo

No final desta fase, deve ser possível, sem qualquer API real:

- aceder a `/inicio` (rota inicial após login, Fase 2) e ver a página completa: *hero* com título e subtítulo, ação principal para o catálogo e ação secundária para pedir suporte, três cartões de funcionalidades, pesquisa rápida, recursos em destaque, recursos recentes e um resumo dos pedidos de suporte abertos do próprio utilizador;
- usar a pesquisa rápida para navegar diretamente para `/recursos` com o termo já aplicado como filtro (reutilizando a sincronização com o URL já construída na Fase 3);
- ver "Recursos em destaque" com um pequeno conjunto de recursos mock marcados como destaque (ou, na ausência de uma marcação explícita nos dados, os mais recentes publicados — decisão a tomar nesta fase e documentada);
- ver "Recursos recentes" com os últimos recursos publicados, ordenados por data de atualização, reutilizando o `ResourceMockService` da Fase 3;
- ver "Os meus pedidos" com os pedidos abertos (não encerrados) do utilizador atual, reutilizando o `SupportTicketMockService` da Fase 6, com atalho para `/suporte`;
- confirmar que, sem pedidos abertos ou sem recursos disponíveis (cenário de teste), a página mostra estados vazios adequados em vez de secções em branco ou quebradas.

Não existe nesta fase: qualquer chamada HTTP real, nem personalização avançada (ex.: recomendações) — fora do âmbito de `project-spec.md` para o MVP.

---

## Âmbito

### Incluído

- Página `/inicio` (`features/home`), substituindo o *placeholder* da Fase 1;
- *Hero* com o texto definido em `project-spec.md`:
  - título: "Domine o Filedoc, passo a passo.";
  - subtítulo: "Consulte vídeos, guias práticos e dicas para executar os principais fluxos documentais. Quando precisar, coloque uma questão ou registe um pedido de suporte.";
  - ação principal "Ver recursos" (→ `/recursos`) e ação secundária "Pedir suporte" (→ `/suporte/novo`);
- Três cartões de funcionalidades (Vídeos formativos, Guias em PDF, Pedidos de suporte — tal como no protótipo), sem lógica associada além da navegação;
- Pesquisa rápida, ligada à mesma lógica de sincronização com o URL do catálogo (Fase 3): submeter navega para `/recursos?q=...`;
- Secção "Recursos em destaque": grelha compacta de `ResourceCardComponent` (Fase 1/3);
- Secção "Recursos recentes": lista compacta;
- Secção "Os meus pedidos": lista compacta dos pedidos abertos do utilizador atual, com referência (`CarimboComponent`), assunto e estado, e atalho para `/suporte`;
- Estados vazios em cada secção dinâmica (destaque, recentes, pedidos), reutilizando o `EmptyStateComponent`;
- Skeletons durante o carregamento simulado de cada secção.

### Fora de âmbito

- Recomendações personalizadas, avaliação de utilidade, favoritos (Segunda Fase do roadmap geral do produto);
- Indicadores agregados ou estatísticas (Evolução futura);
- Qualquer conteúdo diferenciado por função além do que já é natural (ex.: um `CONTENT_EDITOR` não vê nada de especial na página inicial só por o ser — isso fica confinado a `/conteudos`).

---

## Entregáveis

1. Página `/inicio` completa, substituindo o *placeholder*;
2. Pesquisa rápida ligada ao catálogo;
3. Três secções dinâmicas (destaque, recentes, pedidos abertos) com dados mock, skeleton e estado vazio;
4. Testes unitários da lógica de seleção de "recursos em destaque"/"recentes" e da listagem de pedidos abertos.

---

## Tarefas

### A. *Hero* e cartões de funcionalidades

- Reconstruir o *hero* já validado no protótipo, com o texto exato definido em `project-spec.md` (não parafrasear);
- Botões "Ver recursos" e "Pedir suporte" a navegar corretamente;
- Três `feature-card` estáticos (sem dados mock — o conteúdo é fixo, conforme `project-spec.md`).

### B. Pesquisa rápida

- Campo de pesquisa que, ao submeter (tecla `Enter` ou botão), navega para `/recursos` com o parâmetro de pesquisa já preenchido no URL, reutilizando exatamente a mesma sincronização de query parameters construída na Fase 3 (não duplicar a lógica de pesquisa — a página inicial apenas inicia a navegação, o catálogo é que pesquisa).

### C. Recursos em destaque

- Definir, nesta fase, o critério de seleção: ou um campo explícito nos dados mock (ex.: `isFeatured`), ou os `N` recursos publicados mais recentes por data de publicação — decisão a documentar no código, já que `project-spec.md` não impõe um mecanismo específico;
- Reutilizar `ResourceCardComponent` em modo compacto (mesmo componente da Fase 3, sem duplicar);
- Skeleton + estado vazio.

### D. Recursos recentes

- Lista compacta (não a grelha de cartões completa) dos recursos publicados mais recentemente atualizados, reutilizando o `ResourceMockService` (Fase 3), com a mesma regra de visibilidade por estado editorial e função já validada;
- Cada item navega para `/recursos/:slug` (Fase 4).

### E. Os meus pedidos

- Lista compacta dos pedidos do utilizador atual cujo estado não é "Encerrado", reutilizando `SupportTicketMockService.listMine()` (Fase 6);
- Cada item mostra referência, assunto (truncado se necessário) e estado (`status-pill`);
- Atalho "Ver todos" para `/suporte`;
- Estado vazio quando não existem pedidos abertos (mensagem positiva, não um aviso — não ter pedidos abertos é uma situação normal e desejável, não um erro).

### F. Estados de carregamento

- As três secções dinâmicas devem carregar de forma independente (cada uma com o seu próprio skeleton), para que uma demora simulada numa não bloqueie a apresentação das outras — reforça o padrão já estabelecido nas fases anteriores de nunca bloquear a página inteira por causa de uma secção.

---

## Critérios de aceitação

- [ ] `/inicio` mostra o *hero* com o texto exato de `project-spec.md` e as duas ações a navegar corretamente;
- [ ] Os três cartões de funcionalidades estão presentes e são estáticos;
- [ ] A pesquisa rápida navega para `/recursos` com o termo já aplicado como filtro;
- [ ] "Recursos em destaque" e "Recursos recentes" mostram dados coerentes com o `ResourceMockService`, respeitando a regra de visibilidade por estado editorial e função;
- [ ] "Os meus pedidos" mostra apenas os pedidos abertos do utilizador atual, nunca de outro utilizador mock;
- [ ] Cada secção dinâmica tem o seu próprio skeleton e estado vazio, independentes das restantes;
- [ ] Um utilizador mock sem pedidos abertos vê uma mensagem de estado vazio positiva, não um erro;
- [ ] Testado sem sobreposição ou corte nas cinco larguras de referência (320–1440 px);
- [ ] Testes unitários da lógica de seleção de destaque/recentes e da listagem de pedidos abertos passam;
- [ ] Lint, verificação de tipos, testes e build passam sem erros.

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

- Confirmar o critério de "recursos em destaque" (campo explícito vs. mais recentes) antes de iniciar — tem impacto direto no modelo de dados mock e, mais tarde, no modelo Prisma real, se vier a ser um campo explícito;
- Confirmar quantos itens mostrar em cada secção compacta (valor indicativo: 3–4), mantendo coerência com o protótipo visual já aprovado.

---

## Dependência para a fase seguinte

A **Fase 11 (UI) — Acessibilidade, responsividade e testes E2E de UI** encerra esta via de desenvolvimento, consolidando e auditando **todas** as fases anteriores (1 a 10) como um todo coerente, incluindo agora a página inicial, antes de se iniciar a integração com a API real.

---

> Fase 10 (UI) — a página inicial é a primeira impressão do portal a cada sessão; esta fase garante que nunca fica vazia, quebrada, ou a bloquear à espera de uma única secção.
