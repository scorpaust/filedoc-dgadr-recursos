# Fase 3 (Integração) — Catálogo e Detalhe de Recursos

Via de Integração de Funcionalidades. Assume concluídas a Fase 1 (Autenticação e Autorização) e a Fase 2 (Armazenamento de Ficheiros) desta via. Infraestrutura confirmada: **AWS — ECS Fargate (Express Mode) + ECR para as imagens, S3/European Sovereign Cloud para os ficheiros**, decidida na Fase 5 do Deployment.

Coerente com `project-spec.md` (secções A, B, C, D, E), `coding-standards.md`, `ai-interaction.md`.

---

## Objetivo

Substituir o `ResourceMockService` (Fase 3 da via de UI) por consumo real da API: catálogo com pesquisa/filtros/paginação no servidor, detalhe de recurso com vídeo/PDF servidos via `StorageService` (Fase 2), recursos relacionados, tudo com a mesma regra de visibilidade por estado editorial e função já validada nos mocks.

---

## Âmbito

**Incluído**: módulo `resources/` na API (controller, service, DTOs); endpoints `GET /resources`, `GET /resources/:slug`, `GET /resources/:id/file`, `GET /resources/:id/thumbnail`; paginação e filtros no servidor (usando os índices já criados na Fase 1 da via de BD); ligação do catálogo e do detalhe da via de UI aos endpoints reais, sem alterar os componentes além da fonte de dados; execução da suite E2E da Fase 11 (via de UI) contra a API real em vez dos mocks, para estes fluxos.

**Fora de âmbito**: criação/edição de recursos (Fase 7); gestão de taxonomias (Fase 7).

---

## Tarefas

### A. Endpoints de recursos

- `GET /resources`: aceita `q` (texto), `type`, `workflow`, `documentType`, `difficulty`, `page`, `pageSize`, `sort`; valida todos os parâmetros via DTO; usa `select`/`include` mínimos, paginação real (`skip`/`take`), sem N+1 (já testado na Fase 2 da via de BD);
- `GET /resources/:slug`: devolve o recurso completo com metadados; `404` se não existir ou se estiver em rascunho e o utilizador autenticado não tiver `CONTENT_EDITOR`/`ADMIN` (nunca revelar a existência);
- `GET /resources/:id/file` e `GET /resources/:id/thumbnail`: validam autorização (recurso publicado, ou rascunho + função adequada) e devolvem um redirecionamento para o URL pré-assinado gerado pelo `StorageService` (Fase 2) — nunca servem os bytes diretamente;
- Recursos relacionados: incluídos na resposta de `GET /resources/:slug` (mesmo fluxo, etiquetas em comum), com limite razoável (2–4).

### B. Ligação da via de UI

- Substituir a implementação interna de `ResourceMockService` para consumir os endpoints reais via `HttpClient`, preservando a interface já usada pelos componentes do Catálogo (Fase 3 da via de UI) e do Detalhe (Fase 4 da via de UI);
- Confirmar `switchMap` e sincronização com o URL continuam a funcionar sem alterações.

### C. Testes

- Testes de integração da API: pesquisa, cada filtro, paginação, visibilidade por estado/função, `404` correto para `slug` inexistente e para rascunho sem permissão;
- Suite E2E (Fase 11 da via de UI) a correr contra este endpoint real em homologação (AWS).

---

## Critérios de aceitação

- [ ] Catálogo e Detalhe funcionam identicamente ao comportamento já validado com mocks, agora com dados reais da via de BD;
- [ ] Nenhum byte de vídeo/PDF passa pela API — apenas o redirecionamento para o URL pré-assinado;
- [ ] Um rascunho nunca é acessível a um utilizador sem `CONTENT_EDITOR`/`ADMIN`, com resposta `404`, não `403`;
- [ ] Paginação e filtros combinados devolvem resultados corretos e consistentes com a Fase 2 da via de BD;
- [ ] Testes de integração e E2E (contra API real) passam.

---

## Comandos de validação

```text
lint
format:check
typecheck
test
test:integration
test:e2e
```

---

## Riscos e decisões em aberto

- Confirmar se a pesquisa de texto usa `ILIKE`/índice trigram do PostgreSQL ou pesquisa de texto completo nativa (`tsvector`) — a segunda escala melhor, mas exige uma migração adicional; decisão a tomar com base no volume real de recursos esperado.

---

## Dependência para a fase seguinte

A Fase 4 (Dicas & FAQ) reutiliza o mesmo padrão de endpoint, paginação e visibilidade por estado editorial.

---

> Fase 3 (Integração) — o catálogo é a primeira funcionalidade de negócio a ficar completamente real; tudo o resto desta via segue o mesmo padrão que aqui se valida.
