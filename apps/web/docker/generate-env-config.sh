#!/bin/sh
# Executado pelo mecanismo de arranque do nginx (/docker-entrypoint.d/*.sh),
# antes do servidor arrancar. Gera env.js a partir de variáveis de ambiente do
# contentor, para que a mesma imagem possa ser promovida entre ambientes sem
# reconstrução (ver decisão em context/features/db_ci_cd/fase-3-deploy-containerizacao.md).
set -e

API_URL="${API_URL:-http://localhost:3000/api/v1}"
ESCAPED_API_URL=$(printf '%s' "$API_URL" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')

cat > /usr/share/nginx/html/env.js <<EOF
window.__env = {
  apiUrl: "${ESCAPED_API_URL}"
};
EOF
