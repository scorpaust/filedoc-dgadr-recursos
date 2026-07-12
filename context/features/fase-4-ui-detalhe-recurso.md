# Fase 4 (UI) — Detalhe de Recurso (Vídeo / Guia)

Esta especificação define a **quarta fase da via de desenvolvimento do UI** do **Filedoc Recursos Formativos**, em Angular, com dados simulados (mock) — sem ligação à API NestJS nem a armazenamento de ficheiros real (MinIO/S3).

Assume como ponto de partida a Fase 1 (Design System), a Fase 2 (Autenticação) e a Fase 3 (Catálogo), já concluídas.

Coerente com `project-spec.md` (secções D e E — Vídeos e Guias em PDF), `project-overview.md`, `coding-standards.md` e `ai-interaction.md`.

---

## Objetivo

No final desta fase, deve ser possível, sem qualquer API real:

- navegar de um cartão do catálogo (Fase 3) para `/recursos/:slug` e ver a página de detalhe correspondente;
- quando o recurso é um **vídeo**: ver um leitor de vídeo funcional (com um ficheiro de vídeo de demonstração, nunca conteúdo institucional real), com controlos acessíveis, sem reprodução automática, com legendas quando disponíveis nos dados mock;
- quando o recurso é um **guia em PDF**: ver um visualizador de PDF embutido, com alternativa de download, e um ficheiro de demonstração (nunca conteúdo institucional real);
- ver os metadados do recurso (fluxo, tipo de documento, dificuldade, etiquetas, data de atualização);
- ver recursos relacionados, com navegação funcional entre eles;
- usar a ação "Pedir suporte sobre este tema", que navega para o formulário de novo pedido de suporte (Fase 6) com o recurso pré-associado;
- ver o estado de "recurso não encontrado" (página já criada na Fase 1) quando o `slug` não corresponde a nenhum recurso mock, ou quando o recurso está em rascunho e a função do utilizador simulado não permite vê-lo.

Não existe nesta fase: upload ou edição do recurso (Fase 8), ficheiros reais da DGADR, nem qualquer mecanismo real de controlo de acesso a ficheiros privados (isso pertence à integração com a API e o armazenamento).

---

## Âmbito

### Incluído

- Página de detalhe de recurso (`features/resources/detail`), com duas variantes de apresentação (vídeo / guia) consoante o `resourceType` do recurso devolvido pelo `ResourceMockService`;
- `VideoPlayerComponent`: leitor de vídeo acessível, reutilizável, standalone;
- `PdfViewerComponent`: visualizador de PDF embutido com alternativa de download, reutilizável, standalone;
- Painel lateral de metadados (`ResourceMetaComponent`, reutilizando `TagComponent`/`CarimboComponent` da Fase 1);
- Secção de recursos relacionados (reutilizando, ou estendendo, o `ResourceCardComponent` já existente, em versão compacta);
- Ação "Pedir suporte sobre este tema", com passagem do identificador do recurso via query parameter ou estado de navegação;
- Tratamento do estado "não encontrado" e "sem permissão" (rascunho + função sem acesso), reutilizando componentes já criados na Fase 1;
- Ficheiros de demonstração (vídeo curto e PDF curto, genéricos, sem qualquer conteúdo institucional real) incluídos apenas para efeitos de desenvolvimento local, nunca commitados como se fossem conteúdo oficial.

### Fora de âmbito

- Upload, edição, substituição de ficheiros (Fase 8 — Conteúdos);
- URLs temporários reais ou qualquer mecanismo de autorização de acesso a ficheiros (integração com API/armazenamento);
- Transcrições (previstas apenas para a Segunda Fase do roadmap geral do produto, não desta via de UI);
- Avaliação de utilidade do recurso, favoritos (Segunda Fase do roadmap geral);
- Impressão ou exportação do guia em formatos adicionais.

---

## Entregáveis

1. Página de detalhe funcional para vídeo e para guia, com dados mock;
2. `VideoPlayerComponent` e `PdfViewerComponent`, testados e documentados;
3. Painel de metadados e recursos relacionados;
4. Ligação funcional entre o detalhe e o formulário de novo pedido de suporte (mesmo que este último só ganhe conteúdo completo na Fase 6);
5. Estados de "não encontrado" e "sem permissão" verificados.

---

## Tarefas

### A. Obtenção do recurso por `slug`

- Estender o `ResourceMockService` (Fase 3) com um método `getBySlug(slug): Observable<Resource | null>`;
- Aplicar a mesma regra de visibilidade por estado editorial e função já validada na Fase 3 (um rascunho só é devolvido a `CONTENT_EDITOR`/`ADMIN`);
- Usar um *resolver* de rota, ou carregamento no próprio componente com skeleton, para obter o recurso — decisão a documentar, mantendo consistência com o padrão usado no catálogo.

### B. `VideoPlayerComponent`

- Elemento `<video>` nativo, sem reprodução automática;
- Controlos nativos ou personalizados, mas sempre acessíveis por teclado (play/pausa, volume, ecrã completo, barra de progresso com valor anunciado);
- Suporte a legendas (`<track>`) quando o recurso mock as tiver associadas;
- Alternativa textual visível junto ao leitor (ex.: a descrição do recurso já cobre parte deste requisito; confirmar que não depende exclusivamente do vídeo para transmitir a informação essencial);
- Adaptação a ecrãs móveis (o leitor nunca deve obrigar a deslocamento horizontal).

### C. `PdfViewerComponent`

- Visualização embutida do PDF (ex.: via `<iframe>` ou `<embed>` apontando para o ficheiro mock, ou uma biblioteca de visualização, a decidir sem introduzir uma dependência pesada sem necessidade demonstrada, conforme `coding-standards.md`);
- Alternativa clara "Descarregar PDF" sempre visível, para browsers ou situações em que a visualização embutida não funcione;
- Nunca reescrever ou reprocessar o conteúdo do PDF — apenas apresentá-lo e permitir o descarregamento.

### D. Metadados e recursos relacionados

- `ResourceMetaComponent`: fluxo, tipo de documento, dificuldade, etiquetas, data de atualização, e (consoante o tipo) duração ou número de páginas/passos — reaproveitando os componentes `TagComponent`/`CarimboComponent` já existentes;
- Secção "Recursos relacionados": lista compacta (2–4 itens) de outros recursos mock do mesmo fluxo ou com etiquetas em comum, cada um a navegar para o respetivo `/recursos/:slug`.

### E. Ação de suporte a partir do detalhe

- Botão "Pedir suporte sobre este tema" que navega para a rota de novo pedido de suporte, passando o identificador (e idealmente o título, para pré-preencher o assunto) do recurso atual;
- Nesta fase, a página de destino pode ainda ser o placeholder da Fase 1/2 — o objetivo aqui é garantir que a navegação e a passagem de dados funcionam; o formulário completo só é construído na Fase 6.

### F. Estados de erro e permissão

- `slug` inexistente → página "recurso não encontrado" (Fase 1);
- `slug` de um recurso em rascunho, com função sem permissão → mesma página, sem revelar que o recurso existe mas está inacessível (mensagem genérica, coerente com o princípio de não expor informação desnecessária);
- Skeleton enquanto o recurso mock está a ser "carregado" (com o mesmo pequeno atraso simulado usado na Fase 3).

---

## Critérios de aceitação

- [ ] Um cartão do catálogo navega corretamente para o detalhe correspondente;
- [ ] Um recurso de vídeo mostra o leitor, sem reprodução automática, com controlos acessíveis por teclado;
- [ ] Um recurso de guia mostra o visualizador de PDF e a ação de descarregar;
- [ ] Os metadados apresentados correspondem exatamente aos dados mock do recurso;
- [ ] Os recursos relacionados navegam corretamente entre si;
- [ ] "Pedir suporte sobre este tema" leva ao formulário de novo pedido com o recurso identificado;
- [ ] Um `slug` inexistente mostra a página de "não encontrado";
- [ ] Um recurso em rascunho é inacessível a um utilizador mock `EMPLOYEE`, mostrando a página adequada, sem revelar a existência do recurso;
- [ ] Testado sem sobreposição ou corte nas cinco larguras de referência (320–1440 px);
- [ ] Testes unitários dos novos componentes (`VideoPlayerComponent`, `PdfViewerComponent`, `ResourceMetaComponent`) passam;
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

- Escolha do mecanismo de visualização de PDF (`<iframe>` nativo vs. biblioteca dedicada) — decidir com base na compatibilidade entre browsers e no impacto no *bundle*, sem introduzir dependências pesadas sem necessidade comprovada;
- Confirmar se o carregamento do recurso por `slug` usa um *resolver* de rota ou carregamento local com skeleton — manter consistência com a decisão já tomada (ou a tomar) na Fase 3 para o catálogo;
- Os ficheiros de demonstração (vídeo/PDF) devem ser pequenos e genéricos; confirmar onde ficam guardados no repositório sem aumentar desnecessariamente o seu tamanho (ex.: `apps/web/src/assets/mock/`).

---

## Dependência para a fase seguinte

A **Fase 5 (UI) — Dicas & Perguntas Frequentes** é, na prática, independente desta fase e pode avançar em paralelo se necessário; ainda assim, reutiliza os mesmos padrões de carregamento, estado vazio e visibilidade por estado editorial já validados nas Fases 3 e 4.

A **Fase 6 (UI) — Suporte** assume como ponto de partida:

- a passagem do identificador do recurso a partir do botão "Pedir suporte sobre este tema", já funcional nesta fase.

---

> Fase 4 (UI) — o detalhe do recurso é onde a aprendizagem acontece de facto; esta fase garante que vídeos e guias são apresentados de forma clara, acessível e sem depender de qualquer ficheiro real da DGADR.
