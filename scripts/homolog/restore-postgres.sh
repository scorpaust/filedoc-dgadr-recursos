#!/usr/bin/env bash
# Restauro do PostgreSQL de homologação a partir de um ficheiro gerado por
# backup-postgres.sh — ver docs/rollback-homologacao.md para o procedimento
# completo em que se insere (Fase 5, Deployment).
#
# Uso (a partir da raiz do repositório, com a stack de homologação a correr):
#   scripts/homolog/restore-postgres.sh <ficheiro-backup.sql> [ficheiro-env]
#
# Lê POSTGRES_USER/POSTGRES_DB de um ficheiro de segredos (por omissão,
# ".env.homolog" na raiz do repositório) e passa o mesmo ficheiro a
# "docker compose --env-file".

set -euo pipefail

cd "$(dirname "$0")/../.."

backup_file="${1:?uso: restore-postgres.sh <ficheiro-backup.sql> [ficheiro-env]}"
env_file="${2:-.env.homolog}"

if [ ! -f "$backup_file" ]; then
  echo "Ficheiro de backup não encontrado: $backup_file" >&2
  exit 1
fi

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

echo "A restaurar '$POSTGRES_DB' a partir de $backup_file..."
docker compose -f docker-compose.homolog.yml --env-file "$env_file" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$backup_file"

echo "Restauro concluído."
