#!/usr/bin/env bash
# Testes de fumo pós-deploy do ambiente de homologação (Fase 5, Deployment).
# Ver context/features/db_ci_cd/fase-5-deploy-homologacao.md, tarefa H, e
# docs/deploy-homologacao.md para o procedimento completo em que se insere.
#
# Uso:
#   scripts/homolog/smoke-test.sh [API_URL] [WEB_URL]
#
# Por omissão assume a stack local (docker-compose.homolog.yml com
# BIND_ADDRESS por omissão, 127.0.0.1); passar os dois argumentos para
# validar um anfitrião remoto.

set -u

API_URL="${1:-http://127.0.0.1:3000/api/v1}"
WEB_URL="${2:-http://127.0.0.1:8080}"

failures=0

check() {
  local description="$1"
  local url="$2"
  local status
  status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url")"
  if [ "$status" = "200" ]; then
    echo "[OK]   $description ($url -> $status)"
  else
    echo "[FAIL] $description ($url -> ${status:-sem resposta})"
    failures=$((failures + 1))
  fi
}

echo "A validar $API_URL e $WEB_URL..."
echo

check "GET /health (liveness)" "$API_URL/health"
check "GET /ready (readiness — base de dados alcançável)" "$API_URL/ready"
check "Web carrega a casca da aplicação" "$WEB_URL/"

echo
echo "[PENDENTE] Login de demonstração (utilizador seed) — este teste de fumo"
echo "só pode ser ativado depois de a via de integração de funcionalidades"
echo "ligar a autenticação real à API (ver tarefa H da especificação da Fase"
echo "5); documentado como pendente, não removido, conforme decisão registada"
echo "em 'Riscos e decisões em aberto'."

echo
if [ "$failures" -eq 0 ]; then
  echo "Todos os testes de fumo executáveis passaram."
  exit 0
else
  echo "$failures teste(s) de fumo falharam."
  exit 1
fi
