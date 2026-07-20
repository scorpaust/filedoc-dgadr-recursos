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
```

## Prisma (`apps/api`)

```bash
npm run prisma:generate
npm run prisma:migrate   # prisma migrate dev
npm run prisma:validate
npm run prisma:status    # prisma migrate status
```

Ver `docs/decisoes-modelo-dados.md` para as decisões de modelo de dados (estratégia de IDs, timestamps, comportamentos de eliminação).
