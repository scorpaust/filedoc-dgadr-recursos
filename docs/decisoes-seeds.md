# Decisões dos seeds e da validação de dados (Fase 2 — BD)

Este documento regista as decisões tomadas na Fase 2 (BD) — Seeds e Validação de Dados
(`context/features/db_ci_cd/fase-2-bd-seeds-validacao.md`), com a respetiva justificação,
complementando `docs/decisoes-modelo-dados.md` (Fase 1).

## Estrutura dos seeds

`apps/api/prisma/seed-data/` contém apenas dados (constantes tipadas, sem efeitos
secundários); `apps/api/prisma/seeds/` contém uma função por grupo de entidades
(`seedTaxonomias`, `seedUsers`, `seedResources`, `seedTipsAndFaqs`, `seedSupportTickets`),
cada uma responsável por transformar os dados e persisti-los; `apps/api/prisma/seed.ts`
orquestra as cinco, pela ordem de dependência (taxonomias e utilizadores antes de recursos;
recursos antes de tickets, por causa de `relatedResourceId`).

## Idempotência: chave de `upsert` por entidade

Todas as entidades semeadas usam `upsert`, nunca `create` direto, mas a chave usada varia
consoante o campo único disponível:

| Entidade | Chave de `upsert` | Motivo |
| --- | --- | --- |
| `Workflow`/`DocumentType`/`Tag` | `slug` | já `@unique` no modelo (Fase 1). |
| `User` | `email` | já `@unique` no modelo. |
| `Resource` | `slug` | já `@unique` no modelo. |
| `SupportTicket` | `reference` | já `@unique` no modelo. |
| `UserRole` | `userId_role` (composto) | chave primária composta já existente. |
| `ResourceTag` | `resourceId_tagId` (composto) | chave primária composta já existente. |
| `Tip`/`Faq` | `id` determinístico (`seed-tip-N`/`seed-faq-N`) | nenhum destes modelos tem um campo único além de `id` — decisão desta fase. |
| `TicketMessage` | `id` determinístico (`seed-ticket-N-msg-M`) | idem; sem campo único natural para uma mensagem individual. |

Os ids determinísticos usam sempre o prefixo `seed-`, para nunca colidirem com os `cuid()`
gerados pela aplicação em uso normal, e para serem reconhecíveis como dados de seed.

## Conjunto de etiquetas (`Tag`) e associação a recursos

A tarefa A pede um conjunto inicial de 10–15 etiquetas genéricas. `resources.mock.ts` (via
de UI, Fase 3) usa mais de 40 etiquetas distintas, muitas delas demasiado específicas para
uma taxonomia inicial. Foram escolhidas 12 etiquetas genéricas já usadas nesse mock
(`registo`, `correspondência`, `assinatura`, `tramitação`, `pesquisa`, `arquivo`,
`correção`, `anexos`, `permissões`, `classificação`, `organização`, `modelo`); cada recurso
semeado só fica associado ao subconjunto das suas etiquetas originais que também exista
nesta lista — alguns recursos (3 dos 24) ficam sem nenhuma etiqueta, por nenhuma das suas
etiquetas originais ser suficientemente genérica.

## Autoria de recursos, dicas e perguntas frequentes

`resources.mock.ts` atribui um campo `author` (texto livre) sem qualquer validação contra a
função do utilizador — por exemplo, atribui vários recursos a "Marta Silva", cuja única
função é `EMPLOYEE`. Como `Resource.createdById`/`updatedById` são chaves estrangeiras
reais nesta fase, a autoria foi reatribuída aos dois utilizadores com função de edição de
conteúdo (`joao`/`ana` — `CONTENT_EDITOR`/`ADMIN`), alternados de forma determinística. O
mesmo se aplica a `Tip`/`Faq`. Título/resumo/descrição/conteúdo dos recursos, dicas e FAQ
mantêm-se exatamente como no mock, conforme exigido pela tarefa C.

## Campo `title` de `Tip`

O modelo `Tip` (Fase 1) tem `title` e `content` como campos distintos, mas
`tips.mock.ts` (via de UI, Fase 5) só guardava uma única frase. Os títulos usados no seed
foram escritos de novo nesta fase (curtos, descritivos); `content` reutiliza a frase
original do mock/`project-spec.md` tal e qual.

## Categoria adicional de FAQ e categoria adicional de ticket

- `seed-faq-7` é novo nesta fase (categoria "Recursos formativos"), para cobrir uma
  terceira categoria distinta de FAQ, conforme pedido pela tarefa C ("mais alguns
  adicionais para cobrir categorias diferentes").
- `seed-ticket-8` é novo nesta fase (categoria `OTHER`, "Outra questão"), a única das sete
  categorias de tickets de `project-spec.md` ainda sem exemplo nos 7 pedidos herdados do
  mock da via de UI (Fase 6); demonstra também o histórico completo exigido pela tarefa D
  (mensagem de criação, mensagem pública do trabalhador, nota interna do agente, resposta
  pública do agente, resolução e confirmação).

## Referência do ticket: geração real vs. dados de seed fixos

`apps/api/src/support/ticket-reference.util.ts` implementa a geração real (`nanoid`,
alfabeto sem carateres ambíguos, mesmo padrão já usado por `SupportTicketMockService` na
via de UI) — reutilizável tal e qual pela futura camada de serviços, conforme o risco em
aberto da especificação. Os 8 pedidos de suporte do seed usam, no entanto, referências
**fixas** (literais, herdadas 7 delas do mock da via de UI), não geradas dinamicamente: um
seed idempotente precisa de uma chave estável para o `upsert`, o que uma referência gerada
a cada execução impediria. O utilitário é validado por testes unitários isolados e por um
teste de integração que o usa para criar um pedido real (limpo no final do teste).

## Regra do último `ADMIN`

`apps/api/src/users/admin-guard.util.ts` implementa `assertCanRemoveAdminRole` como função
pura, sem camada de serviço (ainda não existe nesta via — só chega na via de integração de
funcionalidades). Testada isoladamente (testes unitários) e também contra dados reais
(teste de integração que reduz temporariamente os `ADMIN` do seed a um só, confirma o
bloqueio, e repõe o estado seguidamente).

## Palavras-passe de desenvolvimento

`@node-rs/argon2` (não `argon2`) — mesma família de algoritmo (Argon2id) exigida por
`project-spec.md`, mas com binários pré-compilados para todas as plataformas (incluindo
Windows), evitando uma dependência de compilação nativa (`node-gyp`) desnecessária para
esta fase. Todos os utilizadores de desenvolvimento partilham a mesma palavra-passe
(`Demo123!`, já usada por `mock-credentials.ts` na via de UI), sempre com hash real —
nunca em texto simples, mesmo sendo dados de desenvolvimento.

## Base de dados de testes de integração

Seguindo a recomendação de `coding-standards.md` ("Integração: utilizar PostgreSQL
isolado"), os testes de integração desta fase correm contra uma base de dados PostgreSQL
efémera e isolada da base de dados de desenvolvimento partilhada:

- localmente, um serviço adicional `postgres-test` em `docker-compose.yml` (perfil `test`,
  porta `5434`, sem volume persistente — arrancado com
  `docker compose --profile test up -d postgres-test`);
- no CI, o serviço `postgres` já provisionado pelo `ci.yml` (job efémero do próprio
  runner), sem necessidade de um segundo contentor.

`test/integration/setup/global-setup.ts` aplica as migrações (`prisma migrate deploy`) e
semeia essa base de dados uma única vez, antes de toda a suite; os módulos `prisma/seed.ts`
e `@prisma/client` são carregados com `require` (não `import`, estático ou dinâmico) dentro
da função de setup, depois de `dotenv.config` — ambos resolvem a `DATABASE_URL` como efeito
do próprio carregamento do módulo, o que um `import` (içado para o topo do ficheiro) ou um
`import()` dinâmico (resolvido pelo carregador ESM nativo do Node, fora do alcance da
transformação `ts-jest`) tornariam demasiado cedo ou inoperante, respetivamente.

## Verificação das restrições de negócio

As três restrições estruturais da Fase 1 (`Restrict` em taxonomias, unicidade de
`slug`/`reference`) são confirmadas com tentativas reais de violação contra a base de dados
de testes, capturando o código de erro do Prisma (`P2003` para violação de chave
estrangeira/`Restrict`, `P2002` para violação de unicidade) — não apenas verificadas
estruturalmente no schema.
