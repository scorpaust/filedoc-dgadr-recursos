# Fase 3 (Deployment) — Containerização para Produção

Esta especificação define a **terceira fase da via de Base de Dados e Deployment Inicial** do **Filedoc Recursos Formativos**.

Assume como ponto de partida a Fase 1 (BD) — Modelo de Dados Completo e a Fase 2 (BD) — Seeds e Validação de Dados, já concluídas. Não depende diretamente da via de UI nem da via de integração de funcionalidades (ainda não iniciada) — esta fase produz as imagens de contentor para a API e para a aplicação Angular, mesmo que, nesta altura, a API ainda exponha pouco mais do que os *health checks* e a Web ainda mostre sobretudo a casca construída na via de UI.

Coerente com `project-spec.md` (secção "Infraestrutura" e "Regras obrigatórias do projeto"), `coding-standards.md` e `ai-interaction.md`.

---

## Objetivo

No final desta fase, deve existir:

- uma imagem Docker de produção para a API NestJS, construída em múltiplas etapas (*multi-stage build*), pequena, sem ferramentas de desenvolvimento, a correr como utilizador não-root;
- uma imagem Docker de produção para a aplicação Angular, servida por um servidor HTTP leve e adequado a produção (não o servidor de desenvolvimento do Angular CLI);
- validação das variáveis de ambiente obrigatórias no arranque de ambos os serviços, com falha explícita e imediata quando alguma falta;
- *health checks* funcionais em ambos os contentores, utilizáveis por Docker Compose e por um orquestrador futuro;
- um `docker-compose.yml` de referência que sobe a stack completa (PostgreSQL, MinIO, API, Web) a partir das imagens de produção construídas nesta fase, não dos modos de desenvolvimento das fases anteriores.

Não existe nesta fase: pipeline de CI/CD automatizado (Fase 4), nem qualquer ambiente remoto real (Fase 5) — esta fase produz e valida as imagens **localmente**.

---

## Âmbito

### Incluído

- `Dockerfile` multi-stage para `apps/api` (build → produção);
- `Dockerfile` multi-stage para `apps/web` (build → produção, servido por um servidor HTTP leve);
- `.dockerignore` em cada aplicação, excluindo `node_modules`, ficheiros de desenvolvimento, `.env` reais, testes, e qualquer artefacto desnecessário à imagem final;
- Validação de variáveis de ambiente obrigatórias no arranque de ambos os serviços (a API já tem esta validação desde a Fase 1 da via full-stack original — nesta fase, confirma-se que continua válida dentro do contentor; a Web precisa de uma estratégia própria, já que variáveis de ambiente de uma aplicação Angular compilada estaticamente têm implicações diferentes das de um processo Node.js — ver tarefas);
- *Health checks* Docker (`HEALTHCHECK`) para API e Web;
- `docker-compose.yml` de referência para correr a stack completa a partir das imagens de produção;
- Documentação do processo de build e execução das imagens em `README.md`.

### Fora de âmbito

- Publicação das imagens num registo remoto (Fase 4 — CI/CD trata da publicação automatizada);
- Orquestração além de Docker Compose (ex.: Kubernetes) — fora do âmbito do MVP, conforme `project-spec.md`;
- Qualquer ambiente remoto real, segredos de produção, ou domínio institucional (Fase 5);
- Otimizações avançadas de camadas Docker além das boas práticas óbvias (cache de dependências, ordem de instruções) — otimizações mais finas só se justificam com métricas reais de build, não antecipadamente.

---

## Entregáveis

1. `apps/api/Dockerfile` (multi-stage, produção);
2. `apps/web/Dockerfile` (multi-stage, produção);
3. `.dockerignore` em cada aplicação;
4. `docker-compose.yml` de referência, a correr localmente a partir das imagens construídas nesta fase;
5. Documentação de build/execução em `README.md`.

---

## Tarefas

### A. `Dockerfile` da API (`apps/api`)

- Etapa `deps`: instalar apenas as dependências de produção (`npm ci --omit=dev` ou equivalente ao gestor de pacotes do monorepo);
- Etapa `build`: instalar todas as dependências (incluindo dev), gerar o Prisma Client (`prisma generate`), compilar o TypeScript;
- Etapa final (`runtime`): imagem Node.js *slim*, copiar apenas o necessário (build compilado, `node_modules` de produção, Prisma Client gerado, schema e migrações do Prisma — necessárias para `prisma migrate deploy` no arranque ou como passo prévio, a decidir);
- Correr como utilizador não-root (criar um utilizador dedicado na imagem, não usar `root`);
- `HEALTHCHECK` a chamar `GET /api/v1/health`;
- `EXPOSE` da porta correta;
- `CMD`/`ENTRYPOINT` claro, sem *scripts* de arranque escondidos e não documentados.

### B. `Dockerfile` da Web (`apps/web`)

- Etapa `build`: instalar dependências, correr `ng build` (ou equivalente) em modo produção;
- Etapa final (`runtime`): servidor HTTP leve (ex.: Nginx) a servir os ficheiros estáticos gerados, com configuração adequada a uma *Single Page Application* Angular (redirecionar rotas desconhecidas para `index.html`, para o router Angular assumir o controlo — sem isto, recarregar uma rota profunda como `/recursos/:slug` resultaria num 404 do servidor);
- Cabeçalhos de segurança básicos ao nível do servidor HTTP (ex.: não expor a versão do servidor, `X-Content-Type-Options`), coerente com `project-spec.md`, secção de Segurança;
- `HEALTHCHECK` simples (ex.: pedido a `/` com resposta `200`);
- Correr como utilizador não-root, quando a imagem base o permitir.

### C. Variáveis de ambiente em contentor

- API: confirmar, dentro do contentor, que a validação de variáveis de ambiente já construída na fundação da API continua a bloquear o arranque quando falta uma variável obrigatória;
- Web: como uma *Single Page Application* Angular compilada é estática, variáveis como `API_URL` não podem depender apenas de `process.env` em tempo de execução do browser — decidir e documentar a estratégia (ex.: variáveis injetadas em tempo de build vs. um pequeno ficheiro de configuração gerado no arranque do contentor a partir de variáveis de ambiente, lido pela aplicação Angular). Esta decisão tem impacto direto em como a mesma imagem pode (ou não) ser promovida entre ambientes sem reconstrução — deve ser tomada com cuidado.

### D. `.dockerignore`

- Excluir, em ambas as aplicações: `node_modules`, `dist`/`.angular` de desenvolvimento local, `.env` (qualquer variante com valores reais), ficheiros de teste, documentação, `.git`;
- Confirmar que nenhum segredo, mesmo de desenvolvimento, chega a entrar no contexto de build.

### E. `docker-compose.yml` de referência

- Estender o `docker-compose.yml` de desenvolvimento (Fases 1/2 desta via) com uma variante, ou um ficheiro `docker-compose.prod.yml`, que usa as imagens construídas nesta fase (`build: apps/api` com o `Dockerfile` de produção, idem para `web`), em vez dos modos de desenvolvimento;
- Confirmar que a stack completa (PostgreSQL, MinIO, API, Web) sobe corretamente a partir de imagens de produção, com os *health checks* a reportar corretamente antes de os serviços dependentes arrancarem.

---

## Critérios de aceitação

- [ ] `docker build` da API e da Web completa sem erros, e as imagens resultantes são significativamente mais pequenas do que conteriam as etapas de build (confirmar que as etapas intermédias não ficam na imagem final);
- [ ] Ambos os contentores correm como utilizador não-root;
- [ ] A API dentro do contentor recusa arrancar sem as variáveis de ambiente obrigatórias, com uma mensagem de erro clara nos logs;
- [ ] A Web dentro do contentor consegue ser configurada para apontar para diferentes `API_URL` sem exigir uma reconstrução da imagem (ou, caso a decisão tomada exija reconstrução, isso está documentado e justificado);
- [ ] `HEALTHCHECK` de ambos os contentores reporta corretamente o estado saudável/não saudável;
- [ ] Recarregar uma rota profunda da Web (ex.: `/recursos/:slug`) diretamente no browser, servida pelo contentor de produção, não resulta em 404 do servidor;
- [ ] `docker compose up` (variante de produção) sobe a stack completa e a Web consegue comunicar com a API;
- [ ] Nenhum segredo, mesmo de desenvolvimento, está presente nas imagens finais (confirmar por inspeção, ex.: `docker history`);
- [ ] `README.md` documenta como construir e correr as imagens localmente.

---

## Comandos de validação

```text
docker build -f apps/api/Dockerfile -t filedoc-api .
docker build -f apps/web/Dockerfile -t filedoc-web .
docker compose -f docker-compose.prod.yml up
docker history filedoc-api
docker history filedoc-web
```

Adaptar os nomes de ficheiros e de imagens à convenção final do projeto.

---

## Riscos e decisões em aberto

- A estratégia de configuração da Web (variáveis em tempo de build vs. ficheiro de configuração gerado no arranque do contentor) é a decisão mais importante desta fase — tem impacto direto na Fase 4 (CI/CD: quantas vezes é preciso reconstruir a imagem) e na Fase 5 (quantos ambientes conseguem partilhar a mesma imagem); recomenda-se a opção de configuração no arranque do contentor, por permitir promover a mesma imagem entre ambientes sem reconstrução, mas a decisão final deve ser registada e justificada;
- Confirmar se `prisma migrate deploy` corre como parte do arranque do contentor da API ou como um passo distinto e explícito antes do arranque (recomendado: passo distinto, para nunca aplicar migrações "silenciosamente" ao arrancar um contentor, coerente com `ai-interaction.md` — migrações potencialmente destrutivas exigem parar e pedir autorização, o que não é compatível com uma aplicação automática no arranque);
- Confirmar a imagem base a usar (ex.: `node:XX-slim` vs. `node:XX-alpine`) — `alpine` produz imagens mais pequenas mas pode introduzir incompatibilidades com alguns pacotes nativos; testar antes de decidir.

---

## Dependência para a fase seguinte

A **Fase 4 (Deployment) — Pipeline de CI/CD** assume como ponto de partida:

- os `Dockerfile` de produção validados localmente nesta fase, prontos a ser construídos e publicados automaticamente;
- a decisão tomada sobre a estratégia de configuração da Web, que determina se o pipeline reconstrói a imagem por ambiente ou publica uma única imagem promovida entre ambientes.

---

> Fase 3 (Deployment) — uma imagem que só funciona na máquina de quem a construiu não é uma imagem de produção; esta fase garante que corre de forma previsível, em qualquer máquina, com as mesmas garantias.
