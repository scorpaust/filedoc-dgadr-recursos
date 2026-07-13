# Fase 7 (UI) — Gestão de Suporte (Vista de Agente)

Esta especificação define a **sétima fase da via de desenvolvimento do UI** do **Filedoc Recursos Formativos**, em Angular, com dados simulados (mock) — sem ligação à API NestJS.

Assume como ponto de partida a Fase 1 (Design System), a Fase 2 (Autenticação) e, sobretudo, a Fase 6 (Suporte — pedidos do trabalhador), cujo `SupportTicketMockService` e componente de linha do tempo são estendidos nesta fase.

Coerente com `project-spec.md` (secções H, I, J e K, agora na perspetiva do agente de suporte), `project-overview.md`, `coding-standards.md` e `ai-interaction.md`.

---

## Objetivo

No final desta fase, deve ser possível, sem qualquer API real, com um utilizador mock `SUPPORT_AGENT` (ou `ADMIN`):

- aceder a `/suporte/gestao` e ver **todos** os pedidos de suporte (não apenas os próprios, ao contrário da Fase 6), com filtros por estado e pesquisa por referência/assunto/solicitante;
- selecionar um pedido numa lista e ver o respetivo painel de detalhe, tal como validado no protótipo (lista à esquerda, detalhe à direita, com atualização ao clicar);
- ver, no histórico do pedido, tanto as mensagens públicas como as **notas internas**, claramente distinguidas visualmente (contorno tracejado, etiqueta "Nota interna");
- responder publicamente ou registar uma nota interna, através do mesmo campo de resposta com uma alternância clara entre os dois modos;
- assumir um pedido ("Atribuir a mim"), reatribuir a outro agente mock, alterar categoria, prioridade e estado, associar um recurso formativo (reutilizando os dados mock da Fase 3), marcar como resolvido e encerrar;
- confirmar que um utilizador mock `EMPLOYEE` não consegue aceder a `/suporte/gestao` (bloqueado pelo `roleGuard` já construído na Fase 2), sendo redirecionado para a página de acesso negado.

Não existe nesta fase: qualquer chamada HTTP real, nem notificação real ao trabalhador quando o agente responde (a atualização é apenas visível ao trabalhador se voltar a consultar o próprio pedido, já que ambos os módulos partilham o mesmo `SupportTicketMockService` em memória).

---

## Âmbito

### Incluído

- Extensão do `SupportTicketMockService` (Fase 6) com as operações de agente: `listAll(filters)`, `assign(ticketId, agentId)`, `addInternalNote(ticketId, content)`, `updateCategory`, `updatePriority`, `updateStatus`, `associateResource(ticketId, resourceId)`, `resolve(ticketId)`, `close(ticketId)`;
- Página `/suporte/gestao` (`features/support-management`), protegida por `roleGuard` (`SUPPORT_AGENT`, `ADMIN`);
- Lista de pedidos (painel esquerdo) com chips de filtro por estado e pesquisa por texto;
- Painel de detalhe (painel direito), reutilizando e estendendo o componente de linha do tempo da Fase 6 para suportar notas internas;
- Caixa de resposta com alternância "Resposta pública" / "Nota interna" (ex.: `switch`/checkbox, tal como no protótipo);
- Ações do agente: atribuir a mim, reatribuir, alterar categoria/prioridade/estado, associar recurso, marcar resolvido, encerrar;
- Conjunto de utilizadores mock adicionais com função `SUPPORT_AGENT`, para testar atribuição e reatribuição.

### Fora de âmbito

- Notificações por correio eletrónico ao trabalhador (Segunda Fase do roadmap geral do produto);
- Relatórios ou indicadores agregados de suporte (Segunda Fase);
- Regras reais de autorização (isso é responsabilidade do backend); nesta fase, a autorização é simulada exclusivamente pelo `roleGuard` já existente;
- Auditoria (Fase 9 — Administração, onde a UI de auditoria é construída).

---

## Entregáveis

1. Página `/suporte/gestao` funcional, protegida por função;
2. `SupportTicketMockService` estendido com as operações de agente, testado;
3. Componente de linha do tempo estendido para notas internas, testado;
4. Fluxo completo validado: assumir, responder/anotar, alterar estado, associar recurso, resolver, encerrar.

---

## Tarefas

### A. Extensão do serviço mock

- `listAll(filters?: { status?, query? }): Ticket[]` — devolve todos os pedidos, independentemente do solicitante;
- `assign(ticketId, agentId)`: define o responsável;
- `addInternalNote(ticketId, content)`: adiciona uma entrada ao histórico com `visibility: 'INTERNAL'`, autor = agente atual;
- `updateCategory` / `updatePriority` / `updateStatus`: alteram o campo correspondente e registam a alteração no histórico (ex.: "Carlos Vieira alterou o estado para Em tratamento"), para consistência com o padrão de histórico cronológico já estabelecido;
- `associateResource(ticketId, resourceId)`: liga o pedido a um recurso mock (reutilizando os dados da Fase 3), sem duplicar os dados do recurso — apenas a referência;
- `resolve(ticketId)` / `close(ticketId)`: idênticos aos já existentes na Fase 6, mas acessíveis a partir da vista de agente e sem a restrição de "só o solicitante";
- Testes unitários de cada operação, incluindo o registo correto no histórico.

### B. Lista de pedidos (painel esquerdo)

- Chips de filtro por estado (Todos, Aberto, Em tratamento, A aguardar resposta, Resolvido — tal como no protótipo);
- Campo de pesquisa por referência, assunto ou nome do solicitante;
- Cada linha mostra: referência (`CarimboComponent`), assunto, categoria, prioridade e estado, com indicação visual do item selecionado;
- Selecionar uma linha atualiza o painel de detalhe sem recarregar a página (Signals, não navegação de rota, tal como validado no protótipo — decisão a confirmar: pode também usar rota com parâmetro, se preferível para permitir partilhar o URL de um pedido específico).

### C. Painel de detalhe (painel direito)

- Cabeçalho: referência, assunto, solicitante, categoria, prioridade, estado, com ações "Atribuir a mim" e "Associar recurso";
- Linha do tempo: mensagens públicas e notas internas intercaladas cronologicamente, com as notas internas visualmente distintas (contorno tracejado, etiqueta "Nota interna" bem visível, nunca ambígua);
- Caixa de resposta com alternância clara entre "Resposta pública" e "Nota interna" — o modo escolhido deve ser óbvio antes de submeter, para evitar que uma nota interna seja enviada como pública por engano (ou vice-versa);
- Controlo de alteração de estado (ex.: `select`), com as transições visualmente coerentes com `project-spec.md`;
- Ação "Marcar resolvido" (visível quando o estado permite) e "Encerrar".

### D. Associação de recurso

- Diálogo ou painel simples (reutilizando o `DialogComponent` da Fase 1) para pesquisar e selecionar um recurso mock (reutilizando o `ResourceMockService` da Fase 3) a associar ao pedido;
- O recurso associado passa a ser visível no cabeçalho do detalhe do pedido, com atalho para abrir o respetivo `/recursos/:slug`.

### E. Proteção por função

- `/suporte/gestao` só acessível a `SUPPORT_AGENT`/`ADMIN` (via `roleGuard`, Fase 2);
- Testar explicitamente, com a ferramenta de simulação de função, que `EMPLOYEE` e `CONTENT_EDITOR` são redirecionados para a página de acesso negado.

---

## Critérios de aceitação

- [ ] `/suporte/gestao` lista todos os pedidos mock, independentemente do solicitante;
- [ ] Os filtros por estado e a pesquisa funcionam corretamente;
- [ ] Selecionar um pedido atualiza o painel de detalhe corretamente;
- [ ] O histórico mostra mensagens públicas e notas internas claramente distinguidas;
- [ ] A alternância "Resposta pública" / "Nota interna" é inequívoca antes de submeter;
- [ ] Atribuir, reatribuir, alterar categoria/prioridade/estado e associar recurso funcionam e ficam refletidos no histórico e no cabeçalho;
- [ ] "Marcar resolvido" e "Encerrar" respeitam as transições de estado esperadas;
- [ ] Um utilizador mock `EMPLOYEE` ou `CONTENT_EDITOR` é bloqueado ao tentar aceder a `/suporte/gestao`;
- [ ] Ao voltar à vista do trabalhador (Fase 6) com o mesmo pedido, as respostas e alterações de estado do agente são visíveis (mesmo `SupportTicketMockService` em memória);
- [ ] Testado sem sobreposição ou corte nas cinco larguras de referência (320–1440 px), incluindo o colapso do painel de lista+detalhe para uma coluna em ecrãs estreitos;
- [ ] Testes unitários do serviço estendido e dos novos componentes passam;
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

- Confirmar se a seleção de um pedido na lista atualiza o painel via estado local (Signals) ou via navegação com parâmetro de rota (`/suporte/gestao/:id`) — a segunda opção permite partilhar o link de um pedido específico, mas exige mais trabalho de sincronização; decisão a documentar;
- Confirmar a lista de utilizadores mock com função `SUPPORT_AGENT` suficiente para testar reatribuição de forma realista (mínimo dois agentes);
- O registo automático de alterações no histórico (ex.: mudanças de estado) deve seguir um formato de texto consistente, a definir nesta fase e a reutilizar tal e qual quando a API real gerar estas entradas.

---

## Dependência para a fase seguinte

A **Fase 8 (UI) — Gestão de conteúdos** é, na prática, independente desta fase e pode avançar em paralelo. Ambas reutilizam o mesmo padrão de "lista + painel de detalhe" e de proteção por função já validado aqui.

---

> Fase 7 (UI) — a distinção entre resposta pública e nota interna nunca pode ser ambígua; esta fase garante isso visualmente antes de a API alguma vez ter de o garantir tecnicamente.
