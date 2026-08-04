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

# style-src inclui 'unsafe-inline': a encapsulação de vista emulada (omissão
# do Angular) injeta <style> por componente sem nonce — eliminar esta
# relaxação exigiria configurar ngCspNonce, fora do âmbito desta fase de
# hardening (ver docs/auditoria-seguranca-fase-10.md).
#
# frame-src/media-src incluem API_ORIGIN (não só STORAGE_PUBLIC_ORIGIN): o
# browser carrega PDFs/vídeos através de um endpoint da própria API
# (GET /resources/:id/file — ver resource.service.ts, fileUrl()), que
# redireciona para o URL pré-assinado do S3; sem API_ORIGIN aqui, esse
# pedido inicial ao domínio da API é bloqueado pela CSP antes de sequer
# chegar ao redireciono.
CSP="default-src 'self'; script-src 'self' '${SCRIPT_HASH}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: ${STORAGE_PUBLIC_ORIGIN}; font-src 'self'; connect-src 'self' ${API_ORIGIN}; media-src 'self' ${API_ORIGIN} ${STORAGE_PUBLIC_ORIGIN}; frame-src 'self' ${API_ORIGIN} ${STORAGE_PUBLIC_ORIGIN}; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'"

cat > /etc/nginx/conf.d/security-headers.conf <<EOF
add_header Content-Security-Policy "${CSP}" always;
# Inofensivo em HTTP simples (ignorado pelo browser sem TLS) — já preparado
# para quando existir um domínio/certificado institucional atrás do ALB.
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
EOF
