# syntax=docker/dockerfile:1

# Build de produção da API (NestJS). Contexto = raiz do monorepo, porque o
# workspace partilha um único package-lock.json (ver docs/decisoes-modelo-dados.md).
#
#   docker build -f apps/api/Dockerfile -t filedoc-api .

# ---------------------------------------------------------------------------
# deps: só dependências de produção do workspace apps/api.
# ---------------------------------------------------------------------------
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace apps/api --omit=dev --ignore-scripts

# ---------------------------------------------------------------------------
# build: todas as dependências, gera o Prisma Client e compila o TypeScript.
# ---------------------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app

# Instalado antes de `prisma generate`: o motor de consultas gerado tem de
# corresponder à versão do OpenSSL desta mesma imagem base (node:22-slim),
# que é também a imagem da etapa "runtime" — gerar sem isto faz o Prisma
# assumir "openssl-1.1.x" às cegas, incompatível com o "openssl-3.0.x" real
# do Debian bookworm, e falhar já no arranque do contentor.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace apps/api --ignore-scripts
COPY apps/api apps/api
RUN npm run prisma:generate --workspace apps/api
RUN npm run build --workspace apps/api

# ---------------------------------------------------------------------------
# runtime: imagem final, sem ferramentas de desenvolvimento, utilizador não-root.
# ---------------------------------------------------------------------------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Mesma versão de OpenSSL da etapa "build" (ver comentário acima) — o motor de
# consultas gerado lá espera encontrá-la aqui.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma/schema.prisma ./apps/api/prisma/schema.prisma
COPY --from=build /app/apps/api/prisma/migrations ./apps/api/prisma/migrations
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/docker/healthcheck.js ./apps/api/docker/healthcheck.js

WORKDIR /app/apps/api
# A imagem base node:22-slim já inclui um utilizador dedicado "node" (não-root).
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "docker/healthcheck.js"]

CMD ["node", "dist/src/main.js"]
