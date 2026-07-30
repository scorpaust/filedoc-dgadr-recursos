# Fase 6 (Integração) — Gestão de Suporte (Vista de Agente)

Via de Integração de Funcionalidades. Assume concluída a Fase 5 (Suporte — Trabalhador), cujo módulo `tickets/` esta fase estende.

Coerente com `project-spec.md` (secções H, I, J, K, na perspetiva do agente), `coding-standards.md`, `ai-interaction.md`.

---

## Objetivo

Substituir a extensão de agente do `SupportTicketMockService` (Fase 7 da via de UI) por consumo real: listagem completa de tickets, atribuição, notas internas claramente distintas de mensagens públicas, alteração de categoria/prioridade/estado, associação de recurso, resolução e encerramento — protegido por `RolesGuard` (`SUPPORT_AGENT`, `ADMIN`).

---

## Âmbito

**Incluído**: extensão do módulo `tickets/` com os endpoints de gestão de suporte de `project-spec.md`; proteção por `RolesGuard`; garantia estrutural (já não apenas de UI) de que um trabalhador nunca recebe notas internas, mesmo manipulando pedidos HTTP diretamente.

**Fora de âmbito**: auditoria detalhada das ações de suporte (tratada de forma transversal na Fase 8).

---

## Tarefas

### A. Endpoints

```text
GET   /support/tickets
GET   /support/tickets/:id
PATCH /support/tickets/:id
POST  /support/tickets/:id/messages
POST  /support/tickets/:id/internal-notes
POST  /support/tickets/:id/assign
POST  /support/tickets/:id/resolve
POST  /support/tickets/:id/close
```

- `GET /support/tickets`: todos os tickets, com filtros por estado/categoria/prioridade e pesquisa por referência/assunto/solicitante;
- `GET /support/tickets/:id`: inclui mensagens públicas **e** notas internas — este endpoint só pode ser exposto atrás do `RolesGuard` de agente/admin, nunca reutilizado pela vista do trabalhador (endpoints distintos, não um único endpoint com lógica condicional frágil);
- `POST .../internal-notes`: `visibility: INTERNAL`, nunca devolvido pelos endpoints `mine/*` da Fase 5;
- `PATCH /support/tickets/:id`: categoria/prioridade/estado, com registo automático no histórico (formato consistente, reutilizado da Fase 2 da via de BD);
- `assign`, `resolve`, `close`: conforme já validado na via de UI.

### B. Garantia de isolamento público/interno

- Teste de integração explícito: um pedido autenticado como `EMPLOYEE` a `GET /support/tickets/:id` é rejeitado pelo `RolesGuard` — nunca depende apenas de o frontend não mostrar o botão;
- Confirmar que `GET /tickets/mine/:id` (Fase 5) nunca inclui notas internas, mesmo que o código seja parcialmente partilhado com o endpoint de agente (se partilhado, a serialização de resposta filtra explicitamente por `visibility`).

### C. Ligação da via de UI e testes

- Substituir a extensão mock, preservando a interface da Fase 7 da via de UI (lista + painel de detalhe);
- Testes de integração cobrindo todos os caminhos negativos já identificados na Fase 7 da via de UI.

---

## Critérios de aceitação

- [ ] Um utilizador sem `SUPPORT_AGENT`/`ADMIN` é bloqueado em todos os endpoints de gestão de suporte;
- [ ] Notas internas nunca aparecem em nenhuma resposta destinada à vista do trabalhador, testado diretamente por manipulação de pedidos HTTP, não apenas pela UI;
- [ ] Atribuir, alterar estado/categoria/prioridade, associar recurso, resolver e encerrar funcionam e ficam registados no histórico;
- [ ] Testes de integração e E2E passam.

---

## Comandos de validação

```text
lint
format:check
typecheck
test
test:integration
```

---

## Dependência para a fase seguinte

A Fase 7 (Gestão de Conteúdos) é independente desta fase, mas reutiliza o mesmo padrão de `RolesGuard` e de registo de alterações no histórico/auditoria.

---

> Fase 6 (Integração) — a barreira entre mensagem pública e nota interna deixa de ser uma promessa da interface e passa a ser uma garantia da API.
