# Fase 8 (Integração) — Administração e Auditoria

Via de Integração de Funcionalidades. Assume concluída a Fase 1 (Autenticação, cujos guards e modelo `UserRole` esta fase gere diretamente).

Coerente com `project-spec.md` (secções O e P), `coding-standards.md`, `ai-interaction.md`.

---

## Objetivo

Substituir `UserMockService` e `AuditLogMockService` (Fase 9 da via de UI) por consumo real: gestão de utilizadores com múltiplas funções, proteção real do último `ADMIN`, invalidação de sessões, e — pela primeira vez nesta via — **auditoria real**, escrita automaticamente a partir das ações praticadas nas Fases 1, 5, 6 e 7, não apenas dados ilustrativos.

---

## Âmbito

**Incluído**: endpoints de administração de utilizadores; interceptor/decorator de auditoria, aplicado retroativamente aos módulos já construídos nas fases anteriores desta via; endpoint de consulta de auditoria.

**Fora de âmbito**: exportação de auditoria; relatórios agregados.

---

## Tarefas

### A. Endpoints de utilizadores

- Listar (com filtros por função/estado), criar, alterar nome, `PUT /admin/users/:id/roles` (substitui o conjunto de funções, nunca aceita array vazio), ativar, desativar, invalidar sessões;
- `deactivate` e a remoção de `ADMIN` de um utilizador reutilizam a função utilitária já testada na Fase 2 da via de BD ("último utilizador com `ADMIN`"), agora promovida a regra de serviço real, aplicada de forma transacional (verificação e alteração na mesma transação, para evitar condição de corrida entre dois pedidos concorrentes).

### B. Auditoria real

- Interceptor/decorator reutilizável (`@Audit(action, entityType)` ou equivalente) aplicado aos endpoints de escrita já construídos: login/logout (Fase 1), atribuição/reatribuição/estado de ticket (Fase 6), publicação/arquivo de recurso (Fase 7), gestão de utilizadores (esta fase);
- Cada entrada regista `actorId`, `action`, `entityType`, `entityId`, metadados estritamente necessários, `correlationId` (já existente desde a fundação da API), nunca palavras-passe, tokens ou conteúdo integral de documentos/tickets;
- `GET /admin/audit-log`: paginado, filtrável por tipo de entidade/ator/intervalo de datas.

### C. Ligação da via de UI e testes

- Substituir os serviços mock, preservando a interface da Fase 9 da via de UI;
- Testes de integração: bloqueio de remoção do último `ADMIN` (incluindo teste de concorrência — dois pedidos simultâneos a tentar remover `ADMIN` do mesmo último utilizador, apenas um deve ter sucesso), desativação a invalidar sessões, cada ação relevante das fases anteriores a gerar corretamente uma entrada de auditoria.

---

## Critérios de aceitação

- [ ] Um utilizador sem `ADMIN` é bloqueado em todos os endpoints de administração;
- [ ] Remover `ADMIN` do último utilizador que o possui é bloqueado, mesmo sob concorrência;
- [ ] Desativar um utilizador invalida imediatamente todas as suas sessões;
- [ ] Ações de login, tickets (agente) e conteúdos geram entradas de auditoria reais, verificáveis em `GET /admin/audit-log`;
- [ ] Nenhuma entrada de auditoria contém dados sensíveis proibidos por `project-spec.md`;
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

A Fase 9 (Página Inicial) é a última fase de integração de uma área de UI específica — compõe o que já está ligado nas Fases 3 e 5.

---

> Fase 8 (Integração) — a auditoria só vale alguma coisa se cobrir o que já foi construído antes, não só o que se constrói a partir de agora; por isso esta fase revisita, não apenas adiciona.
