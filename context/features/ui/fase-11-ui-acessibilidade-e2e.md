# Fase 11 (UI) — Acessibilidade, Responsividade e Testes E2E de UI

Esta especificação define a **décima primeira e última fase da via de desenvolvimento do UI** do **Filedoc Recursos Formativos**, em Angular, ainda com dados simulados (mock) — sem ligação à API NestJS.

Não introduz ecrãs novos. Consolida e audita, como um todo coerente, tudo o que foi construído nas Fases 1 a 10, e prepara formalmente a transição para a via de integração com a API real (que retoma a partir de `fase-1-fundacao.md`, já existente, e das fases full-stack seguintes).

Coerente com `project-spec.md` (secções de Acessibilidade, Responsividade e Testes), `project-overview.md`, `coding-standards.md` e `ai-interaction.md`.

---

## Objetivo

No final desta fase:

- todos os ecrãs construídos nas Fases 1 a 10 passam sem violações num verificador automático de acessibilidade (axe-core ou equivalente), para cada função simulada relevante;
- toda a aplicação é utilizável apenas por teclado, do login ao logout, incluindo todas as áreas protegidas por função;
- toda a aplicação foi validada nas cinco larguras de referência de `project-spec.md` (320 px, 375 px, 768 px, 1024 px, 1440 px), sem sobreposição, corte ou deslocamento horizontal indevido, em qualquer ecrã;
- os temas claro e escuro foram auditados em toda a aplicação, com contraste WCAG AA confirmado;
- `prefers-reduced-motion` é respeitado em toda a aplicação;
- a aplicação permanece utilizável a 200% de zoom;
- existe uma suite de testes E2E (Playwright) cobrindo os catorze fluxos mínimos definidos em `project-spec.md`, todos executáveis sobre os serviços mock (sem depender de backend real);
- existe um registo claro e único de todas as interfaces de serviço mock criadas ao longo da via (`ResourceMockService`, `AuthService`, `SupportTicketMockService`, `TipMockService`/`FaqMockService`, `TaxonomyMockService`, `UserMockService`, `AuditLogMockService`), como referência para a fase de integração.

---

## Âmbito

### Incluído

- Integração de axe-core (ou equivalente) nos testes automatizados, correndo contra cada rota principal, para cada função simulada com acesso a essa rota;
- Correção de todas as violações encontradas (não apenas o seu registo);
- Auditoria manual de navegação por teclado em toda a aplicação (checklist por ecrã);
- Auditoria responsiva sistemática nas cinco larguras de referência, em todos os ecrãs de todas as fases;
- Auditoria de contraste em ambos os temas;
- Auditoria de `prefers-reduced-motion`;
- Auditoria de zoom a 200%;
- Auditoria do tamanho dos alvos táteis em ecrãs móveis;
- Suite de testes E2E (Playwright) cobrindo os catorze fluxos de `project-spec.md` realizáveis com os serviços mock;
- Documento de referência das interfaces dos serviços mock, para orientar a fase de integração.

### Fora de âmbito

- Qualquer alteração funcional que não decorra diretamente de uma violação de acessibilidade, responsividade ou de um teste E2E falhado (esta fase não é para adicionar funcionalidades novas);
- Testes de desempenho sob carga (não há backend real ainda);
- Testes de segurança (dependem da API real);
- Integração com a API — começa depois desta fase, numa via distinta.

---

## Tarefas

### A. Auditoria de acessibilidade automatizada

- Configurar axe-core (ou equivalente) nos testes de componente/E2E;
- Correr contra, no mínimo, as seguintes rotas, com cada função simulada que a elas acede:

```text
/login
/inicio
/recursos
/recursos/:slug (vídeo e guia)
/dicas-faq
/suporte
/suporte/novo
/suporte/:id
/suporte/gestao        (SUPPORT_AGENT, ADMIN)
/conteudos              (CONTENT_EDITOR, ADMIN)
/administracao          (ADMIN)
/acesso-negado
/** (não encontrado)
```

- Zero violações críticas ou sérias por rota; violações menores documentadas e corrigidas sempre que razoável dentro do âmbito desta fase.

### B. Auditoria de navegação por teclado

Para cada ecrã da lista acima, confirmar manualmente:

- é possível chegar a todos os elementos interativos por `Tab`/`Shift+Tab`, em ordem lógica;
- o foco é sempre visível;
- diálogos (`DialogComponent`) contêm o foco enquanto abertos e devolvem o foco ao elemento que os abriu, ao fechar;
- menus, *dropdowns* de filtro e o acordeão de FAQ são operáveis por teclado (`Enter`/`Espaço`/setas, conforme o padrão ARIA aplicável);
- o link "saltar para o conteúdo" (Fase 1) funciona em todos os ecrãs;
- nenhum comportamento depende exclusivamente de rato ou de gestos táteis.

### C. Auditoria responsiva

- Repetir, para **todos** os ecrãs construídos (não apenas os já testados individualmente em cada fase), a verificação nas cinco larguras de referência;
- Prestar atenção especial aos ecrãs de layout mais complexo: barra de ferramentas do catálogo (Fase 3), painel lista+detalhe da Gestão de suporte (Fase 7), tabelas de Conteúdos e Administração (Fases 8 e 9);
- Confirmar que o menu de gaveta (Fase 1) continua a funcionar corretamente em todos os ecrãs, incluindo os adicionados nas fases posteriores.

### D. Auditoria de tema e contraste

- Alternar entre tema claro e escuro em cada ecrã da lista da secção A;
- Confirmar contraste WCAG AA em texto, ícones funcionais e estados (não apenas nos elementos already validados isoladamente em cada fase);
- Confirmar ausência de flash de tema incorreto em qualquer ponto de entrada da aplicação (não só em `/login`, também ao recarregar uma rota profunda, ex.: `/recursos/:slug`).

### E. Auditoria de movimento, zoom e alvos táteis

- Confirmar que todas as transições/animações (troca de ecrã, abertura de diálogo, acordeão, *toasts*) respeitam `prefers-reduced-motion`;
- Confirmar que a 200% de zoom nenhum ecrã perde conteúdo ou funcionalidade (pode reorganizar-se, nunca cortar ou sobrepor);
- Confirmar, em viewport móvel, que todos os alvos interativos têm dimensão tátil adequada (mínimo indicativo de 44×44 px).

### F. Suite de testes E2E (Playwright)

Implementar, sobre os serviços mock, os catorze fluxos mínimos de `project-spec.md`:

1. início de sessão;
2. pesquisa de recurso;
3. aplicação de filtros;
4. abertura de vídeo;
5. abertura de PDF;
6. criação de ticket;
7. consulta do ticket;
8. resposta do trabalhador;
9. resposta do agente;
10. nota interna;
11. resolução;
12. publicação de recurso;
13. gestão de utilizador;
14. bloqueio de acesso indevido (ex.: `EMPLOYEE` a tentar aceder a `/administracao`, e um utilizador a tentar aceder ao pedido de outro).

- Cada teste deve usar os utilizadores mock já definidos (Fase 2), sem depender de estado deixado por outro teste (isolamento entre testes, conforme `coding-standards.md`);
- Correr esta suite no CI (mesmo pipeline que já corre lint/typecheck/build desde a Fase 1).

### G. Documento de referência das interfaces mock

Produzir um documento curto (`docs/interfaces-mock-ui.md` ou similar) que liste, para cada serviço mock criado ao longo da via, a sua assinatura pública (métodos e tipos de entrada/saída), servindo de contrato a respeitar quando cada serviço for substituído pelo respetivo consumo real da API, fase a fase, na via de integração.

---

## Critérios de aceitação

- [ ] Zero violações críticas/sérias de axe-core em todas as rotas listadas, para todas as funções relevantes;
- [ ] Toda a aplicação é operável apenas por teclado, confirmado ecrã a ecrã;
- [ ] Todos os ecrãs validados nas cinco larguras de referência, sem sobreposição, corte ou deslocamento horizontal;
- [ ] Contraste WCAG AA confirmado em ambos os temas, em todos os ecrãs;
- [ ] Nenhum flash de tema incorreto detetado em nenhum ponto de entrada testado;
- [ ] `prefers-reduced-motion` respeitado em todas as animações da aplicação;
- [ ] Aplicação utilizável a 200% de zoom em todos os ecrãs;
- [ ] Alvos táteis com dimensão adequada em todos os ecrãs móveis;
- [ ] Os catorze fluxos E2E de `project-spec.md` implementados e a passar de forma consistente (sem instabilidade — testes instáveis são corrigidos, nunca apenas repetidos automaticamente);
- [ ] Documento de referência das interfaces mock publicado e revisto;
- [ ] Lint, verificação de tipos, testes unitários, testes E2E e build passam sem erros em CI.

---

## Comandos de validação

```text
lint
format:check
typecheck
test
test:e2e
build
```

---

## Riscos e decisões em aberto

- Algumas violações de acessibilidade podem obrigar a pequenos ajustes em componentes partilhados já usados em muitos ecrãs (ex.: `DropdownFilterComponent`, `AccordionComponent`) — nesse caso, a alteração deve ser feita uma vez no componente partilhado, nunca replicada ecrã a ecrã;
- Confirmar se a suite E2E corre contra uma build real da aplicação (servida localmente) ou em modo de desenvolvimento — recomenda-se contra uma build de produção, mais fiel ao comportamento final;
- O documento de interfaces mock deve ser mantido atualizado se, durante a auditoria desta fase, alguma assinatura de serviço mock precisar de ajuste — o documento reflete o estado final, não o histórico.

---

## Fecho da via de UI

Com esta fase concluída, a via de desenvolvimento do UI (Fases 1 a 11) está terminada: existe uma aplicação Angular completa, navegável, acessível e responsiva, com todas as áreas previstas em `project-overview.md`, a funcionar inteiramente sobre dados e serviços simulados.

A partir daqui, o trabalho segue para a via de integração com a API real, começando pela fundação já especificada em `fase-1-fundacao.md` (base técnica full-stack) e prosseguindo, fase a fase, pela substituição controlada de cada serviço mock pelo respetivo consumo real da API NestJS — nunca alterando os componentes de UI mais do que o estritamente necessário para essa troca, conforme o princípio da menor alteração suficiente definido em `ai-interaction.md`.

---

> Fase 11 (UI) — o fecho da via: se algo não funcionar bem aqui, por teclado, em qualquer largura, em qualquer tema, não deve avançar para a integração à espera que a API "resolva" o problema.
