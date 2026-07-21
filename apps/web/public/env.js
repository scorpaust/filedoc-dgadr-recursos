// Configuração de runtime para desenvolvimento local (ng serve / build sem contentor).
// Na imagem de produção, este ficheiro é sobrescrito no arranque do contentor a
// partir da variável de ambiente API_URL — ver apps/web/Dockerfile e
// apps/web/docker/generate-env-config.sh.
window.__env = {
  apiUrl: 'http://localhost:3000/api/v1',
};
