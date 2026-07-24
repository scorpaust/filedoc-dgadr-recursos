# Procedimento de *deploy* — Homologação

Ver `context/features/db_ci_cd/fase-5-deploy-homologacao.md` (tarefa F) para a
especificação completa desta fase e `docker-compose.homolog.yml` para a
definição do ambiente. Este documento assume:

- Docker e Docker Compose instalados no anfitrião de homologação (o
  anfitrião concreto — autoalojado pela DGADR ou uma plataforma cloud — é
  uma decisão institucional ainda não confirmada; este procedimento não a
  assume, só exige Docker);
- um ficheiro `.env.homolog` já preenchido nesse anfitrião, fora do
  repositório (ver `.env.homolog.example` para a lista de variáveis);
- a imagem a promover já foi publicada em `ghcr.io` pelo workflow
  `publish-images.yml` (Fase 4), a partir de um *commit* que passou por
  `verify.yml` com sucesso.

## Passos

### 1. Confirmar a origem da imagem

Anotar o *commit*/tag a promover e confirmar que o *pull request*
correspondente passou pelos *checks* obrigatórios (`quality (web)`,
`quality (api)`, `db-validation`, `e2e`) antes do *merge* para `main`:

```bash
gh run list --workflow=publish-images.yml --branch main --limit 5
```

Definir `IMAGE_TAG` em `.env.homolog` com a tag exata (ex.: `sha-1a2b3c4` ou
`v1.2.0`) — nunca `latest`, para que fique sempre claro, a posteriori, o que
está a correr em homologação.

### 2. Aplicar as migrações pendentes

Sempre **antes** de trocar o tráfego para a nova versão da API, e sempre como
passo explícito e visível — nunca automático no arranque do contentor
(decisão já tomada na Fase 3 e mantida aqui):

```bash
DATABASE_URL="postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:<POSTGRES_HOST_PORT>/<POSTGRES_DB>?schema=public" \
  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

Substituir os valores pelos mesmos de `.env.homolog` (a base de dados tem de
estar acessível a partir de onde este comando corre — ver a secção "Rede" de
`.env.homolog.example`). Se ainda não existir nenhuma migração pendente por
outra razão, o comando é seguro e não faz nada (`prisma migrate deploy` é
idempotente).

Antes de qualquer migração potencialmente destrutiva chegar a este ambiente,
confirmar que passou pelo processo de revisão e autorização definido em
`ai-interaction.md` — homologação não é um ambiente descartável para "testar
e ver o que acontece" com alterações estruturais.

### 3. Atualizar os serviços para a nova imagem

```bash
docker compose -f docker-compose.homolog.yml --env-file .env.homolog pull
docker compose -f docker-compose.homolog.yml --env-file .env.homolog up -d
```

`pull_policy: always` (definido no próprio `docker-compose.homolog.yml`)
garante que `up -d` nunca reutiliza uma imagem antiga em cache com a mesma
tag reescrita — mas o `pull` explícito acima já traz a imagem correta antes
de recriar os contentores, tornando o passo seguinte mais rápido.

### 4. Correr os testes de fumo

```bash
scripts/homolog/smoke-test.sh
```

Ou, para um anfitrião remoto:

```bash
scripts/homolog/smoke-test.sh https://<endereço-api>/api/v1 https://<endereço-web>
```

### 5. Confirmar os *health checks*

```bash
docker compose -f docker-compose.homolog.yml ps
```

Confirmar que `api`, `web`, `postgres` e `minio` aparecem como `healthy`
(não apenas `running`) — ver secção "Monitorização" abaixo para o que
acontece quando um `HEALTHCHECK` falha.

### 6. Concluir o *deploy*

O *deploy* só se considera concluído depois de os passos 4 e 5 passarem sem
falhas. Se algum falhar, seguir `docs/rollback-homologacao.md`.

## Monitorização

Sem uma plataforma de alojamento institucional confirmada, o mecanismo de
monitorização mínima desta fase é o nativo do próprio Docker:

- cada imagem já define o seu `HEALTHCHECK` (`apps/api/Dockerfile`,
  `apps/web/Dockerfile`), verificado periodicamente pelo *daemon* Docker;
- `restart: unless-stopped`, em todos os serviços do
  `docker-compose.homolog.yml`, reinicia automaticamente um contentor que
  pare de responder;
- um `HEALTHCHECK` marcado como `unhealthy` de forma persistente é visível
  em `docker compose -f docker-compose.homolog.yml ps` e deve ser tratado
  como um alerta manual até existir um mecanismo de alerta automático — a
  decidir consoante a plataforma que a DGADR vier a confirmar.

`/health` (liveness, sem depender da base de dados) é o que o `HEALTHCHECK`
do contentor da API verifica; `/ready` (readiness, confirma a ligação à base
de dados) destina-se à monitorização externa deste ambiente, não ao
`HEALTHCHECK` do próprio contentor — ver comentários em
`apps/api/src/health/health.controller.ts`.

## Segredos

Nenhum segredo deste ambiente vive no repositório. `.env.homolog.example`
documenta os nomes das variáveis exigidas por `docker-compose.homolog.yml`;
os valores reais ficam apenas em `.env.homolog`, gerado uma única vez com
segredos fortes e exclusivos deste ambiente (nunca reutilizados de
desenvolvimento local nem de produção) e mantido fora do controlo de versões
(`.gitignore`).

## Seed de dados de demonstração

Depois do primeiro `prisma migrate deploy` contra uma base de dados vazia:

```bash
DATABASE_URL="postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:<POSTGRES_HOST_PORT>/<POSTGRES_DB>?schema=public" \
  npm run prisma:seed --workspace apps/api
```

O mesmo seed idempotente da Fase 2 (via de BD) — nunca dados reais de
trabalhadores da DGADR. Os utilizadores de demonstração criados por este
seed usam sempre as mesmas credenciais fixas do código-fonte
(`apps/api/prisma/seed.ts`); tratar como exclusivas deste ambiente e nunca
reutilizadas em desenvolvimento local, mesmo sendo, tecnicamente, os mesmos
valores — qualquer ambiente que corra este seed fica com estas credenciais.
