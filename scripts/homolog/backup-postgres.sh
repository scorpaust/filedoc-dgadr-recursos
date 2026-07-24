#!/usr/bin/env bash
# Backup do PostgreSQL de homologação (Fase 5, Deployment, tarefa A: "backups
# automáticos ativados desde o início"). Este script é o mecanismo mínimo
# necessário para ativar esse backup — agendá-lo (cron do anfitrião, ou o
# mecanismo nativo da plataforma que a DGADR vier a confirmar) é uma decisão
# de infraestrutura fora do âmbito de ficheiros deste repositório, não
# assumida aqui.
#
# Uso (a partir da raiz do repositório, com a stack de homologação a correr):
#   scripts/homolog/backup-postgres.sh [diretório-destino] [ficheiro-env]
#
# Lê POSTGRES_USER/POSTGRES_DB de um ficheiro de segredos (por omissão,
# ".env.homolog" na raiz do repositório — nunca embutidos no script) e passa
# o mesmo ficheiro a "docker compose --env-file", em vez de depender de
# variáveis já exportadas manualmente no ambiente.

set -euo pipefail

cd "$(dirname "$0")/../.."

dest_dir="${1:-backups}"
env_file="${2:-.env.homolog}"

if [ ! -f "$env_file" ]; then
  echo "Ficheiro de ambiente não encontrado: $env_file" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

: "${POSTGRES_USER:?defina POSTGRES_USER em $env_file}"
: "${POSTGRES_DB:?defina POSTGRES_DB em $env_file}"

mkdir -p "$dest_dir"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
dest_file="$dest_dir/filedoc-homolog-${timestamp}.sql"

echo "A criar backup de '$POSTGRES_DB' em $dest_file..."
docker compose -f docker-compose.homolog.yml --env-file "$env_file" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" --clean --if-exists "$POSTGRES_DB" > "$dest_file"

echo "Backup concluído: $dest_file ($(du -h "$dest_file" | cut -f1))"
