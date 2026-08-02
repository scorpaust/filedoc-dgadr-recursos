# Fase 9 (Integração) — Página Inicial (Integração Final)

Via de Integração de Funcionalidades. Assume concluídas a Fase 3 (Catálogo) e a Fase 5 (Suporte — Trabalhador), cujos endpoints esta fase compõe, sem criar nenhum endpoint novo de raiz.

Coerente com `project-spec.md` (secção "Página inicial"), `ai-interaction.md`.

---

## Objetivo

Ligar a Página Inicial (Fase 10 da via de UI) aos dados reais: recursos em destaque e recentes via `GET /resources` (Fase 3), pedidos abertos via `GET /tickets/mine` (Fase 5), pesquisa rápida a navegar para o catálogo real.

Esta fase não cria endpoints novos — é composição do que já existe, e por isso fecha, funcionalmente, a integração de todas as áreas visíveis ao trabalhador comum.

---

## Âmbito

**Incluído**: ligação da Página Inicial aos endpoints já existentes; confirmação de que os três painéis dinâmicos carregam de forma independente (um atraso numa chamada não bloqueia as outras, tal como já validado com mocks na Fase 10 da via de UI).

**Fora de âmbito**: qualquer lógica nova de seleção de "destaque" que não esteja já decidida na Fase 10 da via de UI.

---

## Tarefas

### A. Ligação

- Substituir a origem de dados das três secções dinâmicas (destaque, recentes, pedidos abertos) pelos endpoints reais já construídos, preservando os componentes e o comportamento de *skeleton*/estado vazio já validados;
- Confirmar que o critério de "recursos em destaque" definido na Fase 10 da via de UI (campo explícito ou mais recentes) está corretamente suportado pelo endpoint real da Fase 3 (se for campo explícito, confirmar que existe no schema desde a Fase 1 da via de BD — caso não exista, esta é a fase para o adicionar, com uma migração aditiva).

### B. Testes

- Suite E2E completa (Fase 11 da via de UI) a correr integralmente contra a API real, já sem nenhuma dependência de serviços mock em toda a aplicação.

---

## Critérios de aceitação

- [ ] A Página Inicial funciona identicamente ao comportamento já validado com mocks, agora inteiramente com dados reais;
- [ ] As três secções dinâmicas continuam a carregar de forma independente;
- [ ] A suite E2E completa passa contra a API real, sem nenhum mock remanescente em nenhuma parte da aplicação;
- [ ] `docs/interfaces-mock-ui.md` é marcado como histórico/descontinuado — já não descreve o comportamento atual da aplicação.

---

## Comandos de validação

```text
lint
format:check
typecheck
test
test:e2e
```

---

## Dependência para a fase seguinte

A **Fase 10 — Hardening, Testes E2E Reais e Preparação para Produção** é a última fase do projeto inteiro, cobrindo tudo o que foi construído nas duas vias fundamentais e nesta via de integração.

---

> Fase 9 (Integração) — quando a página inicial já não depende de nada simulado, a aplicação deixou de ser um protótipo.
