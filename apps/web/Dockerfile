# syntax=docker/dockerfile:1

# Build de produção da Web (Angular), servida por nginx. Contexto = raiz do
# monorepo, pelo mesmo motivo do apps/api/Dockerfile (lockfile único).
#
#   docker build -f apps/web/Dockerfile -t filedoc-web .

# ---------------------------------------------------------------------------
# build: instala dependências e compila em modo produção.
# ---------------------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
# Sem --ignore-scripts: ao contrário da API, o esbuild usado pelo Angular
# CLI precisa do seu próprio postinstall para resolver o binário nativo
# correto da plataforma (ex.: @esbuild/linux-x64).
RUN npm ci --workspace apps/web
COPY apps/web apps/web
RUN npm run build --workspace apps/web

# ---------------------------------------------------------------------------
# runtime: nginx não-root a servir os ficheiros estáticos.
# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY apps/web/docker/default.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 apps/web/docker/generate-env-config.sh /docker-entrypoint.d/20-generate-env-config.sh
# --chown=nginx:nginx: o utilizador não-root do contentor tem de conseguir
# reescrever env.js no arranque (ver generate-env-config.sh); o diretório em
# si continua a pertencer a root (herdado da imagem base), mas isso basta,
# já que sobrescrever um ficheiro existente só exige permissão de escrita
# sobre o próprio ficheiro, não sobre o diretório que o contém.
COPY --chown=nginx:nginx --from=build /app/apps/web/dist/filedoc-dgadr-recursos/browser /usr/share/nginx/html

# A imagem nginx-unprivileged já corre como o utilizador não-root "nginx" e
# escuta na porta 8080 (portas < 1024 exigem privilégios de root).
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
