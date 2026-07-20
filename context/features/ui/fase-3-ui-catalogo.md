# Fase 3 (UI) — Catálogo de Recursos

Esta especificação define a **terceira fase da via de desenvolvimento do UI** do **Filedoc Recursos Formativos**, em Angular, com dados simulados (mock) — sem ligação à API NestJS.

Assume como ponto de partida a Fase 1 (Design System & Casca da Aplicação) e a Fase 2 (Autenticação), já concluídas.

Coerente com `project-spec.md` (secções A, B e C — Recursos, Organização e Catálogo), `project-overview.md`, `coding-standards.md` e `ai-interaction.md`.

---

## Objetivo

No final desta fase, deve ser possível, sem qualquer API real:

- aceder a `/recursos` e ver uma grelha de cartões de recursos (vídeos e guias), com dados de um conjunto mock suficientemente representativo (mínimo ~20 recursos, cobrindo todos os fluxos, tipos de documento, dificuldades e estados editoriais previstos em `project-spec.md`);
- pesquisar por texto (título, resumo, etiquetas) com atualização dos resultados sem recarregar a página;
- filtrar por tipo de recurso, fluxo e dificuldade, com contagem de resultados atualizada;
- limpar filtros individualmente e todos em conjunto;
- ver o estado vazio quando a combinação de filtros não produz resultados;
- navegar por páginas de resultados (paginação client-side sobre os dados mock, preparada para vir a ser substituída por paginação de servidor);
- ver os filtros e a pesquisa refletidos no URL (query parameters), para permitir partilhar/retomar uma pesquisa;
- confirmar que um recurso em estado "rascunho" só é visível no catálogo quando a sessão simulada (Fase 2) corresponde a um `CONTENT_EDITOR` ou `ADMIN`; para `EMPLOYEE`/`SUPPORT_AGENT`, apenas recursos publicados aparecem.

Não existe nesta fase: chamadas HTTP reais, paginação de servidor real, nem qualquer ecrã de detalhe de recurso (Fase 4).

---

## Âmbito

### Incluído

- `ResourceMockService` (ou equivalente) com o conjunto de dados mock e a lógica de filtragem/pesquisa/paginação em memória, com uma interface (assinatura de métodos) já pensada para ser substituída por um serviço que chama a API real, sem alterar os componentes que o consomem;
- Página de catálogo (`features/resources/catalog`);
- Barra de ferramentas do catálogo: pesquisa por texto, controlo segmentado de tipo, *dropdowns* de fluxo e dificuldade (componentes já construídos na Fase 1, agora ligados a dados e lógica reais);
- Grelha de cartões de recurso, responsiva (`auto-fill`, sem coluna fixa de filtros lateral, conforme decisão já validada no protótipo);
- Estado vazio com ação de "limpar filtros";
- Paginação (client-side nesta fase);
- Sincronização dos filtros/pesquisa com os query parameters do URL;
- Visibilidade condicionada ao estado editorial e à função do utilizador simulado (Fase 2);
- Skeletons durante a "pesquisa" simulada (mesmo que instantânea, simular um pequeno atraso para validar o estado de carregamento, tal como já decidido na Fase 2 para o login).

### Fora de âmbito

- Página de detalhe de recurso (Fase 4);
- Pesquisa no servidor, índices, ou qualquer otimização de base de dados (isso é tratado na fase de integração com a API);
- Upload, edição ou publicação de recursos (Fase 8 — Conteúdos);
- Ordenação avançada além de "mais recentes" e "alfabética" (o `select-fake` do protótipo pode tornar-se um `select` real com estas duas opções nesta fase; ordenações adicionais não são obrigatórias aqui);
- Recomendações, recursos relacionados (aparecem no detalhe, Fase 4).

---

## Entregáveis

1. Página `/recursos` funcional com dados mock;
2. `ResourceMockService`, testado, com uma interface estável para substituição futura;
3. Componentes de filtro ligados a lógica real (pesquisa, filtragem, contagem, limpar);
4. Paginação funcional sobre os dados mock;
5. Sincronização com o URL testada.

---

## Tarefas

### A. Modelo e dados mock

- Confirmar/estender o tipo `Resource` em `shared/models`, cobrindo todos os campos definidos em `project-spec.md`, secção A e no modelo de dados (`RESOURCE`);
- Criar `shared/mocks/resources.mock.ts` com um conjunto representativo e plausível de recursos, incluindo exemplos em cada estado editorial (rascunho, publicado, arquivado), cada tipo (vídeo, guia), cada dificuldade e vários fluxos/tipos de documento;
- Os dados mock devem ser claramente fictícios (nomes de tarefas genéricos, sem inventar procedimentos reais da DGADR como se fossem oficiais).

### B. `ResourceMockService`

- Método `search(params): Observable<{ items: Resource[]; total: number }>` (ou equivalente com Signals), aceitando: texto de pesquisa, tipo, fluxo(s), dificuldade(s), página, tamanho de página, ordenação;
- A filtragem por texto cobre título, resumo e etiquetas;
- A visibilidade por estado editorial depende da função do utilizador atual, obtida do `AuthService` da Fase 2;
- Simular um pequeno atraso de resposta (ex.: `delay(300)` sobre um `Observable`), para validar o estado de carregamento de forma realista;
- Testes unitários: pesquisa por texto, cada filtro isoladamente, combinação de filtros, paginação, e a regra de visibilidade por estado editorial/função.

### C. Página de catálogo

- Layout conforme o protótipo: barra de ferramentas no topo (pesquisa + segmentado de tipo + *dropdowns* de fluxo/dificuldade + limpar filtros), barra de resultados (contagem + ordenação), grelha de cartões, paginação;
- Usar `switchMap` (RxJS) ao reagir a alterações de filtros/pesquisa, para cancelar corretamente pedidos "em curso" anteriores quando o utilizador continua a escrever/filtrar;
- `ResourceCardComponent` (já existente da Fase 1) recebe os dados via `input()` tipado; a ação principal ("Ver vídeo" / "Abrir guia") nesta fase pode apenas navegar para `/recursos/:slug` (cujo conteúdo chega na Fase 4).

### D. Filtros e pesquisa

- Pesquisa: campo de texto ligado com *debounce* (ex.: 250 ms) antes de disparar a filtragem;
- Tipo: controlo segmentado (Todos / Vídeo / Guia PDF);
- Fluxo e Dificuldade: *dropdowns* com checkboxes e contador de selecionados, tal como no protótipo;
- Botão/link "Limpar filtros", visível sempre, e também dentro do estado vazio;
- Sincronizar todos os parâmetros de pesquisa com o URL (`queryParams`), de forma que recarregar a página ou partilhar o URL reproduza a mesma pesquisa.

### E. Paginação e estados

- Paginação client-side sobre o resultado filtrado, com um tamanho de página razoável (ex.: 12);
- Estado de carregamento: skeletons no lugar dos cartões enquanto a pesquisa simulada decorre;
- Estado vazio: componente já existente da Fase 1, com mensagem e ação de limpar filtros;
- Testar em 320 px, 375 px, 768 px, 1024 px e 1440 px, sem sobreposição nem corte, incluindo a barra de ferramentas (que deve adaptar-se tal como validado no protótipo).

### F. Visibilidade por estado editorial e função

- `EMPLOYEE` e `SUPPORT_AGENT`: apenas recursos publicados;
- `CONTENT_EDITOR` e `ADMIN`: recursos publicados e em rascunho (os arquivados nunca aparecem no catálogo, independentemente da função, conforme `project-spec.md`);
- Usar a ferramenta de simulação de função da Fase 2 para validar visualmente esta regra com os diferentes utilizadores mock.

---

## Critérios de aceitação

- [ ] `/recursos` mostra a grelha de recursos mock, com skeletons durante o carregamento simulado;
- [ ] A pesquisa por texto filtra corretamente por título, resumo e etiquetas;
- [ ] Os filtros de tipo, fluxo e dificuldade funcionam isoladamente e em combinação;
- [ ] A contagem de resultados e o estado vazio refletem sempre o resultado atual;
- [ ] "Limpar filtros" repõe o catálogo completo;
- [ ] A paginação funciona e não mistura resultados de páginas diferentes;
- [ ] Recarregar a página com filtros ativos no URL reproduz a mesma pesquisa;
- [ ] Um utilizador mock `EMPLOYEE` nunca vê recursos em rascunho; um `CONTENT_EDITOR` vê;
- [ ] Nenhum recurso arquivado aparece no catálogo, independentemente da função;
- [ ] Testado sem sobreposição ou corte nas cinco larguras de referência;
- [ ] Testes unitários do `ResourceMockService` e dos componentes de filtro passam;
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

- Confirmar o tamanho de página da paginação client-side (valor indicativo: 12) — sem impacto arquitetural, pode ajustar-se livremente nesta fase;
- A assinatura do `ResourceMockService` deve ser revista com atenção antes de terminar esta fase, para minimizar alterações nos componentes quando for substituído pelo serviço real (Fase de integração);
- Confirmar se a ordenação "mais recentes" usa a data de publicação ou a de atualização como referência (`project-spec.md` prevê ambas como critérios possíveis) — decisão a documentar no código.

---

## Dependência para a fase seguinte

A **Fase 4 (UI) — Detalhe de recurso** assume como ponto de partida:

- o `ResourceMockService` (ou um serviço irmão sobre os mesmos dados mock) capaz de devolver um recurso por `slug`;
- a navegação `/recursos/:slug` já ligada a partir dos cartões do catálogo;
- os dados mock já a cobrir exemplos completos de vídeo e de guia, com todos os campos necessários ao ecrã de detalhe (duração, número de páginas/passos, recursos relacionados).

---

> Fase 3 (UI) — o catálogo é o coração do portal; esta fase garante que pesquisar, filtrar e navegar entre recursos é rápido, claro e acessível, mesmo antes de existir qualquer dado real.
