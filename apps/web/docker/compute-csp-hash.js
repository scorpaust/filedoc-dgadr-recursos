// Executado no estágio de build da imagem Docker (apps/web/Dockerfile), nunca
// em tempo de execução — calcula o hash SHA-256 do único <script> inline de
// index.html (deteção de tema, antes do bootstrap do Angular) a partir do
// ficheiro já compilado, para nunca divergir por normalização de fim de
// linha entre sistemas operativos/checkouts (ver context/current-feature.md,
// aviso pré-existente de CRLF/core.autocrlf neste projeto). O resultado é
// consumido por generate-security-headers.sh para a diretiva script-src do
// Content-Security-Policy.
const fs = require('fs');
const crypto = require('crypto');

const [, , indexHtmlPath, outputPath] = process.argv;
if (!indexHtmlPath || !outputPath) {
  throw new Error('Uso: node compute-csp-hash.js <index.html> <ficheiro-de-saída>');
}

const html = fs.readFileSync(indexHtmlPath, 'utf8');
const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (inlineScripts.length !== 1) {
  throw new Error(
    `Esperado exatamente 1 <script> inline sem atributos em ${indexHtmlPath}, encontrados ${inlineScripts.length} — ` +
      'rever a diretiva script-src do CSP em apps/web/docker/generate-security-headers.sh antes de prosseguir.',
  );
}

const hash = crypto.createHash('sha256').update(inlineScripts[0][1], 'utf8').digest('base64');
fs.writeFileSync(outputPath, `sha256-${hash}`);
