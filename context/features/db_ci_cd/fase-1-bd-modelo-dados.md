# Fase 1 (BD) — Modelo de Dados Completo

Esta especificação define a **primeira fase da via de Base de Dados e Deployment Inicial** do **Filedoc Recursos Formativos**, iniciada depois de concluída a via de UI (Fases 1 a 11, com dados mock). Inclui a inicialização do Prisma e da ligação ao PostgreSQL de desenvolvimento, e o modelo de dados completo — não depende de nenhuma fase full-stack anterior.

Serve de referência o documento `docs/interfaces-mock-ui.md`, produzido na Fase 11 da via de UI, que regista o contrato (formas de dados) que os serviços mock já validaram junto da interface — este schema deve conseguir sustentar esses contratos sem os distorcer.

Coerente com `project-spec.md` (secção "Dados" e "Regras do modelo de dados"), `project-overview.md` e `coding-standards.md`.

---

## Objetivo

No final desta fase, deve existir um `schema.prisma` completo, migrado com sucesso contra o PostgreSQL de desenvolvimento, cobrindo **todas** as entidades de `project-spec.md`:

```text
USER · USERROLE · SESSION
RESOURCE · WORKFLOW · DOCUMENTTYPE · TAG · RESOURCETAG
TIP · FAQ
SUPPORTTICKET · TICKETMESSAGE · TICKETATTACHMENT
AUDITLOG
```

com todos os enums, relações, restrições de unicidade, índices e comportamentos de eliminação definidos de forma consciente — nunca por omissão.

Não existe nesta fase: lógica de negócio, endpoints da API, nem seeds de conteúdo (Fase 2). O objetivo é exclusivamente o schema, as migrações e a integridade estrutural dos dados.

---

## Âmbito

### Incluído

- Extensão do `schema.prisma` com todas as entidades e enums em falta;
- Migração(ões) Prisma versionadas para cada grupo coerente de alterações (não uma única migração gigante — ver tarefas);
- Índices para todos os campos usados em pesquisa, filtros, unicidade e ordenação, conforme `project-spec.md`;
- Restrições de integridade referencial e de unicidade (e-mail, slug de recurso, referência de ticket, chave composta de `USERROLE`/`RESOURCETAG`);
- Definição consciente do comportamento de eliminação (`onDelete`) em cada relação, nunca `Cascade` por defeito sem avaliação explícita;
- Bloqueio, ao nível do schema e/ou de constraints, da eliminação de uma taxonomia (`WORKFLOW`/`DOCUMENTTYPE`/`TAG`) associada a recursos existentes (`RESOURCETAG`/`RESOURCE`) — ou, quando o Prisma não o conseguir expressar diretamente, documentação clara de que a validação aplicacional (Fase de serviços/endpoints) é obrigatória para complementar esta restrição.

### Fora de âmbito

- Seeds de dados (Fase 2 desta via);
- Endpoints NestJS que consomem este schema (via de integração de funcionalidades, mais adiante);
- Otimização de queries além dos índices estruturais óbvios (validada com dados reais na Fase 2);
- Particionamento, réplicas, ou qualquer otimização de infraestrutura de base de dados além de um único PostgreSQL (fora do âmbito do MVP, conforme `project-spec.md`).

---

## Entregáveis

1. `docker-compose.yml` mínimo com PostgreSQL, e `apps/api` ligado a ele via `DATABASE_URL`;
2. `schema.prisma` completo, formatado (`prisma format`) e validado (`prisma validate`);
3. Migrações Prisma versionadas, uma por grupo coerente de entidades;
4. `prisma migrate status` limpo;
5. Documento breve (`docs/decisoes-modelo-dados.md` ou secção em `project-overview.md`) registando as decisões de `onDelete` tomadas e a respetiva justificação.

---

## Tarefas

### A. Inicialização do Prisma e ligação à base de dados

- Inicializar o Prisma dentro de `apps/api`;
- Configurar `DATABASE_URL` via variável de ambiente, documentada em `.env.example`, sem valores reais no repositório;
- Configurar um `docker-compose.yml` mínimo com PostgreSQL (com *health check* e volume persistente), suficiente para desenvolvimento local desta via;
- Confirmar a ligação com `prisma validate`/uma primeira migração vazia antes de avançar para o modelo de dados completo;
- Validar as variáveis de ambiente no arranque da aplicação (a aplicação não deve arrancar sem `DATABASE_URL` definida).

### B. Enums

Definir, em Prisma, os enums correspondentes aos valores fechados de `project-spec.md`:

```text
enum Role            { EMPLOYEE CONTENT_EDITOR SUPPORT_AGENT ADMIN }
enum UserStatus      { ACTIVE INACTIVE }
enum ResourceType     { VIDEO PDF_GUIDE }
enum Difficulty       { INICIACAO INTERMEDIA AVANCADA }
enum ResourceStatus   { DRAFT PUBLISHED ARCHIVED }
enum ContentStatus    { DRAFT PUBLISHED ARCHIVED }   // partilhado por TIP e FAQ, a confirmar se compensa unificar com ResourceStatus
enum TicketCategory   { ACCESS_PERMISSIONS REGISTRATION ROUTING SIGNATURE SEARCH_ARCHIVE TECHNICAL_ERROR OTHER }
enum TicketPriority   { LOW NORMAL HIGH BLOCKING }
enum TicketStatus     { OPEN IN_PROGRESS WAITING_FOR_USER RESOLVED CLOSED }
enum MessageVisibility{ PUBLIC INTERNAL }
```

- Confirmar, antes de avançar, se `ResourceStatus` e `ContentStatus` (dicas/FAQ) devem ser o mesmo enum ou dois distintos — ambos têm os mesmos três valores (`rascunho`/`publicado`/`arquivado`), mas representam conceitos diferentes; decisão a documentar.

### C. `USER` e `USERROLE`

- Definir `User` sem qualquer campo `role` singular — apenas a relação com `UserRole`;
- `UserRole`: chave primária composta (`userId`, `role`), `role` do tipo enum `Role`, relação `onDelete: Cascade` a partir de `User` (quando um utilizador é eliminado, as suas atribuições de função são eliminadas com ele — decisão razoável, a confirmar);
- Índice em `UserRole.role`, para consultas do tipo "listar todos os `ADMIN`";
- Restrição a nível aplicacional (não expressável diretamente em Prisma): um utilizador nunca fica sem nenhuma função — a documentar aqui como responsabilidade da camada de serviço, a implementar na via de funcionalidades.

### D. `RESOURCE` e taxonomias

- `Workflow`, `DocumentType`, `Tag`: seguir a estrutura de `project-spec.md`, com `slug` único, `isActive`, `sortOrder`;
- `Resource`: todos os campos de `project-spec.md`, com `slug` único, `status` (`ResourceStatus`), relações para `Workflow`/`DocumentType` (opcionais ao nível do schema — a obrigatoriedade de preenchimento para publicar é regra aplicacional, não estrutural), `createdById`/`updatedById` a referenciar `User`;
- `ResourceTag`: chave composta (`resourceId`, `tagId`);
- Índices: `Resource.slug` (único), `Resource.status`, `Resource.resourceType`, `Resource.workflowId`, `Resource.documentTypeId`, `Resource.difficulty`, `Resource.publishedAt` (para ordenação por recência);
- `onDelete` de `Workflow`/`DocumentType`/`Tag` em relação a `Resource`/`ResourceTag`: usar `Restrict` (nunca `Cascade`), coerente com a regra de `project-spec.md` de bloquear eliminação de taxonomias em uso.

### E. `TIP` e `FAQ`

- Campos conforme `project-spec.md`, com `status`, `sortOrder`, `createdById`/`updatedById`;
- `Faq.category` como campo de texto simples opcional nesta fase (não uma tabela de categorias própria, que `project-spec.md` não exige);
- Índices em `status` e `sortOrder` para as listagens ordenadas.

### F. `SUPPORTTICKET`, `TICKETMESSAGE`, `TICKETATTACHMENT`

- `SupportTicket`: `reference` único (formato `SUP-AAAA-XXXXXX`, gerado pela aplicação, não pela base de dados — o schema apenas garante a restrição de unicidade), `category`, `priority`, `status` (enums), `requesterId`/`assigneeId` a referenciar `User` (`assigneeId` opcional), `relatedResourceId` opcional a referenciar `Resource`;
- `TicketMessage`: `visibility` (`MessageVisibility`), `authorId` a referenciar `User`;
- `TicketAttachment`: `objectKey`, `originalName`, `mimeType`, `size`, associado a `ticketId` e opcionalmente a `messageId`;
- Índices: `SupportTicket.reference` (único), `SupportTicket.status`, `SupportTicket.requesterId`, `SupportTicket.assigneeId`;
- `onDelete` de `User` em relação a tickets: nunca `Cascade` (um ticket não deve desaparecer se o solicitante for eliminado) — usar `Restrict` ou manter o histórico com referência nula, a decidir e documentar; a mesma pergunta aplica-se a `TicketMessage.authorId`.

### G. `AUDITLOG`

- Campos conforme `project-spec.md`: `actorId`, `action`, `entityType`, `entityId`, `metadata` (JSON), `correlationId`, `createdAt`;
- Índice em `entityType` + `entityId` (consultas do tipo "histórico deste recurso") e em `createdAt` (ordenação/retenção);
- `onDelete` de `User` em relação a `AuditLog.actorId`: nunca `Cascade` — o registo de auditoria deve sobreviver à eliminação da conta que praticou a ação (manter o `actorId` como referência histórica, mesmo que a conta deixe de existir, ou tornar o campo opcional — decisão a documentar com atenção, por ser sensível do ponto de vista de conformidade).

### H. Índices e integridade referencial (revisão transversal)

- Rever, no final, todos os campos usados em pesquisa/filtros/ordenação em `project-spec.md` (catálogo, tickets, utilizadores, auditoria) e confirmar que todos têm índice correspondente;
- Confirmar que todas as relações têm uma decisão explícita de `onDelete`, documentada, nenhuma deixada ao valor por defeito sem análise.

### I. Migrações

- Uma migração por grupo coerente (ex.: `add_resource_taxonomies`, `add_tips_faqs`, `add_support_tickets`, `add_audit_log`, `add_user_roles`), não uma única migração com tudo;
- Nome descritivo em cada uma;
- `prisma migrate dev` em desenvolvimento, nunca `prisma db push`;
- `prisma migrate status` limpo no final.

---

## Critérios de aceitação

- [ ] `docker compose up` arranca o PostgreSQL de desenvolvimento sem erros, com `apps/api` capaz de se ligar via `DATABASE_URL`;
- [ ] `schema.prisma` cobre todas as entidades de `project-spec.md`, sem campos em falta;
- [ ] `prisma format` e `prisma validate` passam sem alterações pendentes;
- [ ] `prisma migrate status` não acusa divergências;
- [ ] Todas as migrações têm nomes descritivos e correspondem a grupos coerentes de alterações;
- [ ] Restrições de unicidade confirmadas: `User.email`, `Resource.slug`, `SupportTicket.reference`, chaves compostas de `UserRole` e `ResourceTag`;
- [ ] Todos os índices de pesquisa/filtro/ordenação identificados em `project-spec.md` estão presentes;
- [ ] Cada `onDelete` foi uma decisão explícita e está documentada, nenhum `Cascade` usado sem justificação registada;
- [ ] A eliminação de uma taxonomia em uso é impedida (ao nível do schema com `Restrict`, complementado pela camada aplicacional mais tarde);
- [ ] O schema sustenta, sem distorção, as formas de dados registadas em `docs/interfaces-mock-ui.md`;
- [ ] `USER` já não tem um campo de função singular — apenas a relação com `UserRole`.

---

## Comandos de validação

```text
docker compose up
prisma format
prisma validate
prisma migrate dev
prisma migrate status
```

---

## Riscos e decisões em aberto

- Confirmar se `ResourceStatus` e `ContentStatus` (dicas/FAQ) são o mesmo enum ou dois distintos — recomenda-se dois enums distintos, mesmo com valores iguais, para não acoplar a evolução futura de um ciclo editorial ao do outro;
- As decisões de `onDelete` em `SupportTicket`, `TicketMessage` e `AuditLog` têm implicações de retenção de dados e de conformidade com o RGPD (`project-spec.md`, secção de Privacidade) — devem ser revistas com atenção, não apenas por conveniência técnica;
- Confirmar se `Faq.category` deve evoluir para uma tabela própria numa fase posterior (caso o número de categorias cresça e precise de gestão própria, semelhante às taxonomias de recursos) — não é necessário agora, mas vale documentar a possibilidade.

---

## Dependência para a fase seguinte

A **Fase 2 (BD) — Seeds e Validação de Dados** assume como ponto de partida:

- o schema completo e migrado desta fase;
- o registo de decisões de `onDelete`, para que os seeds e os testes de query respeitem o comportamento definido (ex.: não tentar eliminar uma taxonomia em uso à espera que funcione).

---

> Fase 1 (BD) — o modelo de dados é o alicerce que todas as funcionalidades da via de integração vão assumir como certo; qualquer inconsistência aqui propaga-se para todas as fases seguintes.
