#!/bin/sh
# Executado pelo mecanismo de arranque do nginx (/docker-entrypoint.d/*.sh),
# antes do servidor arrancar, tal como generate-env-config.sh — gera a
# diretiva Content-Security-Policy a partir de variáveis de ambiente do
# contentor, para que a mesma imagem sirva ambientes com domínios/
# armazenamento diferentes sem reconstrução. O hash do único script inline de
# index.html é calculado no build (compute-csp-hash.js), nunca aqui.
set -e

SCRIPT_HASH=$(cat /etc/nginx/csp-script-hash.txt)

API_URL="${API_URL:-http://localhost:3000/api/v1}"
# Só a origem (esquema+anfitrião+porta), sem caminho — connect-src não aceita caminhos.
API_ORIGIN=$(printf '%s' "$API_URL" | sed -E 's#^(https?://[^/]+).*#\1#')

# Origem pública do armazenamento de objetos (MinIO local ou S3/European
# Sovereign Cloud), de onde o browser carrega PDFs/vídeos/legendas através de
# URLs pré-assinados devolvidos pela API — distinta do endereço interno que a
# própria API usa para chamadas diretas ao SDK S3 (ver docker-compose.*.yml,
# serviço "minio" vs. porta publicada no anfitrião).
STORAGE_PUBLIC_ORIGIN="${STORAGE_PUBLIC_ORIGIN:-http://localhost:9000}"

# style-src inclui 'unsafe-inline': o Beasties do Angular CLI injeta CSS
# crítico inline em <head> em cada build (conteúdo variável, não hasheável de
# forma estável) e a encapsulação de vista emulada (omissão do Angular)
# injeta <style> por componente sem nonce — eliminar esta relaxação exigiria
# desativar a otimização de CSS crítico e configurar ngCspNonce, fora do
# âmbito desta fase de hardening (ver docs/auditoria-seguranca-fase-10.md).
CSP="default-src 'self'; script-src 'self' '${SCRIPT_HASH}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: ${STORAGE_PUBLIC_ORIGIN}; font-src 'self'; connect-src 'self' ${API_ORIGIN}; media-src 'self' ${STORAGE_PUBLIC_ORIGIN}; frame-src 'self' ${STORAGE_PUBLIC_ORIGIN}; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'"

cat > /etc/nginx/conf.d/security-headers.conf <<EOF
add_header Content-Security-Policy "${CSP}" always;
# Inofensivo em HTTP simples (ignorado pelo browser sem TLS) — já preparado
# para quando existir um domínio/certificado institucional atrás do ALB.
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
EOF
