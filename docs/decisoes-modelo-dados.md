# Decisões do modelo de dados (Fase 1 — BD)

Este documento regista as decisões tomadas na Fase 1 (BD) — Modelo de Dados Completo (`context/features/db_ci_cd/fase-1-bd-modelo-dados.md`), com a respetiva justificação, conforme exigido pelo deliverable #5 dessa especificação.

## Estratégia de identificadores

Todas as entidades usam `String @id @default(cuid())`. Não há requisito de nenhum documento do projeto a impor UUID ou identificadores sequenciais; `cuid()` é nativo do Prisma, não exige dependências adicionais e evita a previsibilidade de IDs sequenciais.

## Timestamps

Todos os campos `DateTime` têm `@db.Timestamptz(3)` explícito. O mapeamento por omissão do Prisma para PostgreSQL é `timestamp(3)` **sem** fuso horário (`timestamp`, não `timestamptz`), o que contraria a regra de `coding-standards.md` ("utilizar UTC na persistência"). Sem este atributo explícito, a base de dados aceitaria valores sem informação de fuso horário, dependendo inteiramente da aplicação para garantir consistência — o que viola também a regra geral de "não depender apenas de validações aplicacionais".

## Regra geral de eliminação (`onDelete`)

`project-spec.md` ("Regras do modelo de dados") estabelece: **"eliminação restrita quando existirem relações relevantes associadas"**. Esta é a regra por omissão adotada para qualquer relação obrigatória (`FK` não anulável) que aponte para `User` ou para uma taxonomia (`Workflow`/`DocumentType`/`Tag`). `Cascade` e `SetNull` só são usados quando há uma justificação específica que os sobrepõe à regra geral, documentada caso a caso abaixo.

Nota: `UserStatus` (`ACTIVE`/`INACTIVE`) sugere que a desativação de conta, não a eliminação da linha `User`, é o mecanismo normal de "remover" um utilizador. A eliminação real de um `User` é, portanto, uma operação pouco frequente (ex.: pedido de eliminação ao abrigo do RGPD), e não uma consequência do uso normal da aplicação — o que reforça `Restrict` como opção segura por omissão: impede que uma eliminação acidental quebre o histórico de recursos/tickets/mensagens, sem impedir uma eliminação deliberada e devidamente tratada ao nível aplicacional (ex.: reatribuição de conteúdos antes de eliminar a conta).

### Exceções à regra geral

| Relação | `onDelete` | Justificação |
| --- | --- | --- |
| `User → UserRole` | `Cascade` | `UserRole` é uma linha de atribuição pura, sem significado fora do utilizador a que pertence — sugerido no próprio `fase-1-bd-modelo-dados.md` como "decisão razoável". |
| `User → Session` | `Cascade` | Sessões são artefactos de segurança derivados, sem valor histórico a preservar. |
| `SupportTicket.assigneeId → User` | `SetNull` | Campo opcional que representa uma atribuição atual e substituível, não um facto histórico como o solicitante. |
| `SupportTicket.relatedResourceId → Resource` | `SetNull` | Referência cruzada fraca e opcional; o ticket mantém-se válido mesmo sem o recurso relacionado. |
| `TicketMessage/TicketAttachment → SupportTicket` | `Cascade` | Filhos do agregado "ticket", sem significado autónomo fora dele. |
| `TicketAttachment.messageId → TicketMessage` | `SetNull` | O anexo pertence primariamente ao ticket; sobrevive mesmo que a mensagem específica desapareça. |
| `Resource → ResourceTag`, `ResourceTag.tagId → Tag` | `Cascade` (Resource) / `Restrict` (Tag) | `ResourceTag` é uma linha de junção pura do lado do recurso (`Cascade`), mas a eliminação de uma `Tag` em uso continua bloqueada (`Restrict`), conforme exigido explicitamente pela especificação para taxonomias. |
| `AuditLog.actorId → User` | `SetNull` (campo opcional) | **Exceção deliberada à regra geral.** O registo de auditoria deve sobreviver à eliminação da conta que praticou a ação — exigência de conformidade explícita em `fase-1-bd-modelo-dados.md`. `actorId` é opcional para permitir esta situação. |

### Aplicação da regra geral (sem exceção)

`Resource.createdById`/`updatedById`, `Tip.createdById`/`updatedById`, `Faq.createdById`/`updatedById`, `SupportTicket.requesterId`, `TicketMessage.authorId`, `TicketAttachment.uploadedById` → todos `Restrict`: são factos históricos obrigatórios (quem criou, quem pediu, quem escreveu), e a especificação é explícita quanto a tickets e mensagens não poderem "desaparecer" pela eliminação do utilizador. `Resource.workflowId`/`documentTypeId → Workflow/DocumentType` → `Restrict`: exigência explícita da especificação, bloqueia eliminar uma taxonomia em uso (o facto de as colunas serem opcionais no `Resource` não colide com `Restrict` — apenas impede eliminar a taxonomia enquanto houver recursos a apontar para ela).

## `ResourceStatus` vs `ContentStatus`

Mantidos como dois enums distintos, apesar de partilharem os mesmos três valores (`DRAFT`/`PUBLISHED`/`ARCHIVED`) — decisão já recomendada no próprio `fase-1-bd-modelo-dados.md`, para não acoplar a evolução futura do ciclo editorial de recursos ao de dicas/FAQ.

## Referência do ticket (`SupportTicket.reference`)

Gerada na camada aplicacional (formato `SUP-AAAA-XXXXXX`), não pela base de dados — o schema garante apenas a restrição de unicidade (`@unique`), sem `@default`. Consistente com o padrão já usado por `SupportTicketMockService.createTicket` na via de UI (Fase 6).

## Taxonomias como tabelas geridas, não enums fechados

`Workflow`, `DocumentType` e `Tag` são modelados como tabelas (`slug` único, `isActive`, `sortOrder`), não como enums Prisma fechados — `project-spec.md` refere explicitamente "fluxos iniciais"/"tipos de documento iniciais" e a possibilidade de administradores/editores gerirem estas taxonomias (criar, ativar/desativar, ordenar). Isto diverge da via de UI (Fase 3), que usou uniões literais TypeScript como mock — divergência esperada e já assumida pela especificação desta fase.

## Validação de variáveis de ambiente no arranque

A aplicação usa `@nestjs/config` com uma função `validate` própria (`apps/api/src/config/env.validation.ts`) que rejeita o arranque sem `DATABASE_URL` definida. Não foi introduzida uma biblioteca de validação de esquema (Joi/Zod) — nenhum documento do projeto impõe uma em concreto, e esta fase só exige validar uma variável obrigatória; a reavaliar se o número de variáveis obrigatórias crescer em fases seguintes (sessão, armazenamento, etc.).

## Índices além do mínimo explícito da especificação

Além dos índices pedidos explicitamente (§H de `fase-1-bd-modelo-dados.md`), foram acrescentados, seguindo a regra geral de `project-spec.md` ("índices nos campos utilizados em pesquisa e filtros"):

- `User.status` (filtro de utilizadores ativos/inativos na administração, Fase 9 da via de UI);
- `Workflow.isActive` / `DocumentType.isActive` (filtragem de taxonomias ativas nos filtros do catálogo);
- `Faq.category` (agrupamento por categoria, Fase 5 da via de UI);
- `SupportTicket.category`, `SupportTicket.priority`, `SupportTicket.createdAt` (filtros e ordenação da gestão de suporte, Fase 7 da via de UI);
- `TicketMessage.ticketId`, `TicketAttachment.ticketId`, `TicketAttachment.messageId` (o Prisma, ao contrário do MySQL, não cria automaticamente um índice para colunas de chave estrangeira no PostgreSQL — sem estes índices explícitos, carregar a timeline/anexos de um ticket faria uma pesquisa sem índice);
- `ResourceTag.tagId` (pelo mesmo motivo — pesquisar "todos os recursos com esta etiqueta" sem índice explícito);
- `AuditLog.actorId`, `AuditLog.correlationId` (histórico de auditoria por autor e por correlação de pedidos).

## `Session.tokenHash` único

Não pedido explicitamente pela especificação, mas adicionado por segurança: impede duas sessões com o mesmo hash de token, garantindo ao nível da base de dados (não apenas da aplicação) que cada token representa exatamente uma sessão.
