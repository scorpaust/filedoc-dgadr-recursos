# Filedoc Recursos Formativos

Monorepo (npm workspaces) com a aplicação Angular (`apps/web`) e a API NestJS + Prisma (`apps/api`).

## Estrutura

```text
apps/
├── web/    # Angular — ver apps/web/README.md
└── api/    # NestJS + Prisma
docs/       # documentação técnica (contratos, decisões de modelo de dados)
context/    # especificações e contexto do projeto
```

## Base de dados de desenvolvimento

```bash
docker compose up -d
```

Arranca um PostgreSQL local (porta `5433` no anfitrião — evita conflito com uma eventual instância nativa de PostgreSQL na porta 5432 por omissão; credenciais em `docker-compose.yml`). Ver `apps/api/.env.example` para a variável `DATABASE_URL` esperada.

## Base de dados de testes de integração

```bash
docker compose --profile test up -d postgres-test
```

Arranca um segundo PostgreSQL efémero e isolado (porta `5434`, sem volume persistente),
usado exclusivamente pelos testes de integração (`npm run test:integration --workspace
apps/api`). Ver `apps/api/.env.test.example` para a variável `DATABASE_URL` esperada.

## Instalação

```bash
npm install
```

Instala as dependências de ambos os workspaces (`apps/web` e `apps/api`).

## Desenvolvimento

```bash
npm start              # apps/web — ng serve
npm run api:start:dev  # apps/api — Nest em modo watch
```

## Validação

```bash
npm run lint            # apps/web
npm run format:check    # apps/web
npm run typecheck       # apps/web
npm test                # apps/web
npm run test:e2e        # apps/web
npm run build           # apps/web

npm run api:lint
npm run api:format:check
npm run api:typecheck
npm run api:build

npm test --workspace apps/api               # testes unitários
npm run test:integration --workspace apps/api  # testes de integração (ver secção acima)
```

## Prisma (`apps/api`)

```bash
npm run prisma:generate
npm run prisma:migrate   # prisma migrate dev
npm run prisma:validate
npm run prisma:status    # prisma migrate status
```

Ver `docs/decisoes-modelo-dados.md` para as decisões de modelo de dados (estratégia de IDs, timestamps, comportamentos de eliminação).

## Seeds de desenvolvimento (`apps/api`)

```bash
npm run prisma:seed --workspace apps/api
```

Semeia a base de dados de desenvolvimento (dados fictícios, nunca reais da DGADR) com
taxonomias, utilizadores, recursos, dicas, perguntas frequentes e pedidos de suporte.
Idempotente — pode ser executado repetidamente sem duplicar dados. Ver
`docs/decisoes-seeds.md` para as decisões desta fase (estrutura dos seeds, chaves de
`upsert`, base de dados de testes de integração).

## Imagens de produção (Docker)

Cada aplicação tem um `Dockerfile` multi-stage de produção. O **contexto de build é
sempre a raiz do repositório** (não `apps/api`/`apps/web`), porque ambos precisam do
`package-lock.json` único do monorepo:

```bash
docker build -f apps/api/Dockerfile -t filedoc-api .
docker build -f apps/web/Dockerfile -t filedoc-web .
```

Ambas as imagens correm como utilizador não-root, têm `HEALTHCHECK` próprio, e não
contêm ferramentas de desenvolvimento, testes, ou segredos (confirmável por
`docker history filedoc-api` / `docker history filedoc-web`).

### Stack completa de produção local

```bash
docker compose -f docker-compose.prod.yml up --build
```

Sobe PostgreSQL, MinIO, a API e a Web a partir das imagens construídas acima — ao
contrário do `docker compose up` normal (modos de desenvolvimento). Usa o nome de
projeto `filedoc-prod` (declarado no próprio ficheiro), para nunca colidir com os
contentores do `docker-compose.yml` de desenvolvimento; ainda assim, **as duas stacks
não podem correr em simultâneo** tal como estão configuradas, porque partilham as
mesmas portas no anfitrião (`5433`, `3000`, `8080`) — parar uma antes de subir a outra.

A Web fica disponível em `http://localhost:8080`, a API em `http://localhost:3000/api/v1`.

**As migrações do Prisma não são aplicadas automaticamente no arranque do contentor da
API** (decisão deliberada — ver `context/features/db_ci_cd/fase-3-deploy-containerizacao.md`).
Antes de usar a API pela primeira vez contra uma base de dados vazia, aplicá-las
explicitamente a partir do anfitrião:

```bash
DATABASE_URL="postgresql://filedoc:filedoc@localhost:5433/filedoc?schema=public" \
  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

### Configuração da Web em tempo de execução

A Web é uma *single-page application* Angular compilada de forma estática, mas o
endereço da API não fica embutido no bundle em tempo de build. No arranque do
contentor, um script (`apps/web/docker/generate-env-config.sh`) gera
`env.js` a partir da variável de ambiente `API_URL`, servido antes do bundle Angular e
lido por `AppConfigService` (`apps/web/src/app/core/config/app-config.service.ts`) via
`window.__env`. Isto permite **promover a mesma imagem entre ambientes (e apontá-la a
APIs diferentes) sem reconstrução** — só variando `API_URL` no `docker run`/compose de
cada ambiente. Em desenvolvimento local (`ng serve`/`ng build` sem contentor),
`apps/web/public/env.js` fornece um valor por omissão (`http://localhost:3000/api/v1`).

`API_URL` tem de ser um endereço alcançável a partir do **browser do utilizador**, não
da rede interna do Docker — os pedidos partem do lado do cliente.

### Outras decisões desta fase

- imagem base `node:22-slim` (Debian), não `node:22-alpine` — testada e preferida por
  evitar as incompatibilidades conhecidas entre o motor de consultas do Prisma e a
  `musl libc` do Alpine; a Web usa `nginxinc/nginx-unprivileged:1.27-alpine` (não
  serve Node.js, sem essa restrição, e já corre como utilizador não-root por omissão);
- `.dockerignore` por aplicação implementado como `apps/api/Dockerfile.dockerignore` /
  `apps/web/Dockerfile.dockerignore` (reconhecidos automaticamente pelo BuildKit junto
  do `Dockerfile` referido por `-f`), em vez de um `.dockerignore` genérico — necessário
  porque o contexto de build é partilhado pelas duas aplicações;
  `apps/api/Dockerfile.dockerignore` só deixa passar o `package.json` da Web (e
  vice-versa), para o `npm ci` conseguir validar o workspace contra o lockfile
  partilhado sem arrastar o código-fonte da outra aplicação.

## CI/CD (GitHub Actions)

Ver `context/features/db_ci_cd/fase-4-deploy-cicd.md` para a especificação completa.
Dois workflows distintos, em `.github/workflows/`:

### `verify.yml` — verificação (cada *pull request*)

Nunca publica nada — corre também em *pull requests* de forks, sem acesso a segredos.
Quatro *jobs*, paralelizados sempre que não têm dependências entre si:

- **`quality (web)` / `quality (api)`** — `lint`, `format:check`, `typecheck`, testes
  unitários e `build`, por aplicação (matriz), parando no primeiro passo que falhar;
- **`db-validation`** — `prisma format` (equivalente a `--check`: formata e falha se
  isso alterar o ficheiro já versionado, já que o Prisma não tem essa opção nativa),
  `prisma validate`, `prisma migrate deploy` + `prisma migrate status` contra um
  PostgreSQL efémero do próprio runner (confirma que as migrações aplicam do zero, sem
  divergência), seguidos dos testes de integração da Fase 2;
- **`e2e`** — suite Playwright completa (Fase 11) contra `ng serve --configuration
  production`; relatório e capturas de falha publicados sempre como artefacto do
  workflow;
- **`dependency-audit`** — `npm audit`, informativo (`continue-on-error`), não bloqueia
  o *merge*.

A branch principal deve exigir os *checks* `quality (web)`, `quality (api)`,
`db-validation` e `e2e` (não `dependency-audit`, apenas informativo) antes de permitir
*merge* — configuração de proteção de branch feita diretamente no GitHub (fora do
âmbito de ficheiros do repositório), ainda por aplicar.

### `publish-images.yml` — build & publicação de imagens (só ao integrar em `main`)

Só corre em `push` para `main` ou ao criar uma *tag* `v*.*.*` — nunca a partir de uma
*pull request*, para que nenhuma origem externa tenha acesso ao `GITHUB_TOKEN` de
publicação. Reconstrói as imagens de produção (Fase 3) de `apps/api` e `apps/web` e
publica-as no **GitHub Container Registry** (`ghcr.io`), sem qualquer *deploy*
automático para um ambiente remoto (Fase 5).

**Convenção de tags** (nunca publicada só com `latest` — sai sempre acompanhada de,
pelo menos, o hash do commit):

| Imagem | Tags |
| --- | --- |
| `ghcr.io/<owner>/filedoc-api` | `sha-<hash-curto>`, `latest` (em `main`), `<versão>` (ao criar uma *tag* Git `vX.Y.Z`) |
| `ghcr.io/<owner>/filedoc-web` | idem |

`<hash-curto>` é sempre rastreável até ao commit de origem (`git show <hash-curto>`).

## Homologação (Fase 5, Deployment)

Ver `context/features/db_ci_cd/fase-5-deploy-homologacao.md` para a
especificação completa. O fornecedor/anfitrião de homologação é uma decisão
institucional da DGADR ainda não confirmada — por isso este ambiente é
concretizado como uma simulação Docker Compose autoalojável
(`docker-compose.homolog.yml`), que promove as imagens já publicadas por
`publish-images.yml` (nunca constrói localmente) e corre em qualquer
anfitrião com Docker que venha a ser confirmado:

```bash
docker compose -f docker-compose.homolog.yml --env-file .env.homolog up -d
```

- `.env.homolog.example` documenta as variáveis exigidas (nomes, nunca
  valores) — o `.env.homolog` real fica sempre fora do repositório;
- `docs/deploy-homologacao.md` — procedimento de *deploy*, passo a passo,
  incluindo a aplicação explícita de `prisma migrate deploy`;
- `docs/rollback-homologacao.md` — procedimento de *rollback* de imagem e as
  suas implicações quando já foram aplicadas migrações não retrocompatíveis;
- `scripts/homolog/smoke-test.sh` — testes de fumo pós-*deploy*
  (`/health`, `/ready`, casca da Web);
- `scripts/homolog/backup-postgres.sh` / `restore-postgres.sh` — backup e
  restauro da base de dados de homologação.

Este ambiente nunca deve conter dados reais de trabalhadores da DGADR —
apenas o seed de demonstração idempotente já usado em desenvolvimento
(`npm run prisma:seed --workspace apps/api`).
