# Fase 5 (UI) — Dicas & Perguntas Frequentes

Esta especificação define a **quinta fase da via de desenvolvimento do UI** do **Filedoc Recursos Formativos**, em Angular, com dados simulados (mock) — sem ligação à API NestJS.

Assume como ponto de partida a Fase 1 (Design System), a Fase 2 (Autenticação) e a Fase 3 (Catálogo), já concluídas. É independente da Fase 4 e pode ser desenvolvida em paralelo, se necessário.

Coerente com `project-spec.md` (secções F e G — Dicas rápidas e Perguntas frequentes), `project-overview.md`, `coding-standards.md` e `ai-interaction.md`.

---

## Objetivo

No final desta fase, deve ser possível, sem qualquer API real:

- aceder a `/dicas-faq` e ver a área de Dicas rápidas e a área de Perguntas frequentes na mesma página (tal como no protótipo visual aprovado);
- ver as dicas publicadas, ordenadas pela ordem definida nos dados mock;
- ver as perguntas frequentes num acordeão acessível, agrupadas por categoria quando esta existir;
- abrir e fechar cada pergunta do acordeão, com apenas uma aberta de cada vez (tal como no protótipo) ou múltiplas, consoante decisão tomada nesta fase e documentada;
- confirmar que dicas e perguntas em rascunho só são visíveis a `CONTENT_EDITOR`/`ADMIN`, tal como já validado para os recursos nas Fases 3 e 4;
- ver o estado vazio caso não existam dicas ou perguntas publicadas (situação pouco provável com os dados mock, mas o componente deve suportar o caso).

Não existe nesta fase: criação, edição, reordenação ou publicação de dicas/perguntas (Fase 8 — Conteúdos).

---

## Âmbito

### Incluído

- `TipMockService` e `FaqMockService` (ou um serviço único que sirva ambos, com a mesma regra de visibilidade já usada nas fases anteriores);
- Página `/dicas-faq` (`features/tips-faq`);
- `TipCardComponent` (cartão de dica, reutilizando os *tokens* visuais já estabelecidos);
- Extensão/reutilização do `AccordionComponent` (Fase 1) para as perguntas frequentes, com agrupamento visual por categoria quando aplicável;
- Estado vazio e skeleton, reutilizando os componentes já existentes;
- Dados mock cobrindo, no mínimo, os exemplos já usados no protótipo, mais alguns adicionais para validar categorias diferentes e o estado de rascunho.

### Fora de âmbito

- Gestão editorial de dicas e perguntas (Fase 8);
- Pesquisa dedicada dentro desta página (não é um requisito de `project-spec.md` para esta área; se a pesquisa global vier a cobrir dicas/FAQ, isso é tratado numa fase de integração, não aqui);
- Qualquer ligação com os pedidos de suporte (ex.: sugerir uma FAQ antes de abrir um ticket) — fora do âmbito desta fase de UI.

---

## Entregáveis

1. Página `/dicas-faq` funcional com dados mock;
2. `TipMockService`/`FaqMockService`, testados;
3. `TipCardComponent` e acordeão de FAQ acessível, testados;
4. Regra de visibilidade por estado editorial validada com a ferramenta de simulação de função (Fase 2).

---

## Tarefas

### A. Modelos e dados mock

- Confirmar/estender os tipos `Tip` e `Faq` em `shared/models`, conforme o modelo de dados de `project-spec.md` (`TIP`, `FAQ`);
- Criar `shared/mocks/tips.mock.ts` e `shared/mocks/faqs.mock.ts`, com conteúdos coerentes com os exemplos já validados no protótipo (ex.: "Confirme os metadados antes de submeter um documento.", "Não consigo aceder ao Filedoc. O que devo verificar?"), mais exemplos adicionais para cobrir categorias e o estado de rascunho;
- As respostas das perguntas frequentes devem seguir a regra já definida em `project-spec.md`: prudentes, claras, genéricas quando não existir um procedimento institucional confirmado.

### B. Serviços mock

- Método para listar dicas publicadas (ou também rascunhos, consoante a função atual), ordenadas por `sortOrder`;
- Método para listar perguntas frequentes publicadas (ou também rascunhos, consoante a função), ordenadas por `sortOrder`, com a categoria disponível para agrupamento;
- Mesma regra de visibilidade por estado editorial e função já usada nas Fases 3 e 4;
- Testes unitários: listagem, ordenação, regra de visibilidade.

### C. Página `/dicas-faq`

- Secção "Dicas rápidas": grelha de `TipCardComponent`, tal como no protótipo (cartão com marcador circular e texto);
- Secção "Perguntas frequentes": acordeão, com cabeçalho de categoria quando as perguntas tiverem categoria definida, e perguntas sem categoria apresentadas numa secção genérica;
- Cada item do acordeão deve:
  - usar um `<button>` como cabeçalho, com `aria-expanded` refletindo o estado;
  - associar o painel através de `aria-controls`/`id`;
  - ser navegável e operável apenas por teclado;
  - animar a abertura/fecho respeitando `prefers-reduced-motion`;
- Skeleton enquanto os dados mock estão a ser "carregados" (mesmo padrão de atraso simulado das fases anteriores).

### D. Estado vazio

- Reutilizar o `EmptyStateComponent` (Fase 1) para o caso (pouco provável, mas suportado) de não existirem dicas ou perguntas publicadas para a função atual.

---

## Critérios de aceitação

- [ ] `/dicas-faq` mostra as dicas e as perguntas frequentes publicadas;
- [ ] O acordeão funciona corretamente por teclado (`Tab`, `Enter`/`Espaço`), com `aria-expanded` a refletir o estado real;
- [ ] Perguntas com categoria aparecem agrupadas; perguntas sem categoria aparecem numa secção genérica;
- [ ] Um utilizador mock `EMPLOYEE` não vê dicas/perguntas em rascunho; um `CONTENT_EDITOR` vê;
- [ ] O estado vazio aparece corretamente quando não há conteúdo publicado para a função atual (testável forçando esse cenário nos dados mock durante o desenvolvimento);
- [ ] Testado sem sobreposição ou corte nas cinco larguras de referência (320–1440 px);
- [ ] Testes unitários dos serviços mock e dos componentes passam;
- [ ] Lint, verificação de tipos, testes e build passam sem erros.

---

## Comandos de validação

```text
lint
format:check
typecheck
test
build
```

---

## Riscos e decisões em aberto

- Confirmar se o acordeão permite várias perguntas abertas em simultâneo ou apenas uma de cada vez — o protótipo mostra uma aberta por defeito, mas não impõe exclusividade; decisão a documentar no código do componente;
- Confirmar se dicas e perguntas sem categoria/ordem definida seguem a ordem de criação como critério de desempate.

---

## Dependência para a fase seguinte

A **Fase 6 (UI) — Suporte** é independente do conteúdo desta fase, mas reutiliza os mesmos padrões de acessibilidade e visibilidade por função já validados aqui e nas fases anteriores.

---

> Fase 5 (UI) — dicas e respostas rápidas, sempre acessíveis por teclado e nunca apresentadas como procedimento oficial confirmado quando não o são.
