// Utilizado pelo HEALTHCHECK do Dockerfile — sem dependências, só módulos
// nativos do Node, para não exigir curl/wget na imagem de runtime.
const http = require('node:http');

const port = process.env.PORT || 3000;

const request = http.get(
  { host: '127.0.0.1', port, path: '/api/v1/health', timeout: 2000 },
  (response) => {
    process.exit(response.statusCode === 200 ? 0 : 1);
  },
);

request.on('error', () => process.exit(1));
request.on('timeout', () => {
  request.destroy();
  process.exit(1);
});
