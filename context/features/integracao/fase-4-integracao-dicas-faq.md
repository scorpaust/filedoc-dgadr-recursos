# Fase 4 (Integração) — Dicas & Perguntas Frequentes

Via de Integração de Funcionalidades. Assume concluída a Fase 3 (Catálogo e Detalhe de Recursos), cujo padrão de endpoint/visibilidade esta fase reutiliza diretamente.

Coerente com `project-spec.md` (secções F e G), `coding-standards.md`, `ai-interaction.md`.

---

## Objetivo

Substituir `TipMockService`/`FaqMockService` (Fase 5 da via de UI) por consumo real: `GET /tips` e `GET /faqs`, com a mesma regra de visibilidade por estado editorial e função já validada.

---

## Âmbito

**Incluído**: módulo `tips/` e `faqs/` na API (ou um módulo `content/` partilhado, a decidir por conveniência); endpoints `GET /tips`, `GET /faqs`; ligação da página `/dicas-faq` da via de UI aos endpoints reais.

**Fora de âmbito**: criação/edição/reordenação (Fase 7 — Gestão de Conteúdos).

---

## Tarefas

### A. Endpoints

- `GET /tips`: devolve as dicas publicadas (ou também rascunhos, consoante a função do utilizador autenticado), ordenadas por `sortOrder`;
- `GET /faqs`: idem, com `category` incluída na resposta para o agrupamento visual já construído no acordeão da via de UI.

### B. Ligação da via de UI

- Substituir a implementação interna dos serviços mock pela chamada real, preservando a interface consumida pelo componente de acordeão e pelos cartões de dica (Fase 5 da via de UI).

### C. Testes

- Testes de integração: listagem, ordenação, visibilidade por estado/função;
- Suite E2E relevante (Fase 11 da via de UI) a correr contra a API real.

---

## Critérios de aceitação

- [ ] `/dicas-faq` funciona identicamente ao comportamento já validado com mocks, agora com dados reais;
- [ ] Um utilizador sem `CONTENT_EDITOR`/`ADMIN` nunca vê dicas/perguntas em rascunho;
- [ ] Testes de integração e E2E passam.

---

## Comandos de validação

```text
lint
format:check
typecheck
test
test:integration
```

---

## Dependência para a fase seguinte

A Fase 5 (Suporte — Pedidos do Trabalhador) é a primeira fase desta via com escrita de dados (criação de tickets), não apenas leitura como as Fases 3 e 4.

---

> Fase 4 (Integração) — pequena e direta: o mesmo padrão da Fase 3, aplicado a uma área mais simples.
