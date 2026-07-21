# Fase 4 (Deployment) — Pipeline de CI/CD

Esta especificação define a **quarta fase da via de Base de Dados e Deployment Inicial** do **Filedoc Recursos Formativos**.

Assume como ponto de partida a Fase 3 (Deployment) — Containerização para Produção, já concluída, e reutiliza as suites de teste já existentes: os testes unitários e E2E da via de UI (Fase 11), os testes de integração da via de Base de Dados (Fase 2), e os `Dockerfile` de produção da Fase 3.

Coerente com `coding-standards.md` (secção "Lint, formatação e validação" e "Git e pull requests") e `ai-interaction.md`.

---

## Objetivo

No final desta fase, deve existir um pipeline de CI/CD (ex.: GitHub Actions) que, em cada *pull request*:

- corre lint, verificação de tipos, testes unitários e build de `apps/web` e `apps/api`;
- corre `prisma format --check`, `prisma validate` e `prisma migrate status`, falhando se houver migrações pendentes ou divergentes;
- corre os testes de integração (Fase 2, via de BD) contra uma base de dados de teste efémera;
- corre a suite E2E (Fase 11, via de UI) contra uma build da aplicação;
- só permite o *merge* quando todos os passos anteriores passam (gate de qualidade obrigatório, não apenas informativo);

e que, ao integrar em `main` (ou equivalente):

- constrói as imagens Docker de produção (Fase 3) para `apps/api` e `apps/web`;
- publica essas imagens num registo de contentores, com uma convenção de *tags* clara e rastreável até ao commit de origem;
- não faz *deploy* automático para nenhum ambiente remoto real nesta fase — isso é tratado, de forma controlada, na Fase 5.

---

## Âmbito

### Incluído

- Configuração do pipeline (ex.: `.github/workflows/`) com, no mínimo, dois fluxos: **verificação** (em cada *pull request*) e **build & publicação** (ao integrar em `main`);
- *Job* de qualidade: lint, `format:check`, `typecheck`, testes unitários, build, para `apps/web` e `apps/api`;
- *Job* de validação de base de dados: `prisma format --check`, `prisma validate`, `prisma migrate status`, testes de integração contra PostgreSQL efémero no próprio pipeline (ex.: serviço `postgres` do runner de CI);
- *Job* de testes E2E: build da aplicação, arranque dos serviços necessários (com dados mock/seed conforme aplicável), execução da suite Playwright da Fase 11;
- *Job* de build e publicação de imagens: construir as imagens de produção da Fase 3, aplicar *tags* (versão semântica e/ou hash do commit), publicar num registo de contentores;
- Proteção da branch principal, exigindo que todos os *jobs* de verificação passem antes de permitir o *merge*;
- Análise básica de dependências (ex.: auditoria de vulnerabilidades conhecidas, `npm audit` ou equivalente), sem bloquear obrigatoriamente o pipeline por vulnerabilidades de severidade baixa, mas reportando-as.

### Fora de âmbito

- *Deploy* automático para qualquer ambiente remoto real (Fase 5, e mesmo aí, de forma controlada, não necessariamente automática já nesta fase inicial);
- Testes de carga/desempenho (dependem de um ambiente real com tráfego, fora do âmbito desta via);
- Notificações automáticas (Slack, e-mail) sobre o estado do pipeline — pode ser adicionado depois, sem ser um requisito desta fase;
- Assinatura/verificação criptográfica de imagens — evolução futura, não um requisito do MVP.

---

## Entregáveis

1. Workflows de CI configurados e a correr em cada *pull request*;
2. Workflow de build & publicação de imagens, a correr ao integrar em `main`;
3. Proteção da branch principal configurada, exigindo os *checks* obrigatórios;
4. Convenção de *tags* de imagem documentada em `README.md` ou `project-overview.md`.

---

## Tarefas

### A. Estrutura do pipeline

- Separar claramente **verificação** (roda em qualquer *pull request*, nunca publica nada) de **build & publicação** (só roda ao integrar em `main`, nunca corre a partir de uma *pull request* de origem externa não confiável, por razões de segurança dos segredos de publicação);
- Cache de dependências (`node_modules`) entre execuções, para acelerar o pipeline sem comprometer a reprodutibilidade (cache com chave baseada no lockfile).

### B. *Job* de qualidade

- Para `apps/web` e `apps/api`, correr, na ordem: `lint`, `format:check`, `typecheck`, testes unitários, `build`;
- Falhar o *job* ao primeiro passo que falhar, com o relatório de erro visível nos *logs* do pipeline;
- Não permitir avisos de lint ignorados indefinidamente (conforme `coding-standards.md`) — o pipeline deve tratar avisos configurados como erro de forma consistente com a configuração local do ESLint.

### C. *Job* de validação de base de dados

- Subir um serviço PostgreSQL efémero no runner de CI (ou equivalente);
- `prisma format --check` (falha se o schema não estiver formatado);
- `prisma validate`;
- `prisma migrate status` contra a base de dados efémera, depois de aplicar as migrações do zero — confirma que as migrações aplicam de forma limpa e consistente, não apenas que o histórico local está sincronizado;
- Correr os testes de integração da Fase 2 (via de BD) contra esta base de dados efémera, incluindo seed mínimo necessário aos testes.

### D. *Job* de testes E2E

- Build da aplicação (ou uso da imagem de produção da Fase 3, a decidir — usar a imagem de produção é mais fiel ao comportamento real, mas mais lento; build de desenvolvimento é mais rápido para *feedback* em *pull requests* — ponderar);
- Arrancar os serviços necessários (API mock ou real, consoante o estado da via de integração de funcionalidades nesse momento — nesta fase inicial, a suite E2E ainda corre sobre os serviços mock da via de UI, conforme a Fase 11);
- Correr a suite Playwright completa;
- Publicar relatórios/capturas de falhas como artefactos do pipeline, para facilitar o diagnóstico sem precisar de reproduzir localmente.

### E. *Job* de build e publicação de imagens

- Só corre ao integrar em `main`;
- Reconstrói as imagens de produção de `apps/api` e `apps/web` (Fase 3);
- Aplica *tags*: no mínimo, o hash curto do commit; idealmente também uma versão semântica quando aplicável (ex.: a partir de *tags* Git);
- Publica num registo de contentores (a decidir — ex.: GitHub Container Registry, por integração natural com GitHub Actions, sem inventar um fornecedor institucional não confirmado);
- Nunca publica com a *tag* `latest` como única referência — deve sempre existir uma *tag* imutável e rastreável até ao commit de origem.

### F. Proteção da branch principal

- Configurar a branch principal para exigir que os *jobs* de verificação (B, C, D) passem antes de permitir *merge*;
- Exigir revisão de código antes do *merge* (coerente com `coding-standards.md` e `ai-interaction.md` — nenhum código é integrado sem revisão e sem os testes a passar).

---

## Critérios de aceitação

- [ ] Uma *pull request* com uma falha de lint, de tipo, de teste ou de build é bloqueada automaticamente, sem possibilidade de *merge*;
- [ ] Uma *pull request* com uma migração Prisma inconsistente (ex.: schema alterado sem migração correspondente) é bloqueada;
- [ ] Os testes de integração da Fase 2 (via de BD) correm no pipeline contra uma base de dados efémera, não contra uma base de dados partilhada;
- [ ] A suite E2E da Fase 11 (via de UI) corre no pipeline e os seus relatórios/capturas de falha ficam acessíveis como artefactos;
- [ ] Ao integrar em `main`, as imagens de produção são construídas e publicadas com uma *tag* rastreável até ao commit;
- [ ] Nenhuma *pull request* de origem externa consegue publicar imagens ou aceder a segredos de publicação;
- [ ] A branch principal está protegida, exigindo os *checks* obrigatórios e revisão antes do *merge*;
- [ ] O pipeline completo (verificação) corre num tempo razoável (indicativo: sob 10–15 minutos), com cache de dependências ativo.

---

## Comandos de validação

Localmente, antes de confiar no pipeline, os mesmos passos devem correr sem surpresas:

```text
lint
format:check
typecheck
test
prisma format --check
prisma validate
prisma migrate status
test:integration
test:e2e
build
```

---

## Riscos e decisões em aberto

- Confirmar o registo de contentores a usar — recomenda-se o GitHub Container Registry por integração nativa, mas a decisão final deve considerar onde a Fase 5 (ambiente de homologação) vai efetivamente correr as imagens;
- Confirmar se a suite E2E do pipeline usa a imagem de produção (Fase 3) ou uma build de desenvolvimento mais rápida — recomenda-se produção apenas no *job* de `main`, e uma build de desenvolvimento nas *pull requests*, para não sacrificar o tempo de *feedback*; a decisão deve ficar documentada;
- O tempo total do pipeline deve ser monitorizado à medida que a suite de testes cresce nas vias seguintes (integração de funcionalidades) — paralelizar *jobs* independentes (qualidade, BD, E2E podem correr em simultâneo) desde já, para não acumular dívida de tempo de espera.

---

## Dependência para a fase seguinte

A **Fase 5 (Deployment) — Ambiente de Destino Inicial (Homologação)** assume como ponto de partida:

- imagens de produção publicadas de forma fiável e rastreável a partir desta fase;
- a confiança de que nenhuma imagem chega ao registo sem ter passado por lint, testes, validação de migrações e E2E.

---

> Fase 4 (Deployment) — o pipeline é o portão: nada chega a uma imagem publicada sem primeiro provar, de forma automática e repetível, que está em condições de o fazer.
