# Fase 5 (Integração) — Suporte (Pedidos do Trabalhador)

Via de Integração de Funcionalidades. Assume concluídas as Fases 1 (Autenticação), 2 (Armazenamento) e 3 (Catálogo, de onde chega a associação de recurso a um novo pedido).

Coerente com `project-spec.md` (secções H, I, J, K), `coding-standards.md`, `ai-interaction.md`.

---

## Objetivo

Substituir `SupportTicketMockService` (Fase 6 da via de UI) por consumo real: criação de pedidos com referência única gerada no servidor, listagem "os meus pedidos", detalhe com histórico de mensagens públicas, resposta, anexos reais (via `StorageService`), confirmação de resolução — sempre com autorização estrita ao solicitante.

---

## Âmbito

**Incluído**: módulo `tickets/` na API; endpoints `POST /tickets`, `GET /tickets/mine`, `GET /tickets/mine/:id`, `POST /tickets/mine/:id/messages`, `POST /tickets/mine/:id/attachments`, `POST /tickets/mine/:id/confirm-resolution`; geração de referência `SUP-AAAA-XXXXXX` no servidor (mecanismo já prototipado na Fase 2 da via de BD, agora promovido a serviço real); anexos reais via `StorageService` (Fase 2 desta via).

**Fora de âmbito**: vista de agente (Fase 6); notas internas (não existem nesta vista, por definição).

---

## Tarefas

### A. Endpoints

- `POST /tickets`: valida assunto/descrição/categoria/prioridade, associa `requesterId` = utilizador autenticado (nunca aceite do corpo do pedido), gera referência única, estado inicial `OPEN`;
- `GET /tickets/mine`: apenas os pedidos do utilizador autenticado — filtro aplicado sempre no servidor a partir da sessão, nunca de um parâmetro do cliente;
- `GET /tickets/mine/:id`: `404` (não `403`) se o pedido não pertencer ao utilizador autenticado;
- `POST /tickets/mine/:id/messages`: mensagem pública, valida que o estado do pedido permite nova resposta;
- `POST /tickets/mine/:id/attachments`: usa `createUploadUrl` do `StorageService`, associa o anexo à mensagem/ticket após confirmação de upload;
- `POST /tickets/mine/:id/confirm-resolution`: só permitido quando `status = RESOLVED`, transita para `CLOSED`.

### B. Ligação da via de UI

- Substituir a implementação interna do `SupportTicketMockService`, preservando a interface consumida pelas páginas "Os meus pedidos", "Novo pedido" e "Detalhe" (Fase 6 da via de UI);
- Confirmar que a pré-associação de recurso vinda da Fase 4/3 desta via continua a funcionar.

### C. Testes

- Testes de integração: criação, unicidade de referência, listagem restrita ao próprio, `404` para pedido de outro utilizador, resposta, upload de anexo real (contra MinIO local em CI, S3/AWS em homologação), confirmação de resolução fora do estado permitido (deve falhar).

---

## Critérios de aceitação

- [ ] Um utilizador nunca acede, por nenhuma via, a um pedido que não seja seu;
- [ ] A referência gerada é única e não previsível;
- [ ] Anexos reais funcionam via `StorageService`, sem bytes a passar pela API;
- [ ] "Confirmar resolução" só funciona quando o estado é `RESOLVED`;
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

A Fase 6 (Gestão de Suporte — Agente) estende o mesmo módulo `tickets/` com as operações de agente (notas internas, atribuição, alteração de estado por terceiros).

---

> Fase 5 (Integração) — a partir daqui, a via já não é só sobre ler dados reais, é sobre um trabalhador confiar que o que escreve fica guardado e protegido.
