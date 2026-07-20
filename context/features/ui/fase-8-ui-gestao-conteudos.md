# Fase 8 (UI) — Gestão de Conteúdos (Área Editorial)

Esta especificação define a **oitava fase da via de desenvolvimento do UI** do **Filedoc Recursos Formativos**, em Angular, com dados simulados (mock) — sem ligação à API NestJS nem a armazenamento de ficheiros real (MinIO/S3).

Assume como ponto de partida a Fase 1 (Design System), a Fase 2 (Autenticação), a Fase 3 (Catálogo — `ResourceMockService`) e a Fase 5 (Dicas & FAQ — respetivos serviços mock).

Coerente com `project-spec.md` (secções B e N — Organização dos recursos e Gestão editorial), `project-overview.md`, `coding-standards.md` e `ai-interaction.md`.

---

## Objetivo

No final desta fase, deve ser possível, sem qualquer API real, com um utilizador mock `CONTENT_EDITOR` (ou `ADMIN`):

- aceder a `/conteudos` e ver a tabela de recursos com estado editorial, com pesquisa e filtro por estado (Todos, Rascunho, Publicado, Arquivado);
- criar um novo recurso (vídeo ou guia), preenchendo todos os campos obrigatórios definidos em `project-spec.md`, com validação client-side;
- editar um recurso existente, duplicá-lo, pré-visualizá-lo (reutilizando o ecrã de detalhe da Fase 4, num modo que ignora o estado editorial para o próprio editor);
- guardar como rascunho, publicar, despublicar e arquivar, com as transições de estado corretas e confirmação para ações menos reversíveis;
- simular o carregamento de vídeo, PDF e miniatura (sem upload real, mas com validação client-side de extensão e apresentação de um nome de ficheiro simulado);
- gerir dicas e perguntas frequentes (criar, editar, ordenar, publicar, despublicar, arquivar), reutilizando os serviços mock da Fase 5;
- gerir taxonomias (fluxos, tipos de documento, etiquetas): listar, criar, editar, ativar/desativar, reordenar, e confirmar que **não é possível eliminar uma taxonomia associada a recursos existentes** sem uma migração explícita (nesta fase, simulada apenas como um bloqueio com mensagem clara);
- confirmar que um utilizador mock `EMPLOYEE`/`SUPPORT_AGENT` é bloqueado no acesso a `/conteudos`.

Não existe nesta fase: upload real de ficheiros, nem qualquer chamada HTTP real.

---

## Âmbito

### Incluído

- Extensão do `ResourceMockService` (Fase 3) com operações de escrita: `create`, `update`, `duplicate`, `publish`, `unpublish`, `archive`;
- Extensão dos serviços de Dicas/FAQ (Fase 5) com operações equivalentes: `create`, `update`, `reorder`, `publish`, `unpublish`, `archive`;
- `TaxonomyMockService` (fluxos, tipos de documento, etiquetas): `list`, `create`, `update`, `toggleActive`, `reorder`, `delete` (com bloqueio quando associada a recursos);
- Página `/conteudos` (`features/content-management`), protegida por `roleGuard` (`CONTENT_EDITOR`, `ADMIN`);
- Formulário de criação/edição de recurso, com todas as validações obrigatórias de `project-spec.md`, secção N;
- Simulação de upload (seleção de ficheiro local, validação de extensão/tamanho no cliente, apresentação do nome e, quando aplicável, de uma pré-visualização, sem qualquer envio real);
- Sub-área de gestão de Dicas e de Perguntas frequentes, dentro da mesma página ou em rotas próprias (`/conteudos/dicas`, `/conteudos/faqs`), a decidir mantendo consistência com o padrão já estabelecido;
- Sub-área de gestão de Taxonomias (`/conteudos/taxonomias` ou secção da mesma página).

### Fora de âmbito

- Upload real para MinIO/S3, geração de URLs temporários (integração com API/armazenamento);
- Processamento de vídeo (compressão, geração de miniaturas automáticas) — fora do âmbito de qualquer fase de UI;
- Auditoria das ações editoriais (Fase 9 — Administração);
- Fluxos de aprovação/revisão entre editores (não previstos em `project-spec.md`).

---

## Entregáveis

1. Página `/conteudos` funcional, com CRUD simulado completo sobre recursos, dicas, perguntas frequentes e taxonomias;
2. Serviços mock estendidos, testados, incluindo os bloqueios de eliminação de taxonomias em uso;
3. Formulário de recurso com todas as validações obrigatórias;
4. Simulação de upload validada (extensão, tamanho, apresentação).

---

## Tarefas

### A. Extensão dos serviços mock

- `ResourceMockService.create/update`: validação alinhada com `project-spec.md` (título, slug único, resumo, descrição, tipo, fluxo, tipo de documento, dificuldade, ficheiro principal, texto alternativo da miniatura, duração para vídeos, páginas/passos quando aplicável);
- Geração/validação de slug único (bloquear duplicados nos dados mock, com mensagem clara);
- `publish`/`unpublish`/`archive`: transições de estado coerentes com `project-spec.md` (ex.: só é possível publicar um recurso com todos os campos obrigatórios preenchidos);
- `TaxonomyMockService.delete`: bloqueia a eliminação quando existirem recursos mock associados àquela taxonomia, devolvendo uma mensagem explicativa (nunca eliminação silenciosa nem eliminação forçada nesta fase);
- Testes unitários de cada validação e transição, incluindo os casos de bloqueio.

### B. Tabela de recursos (`/conteudos`)

- Reutilizar o padrão de tabela já validado no protótipo: pesquisa, filtro por estado editorial (controlo segmentado), colunas (recurso, tipo, fluxo, estado, atualizado, autor, ações);
- Ações por linha: editar, duplicar, publicar/despublicar, arquivar — com confirmação (`DialogComponent`, Fase 1) para arquivar, por ser uma ação com impacto na visibilidade do recurso;
- Botão "Criar recurso" sempre visível.

### C. Formulário de recurso

- Reutilizar Angular Reactive Forms com tipagem estrita;
- Campos e validações conforme `project-spec.md`, secção N;
- Diferenciação de campos consoante o tipo (duração para vídeo; páginas/passos para guia);
- Ação "Guardar como rascunho" (sem exigir todos os campos obrigatórios à publicação, mas ainda assim com validação mínima de integridade) e "Publicar" (exige todos os campos obrigatórios);
- Pré-visualização: reutilizar o ecrã de detalhe (Fase 4) num modo que permita ao editor ver rascunhos, claramente identificado como "Pré-visualização" e não como o ecrã público real.

### D. Simulação de upload

- Componente de upload (`shared/components/file-upload`), reutilizável para vídeo, PDF e miniatura;
- Validação client-side: extensões permitidas por tipo de ficheiro, tamanho máximo (valores indicativos, configuráveis mais tarde pela API);
- Apresentação do nome do ficheiro selecionado e, quando aplicável (imagem), uma pré-visualização local (via `URL.createObjectURL`, sem qualquer envio);
- Nunca simular uma barra de progresso de upload real — antes disso existir de facto (integração com API), o componente deve deixar claro, no código, que é apenas uma simulação de seleção.

### E. Gestão de Dicas e Perguntas frequentes

- Reutilizar os serviços mock da Fase 5, estendidos com `create`, `update`, `reorder`, `publish`, `unpublish`, `archive`;
- Listas com estado editorial e ações rápidas, tal como esboçado no protótipo (secção "Dicas rápidas" / "Perguntas frequentes" dentro de Conteúdos);
- Reordenação (ex.: arrastar e largar, ou botões "subir"/"descer" como alternativa acessível — a alternativa por botões é obrigatória, mesmo que exista também arrastar e largar, para garantir operabilidade por teclado).

### F. Gestão de Taxonomias

- Listagem de fluxos, tipos de documento e etiquetas, com estado ativo/inativo e ordem de apresentação;
- Criar/editar taxonomia (nome, slug, descrição quando aplicável);
- Ativar/desativar;
- Eliminar, com bloqueio e mensagem clara quando associada a recursos existentes nos dados mock.

### G. Proteção por função

- `/conteudos` (e sub-rotas) só acessível a `CONTENT_EDITOR`/`ADMIN` (via `roleGuard`);
- Testar explicitamente que `EMPLOYEE`/`SUPPORT_AGENT` são bloqueados.

---

## Critérios de aceitação

- [ ] `/conteudos` lista os recursos mock com pesquisa e filtro por estado editorial;
- [ ] Criar um recurso com todos os campos obrigatórios preenchidos permite publicá-lo; faltando algum, a publicação é bloqueada com mensagens de erro claras junto aos campos;
- [ ] Guardar como rascunho funciona com validação mínima, sem exigir todos os campos obrigatórios à publicação;
- [ ] Duplicar, publicar, despublicar e arquivar funcionam e refletem-se imediatamente na tabela e no catálogo (Fase 3, mesmo serviço mock);
- [ ] A simulação de upload valida extensão e tamanho no cliente, e mostra o nome do ficheiro selecionado (e pré-visualização, quando aplicável);
- [ ] A pré-visualização de um recurso em rascunho é claramente identificada como tal, nunca confundida com o ecrã público;
- [ ] Dicas e perguntas frequentes podem ser criadas, editadas, reordenadas (incluindo por botões, sem depender de arrastar e largar) e têm o respetivo ciclo editorial;
- [ ] Eliminar uma taxonomia associada a recursos existentes é bloqueado, com mensagem explicativa; eliminar uma taxonomia sem associações funciona;
- [ ] Um utilizador mock `EMPLOYEE`/`SUPPORT_AGENT` é bloqueado no acesso a `/conteudos`;
- [ ] Testado sem sobreposição ou corte nas cinco larguras de referência (320–1440 px);
- [ ] Testes unitários dos serviços mock estendidos e do formulário de recurso passam;
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

- Confirmar se a reordenação de dicas/perguntas/taxonomias usa arrastar e largar como interação principal — nesse caso, a alternativa por botões "subir"/"descer" é obrigatória por acessibilidade, não opcional;
- Confirmar os valores indicativos de validação de upload (extensões, tamanho máximo) usados nesta fase de UI, deixando claro no código que serão substituídos pelos valores reais de configuração vindos da API;
- A pré-visualização de rascunhos reutiliza o ecrã de detalhe da Fase 4 — confirmar que essa reutilização não introduz acoplamento indevido entre a área pública e a área editorial (ex.: via um `input()` de "modo pré-visualização", não por duplicação de código).

---

## Dependência para a fase seguinte

A **Fase 9 (UI) — Administração** é independente do conteúdo editorial em si, mas reutiliza o mesmo padrão de tabela com pesquisa/filtro/ações e o mesmo `TaxonomyMockService` (para o resumo de taxonomias visível na área de administração, tal como esboçado no protótipo).

---

> Fase 8 (UI) — a área editorial é onde o conteúdo do portal ganha vida; esta fase garante que nada é publicado sem os requisitos mínimos, e que nada em uso é eliminado por engano.
