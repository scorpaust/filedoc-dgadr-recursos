# Fase 6 (UI) — Suporte (Pedidos do Trabalhador)

Esta especificação define a **sexta fase da via de desenvolvimento do UI** do **Filedoc Recursos Formativos**, em Angular, com dados simulados (mock) — sem ligação à API NestJS.

Assume como ponto de partida a Fase 1 (Design System), a Fase 2 (Autenticação) e a Fase 4 (Detalhe de recurso, de onde chega a ação "Pedir suporte sobre este tema"), já concluídas.

Coerente com `project-spec.md` (secções H, I, J e K — Pedidos de suporte, Mensagens e histórico, Referências dos tickets, Anexos), `project-overview.md`, `coding-standards.md` e `ai-interaction.md`.

---

## Objetivo

No final desta fase, deve ser possível, sem qualquer API real:

- aceder a `/suporte` e ver a lista dos próprios pedidos de suporte (apenas os do utilizador mock com sessão simulada ativa — nunca os de outro utilizador);
- filtrar essa lista por estado;
- criar um novo pedido em `/suporte/novo`, com assunto, descrição, categoria e prioridade, incluindo o aviso específico da prioridade "Bloqueante";
- chegar a este formulário a partir do botão "Pedir suporte sobre este tema" (Fase 4), com o recurso já pré-associado e visível no formulário;
- ver, ao submeter, uma referência gerada no formato `SUP-AAAA-XXXXXX` e ser redirecionado para o detalhe do pedido criado;
- consultar o detalhe de um pedido próprio, com o histórico de mensagens **públicas** (nunca notas internas, que não existem nesta vista), responder, anexar informação adicional (simulada) e confirmar a resolução quando o pedido estiver "Resolvido";
- confirmar que tentar aceder ao pedido de outro utilizador mock (via URL direta) é bloqueado, mostrando a página de acesso negado ou não encontrado, nunca os dados do pedido alheio.

Não existe nesta fase: vista de agente de suporte (Fase 7), upload real de anexos para armazenamento de objetos, nem qualquer chamada HTTP real.

---

## Âmbito

### Incluído

- `SupportTicketMockService`, com estado em memória (Signals), simulando criação, listagem, consulta, resposta e confirmação de resolução, sempre associado ao utilizador da sessão simulada (Fase 2);
- Página "Os meus pedidos" (`features/support/my-tickets`);
- Página "Novo pedido" (`features/support/new-ticket`);
- Página "Detalhe do pedido" (`features/support/ticket-detail`), na vista do trabalhador;
- `TicketReferenceComponent` (reaproveitando o `CarimboComponent` da Fase 1) para apresentar a referência de forma consistente em todos os ecrãs;
- Geração de referência única no formato `SUP-AAAA-XXXXXX` (simulada, com parte aleatória não sequencial, mesmo em mock, para já habituar o padrão que a API virá a implementar);
- Anexos simulados (adicionar um "ficheiro" mock à mensagem, sem upload real);
- Regras de autorização simuladas: um utilizador mock só vê e interage com os próprios pedidos.

### Fora de âmbito

- Vista de gestão de suporte (agente) — Fase 7;
- Notas internas — não existem nesta vista, por definição (`project-spec.md`, secção I);
- Upload real de ficheiros, validação de tipo/tamanho no servidor, armazenamento de objetos;
- Associação de recursos formativos a um ticket pelo lado do agente (Fase 7);
- Notificações por correio eletrónico (Segunda Fase do roadmap geral do produto).

---

## Entregáveis

1. Páginas "Os meus pedidos", "Novo pedido" e "Detalhe do pedido" funcionais com dados mock;
2. `SupportTicketMockService`, testado, incluindo os caminhos de autorização negativa;
3. `TicketReferenceComponent` reutilizado de forma consistente;
4. Ligação funcional a partir da Fase 4 (recurso pré-associado no novo pedido).

---

## Tarefas

### A. Modelo e serviço mock

- Confirmar/estender os tipos `SupportTicket` e `TicketMessage` em `shared/models`, conforme `project-spec.md` (campos, categorias, prioridades, estados — usar as designações em português na interface e os valores internos em inglês apenas internamente, tal como definido na especificação);
- `SupportTicketMockService`:
  - `createTicket(input)`: gera referência única (`SUP-AAAA-XXXXXX`, parte aleatória de 6 caracteres alfanuméricos não previsível), define solicitante = utilizador atual, estado inicial "Aberto";
  - `listMine()`: devolve apenas os pedidos cujo solicitante é o utilizador atual;
  - `getMineById(id)`: devolve o pedido apenas se pertencer ao utilizador atual; caso contrário, devolve "não encontrado" (nunca "sem permissão" explícito, para não confirmar a existência do pedido a terceiros);
  - `addMessage(ticketId, content, attachments?)`: adiciona uma mensagem pública, associada ao utilizador atual;
  - `confirmResolution(ticketId)`: só permitido quando o estado é "Resolvido"; transita para "Encerrado";
- Testes unitários: criação, listagem apenas dos próprios, bloqueio de acesso a pedidos de outros, adição de mensagem, confirmação de resolução (incluindo tentativa fora do estado permitido).

### B. Página "Os meus pedidos"

- Lista/tabela responsiva (cartões em ecrãs estreitos, tal como previsto em `project-spec.md`) com referência, assunto, categoria, prioridade, estado e data de atualização;
- Filtro por estado (chips, tal como no protótipo: Todos, Aberto, Em tratamento, A aguardar resposta do utilizador, Resolvido, Encerrado);
- Estado vazio quando não existem pedidos;
- Ação para criar novo pedido, sempre visível.

### C. Página "Novo pedido"

- Formulário com Angular Reactive Forms: assunto (obrigatório), descrição (obrigatória), categoria (obrigatória, lista fechada conforme `project-spec.md`), prioridade (obrigatória);
- Quando a prioridade selecionada é "Bloqueante", mostrar o aviso definido em `project-spec.md`:

  > Utilize apenas quando o problema impedir totalmente a execução de uma tarefa urgente.

- Se a navegação chegar com um recurso pré-associado (Fase 4), mostrar essa associação de forma clara e não removível por engano (mas removível intencionalmente, se fizer sentido para a experiência);
- Impedir submissões duplicadas (desativar a ação durante o processamento simulado);
- Ao submeter com sucesso, navegar para o detalhe do pedido criado, mostrando a referência gerada em destaque.

### D. Página "Detalhe do pedido"

- Cabeçalho com referência (`TicketReferenceComponent`), assunto, categoria, prioridade e estado;
- Histórico cronológico de mensagens públicas (criação, mensagens do trabalhador, respostas simuladas de suporte, alterações de estado relevantes) — reaproveitar um componente de linha do tempo já pensado para ser partilhado com a Fase 7 (vista de agente), mas aqui sem qualquer nota interna;
- Caixa de resposta: apenas visível quando o estado do pedido permite nova resposta (ex.: não permitir responder a um pedido "Encerrado"; decisão a documentar);
- Anexar informação adicional: simulação de anexo (nome do ficheiro, sem upload real), respeitando os limites visuais (número máximo de anexos, conforme configurável em `project-spec.md`, mesmo que o valor seja fixo nesta fase);
- Ação "Confirmar resolução", visível apenas quando o estado é "Resolvido", que transita para "Encerrado" e mostra confirmação (toast).

### E. Autorização simulada

- Aceder a `/suporte/:id` de um pedido que não pertence ao utilizador atual (testável trocando de utilizador mock via a ferramenta da Fase 2) deve resultar em "não encontrado", nunca em exposição parcial dos dados;
- Testes cobrindo este caminho negativo de forma explícita.

---

## Critérios de aceitação

- [ ] "Os meus pedidos" mostra apenas os pedidos do utilizador mock com sessão ativa;
- [ ] O filtro por estado funciona corretamente;
- [ ] Criar um pedido gera uma referência no formato `SUP-AAAA-XXXXXX` e navega para o respetivo detalhe;
- [ ] A prioridade "Bloqueante" mostra sempre o aviso definido em `project-spec.md`;
- [ ] Chegar de "Pedir suporte sobre este tema" (Fase 4) pré-associa corretamente o recurso no formulário;
- [ ] O detalhe do pedido mostra apenas mensagens públicas, nunca notas internas (que, aliás, não existem nesta vista);
- [ ] Responder e anexar informação (simulados) atualizam o histórico corretamente;
- [ ] "Confirmar resolução" só está disponível quando o estado é "Resolvido", e transita corretamente para "Encerrado";
- [ ] Tentar aceder ao pedido de outro utilizador mock resulta em "não encontrado", sem expor qualquer dado do pedido;
- [ ] Testado sem sobreposição ou corte nas cinco larguras de referência (320–1440 px), incluindo a tabela/cartões de "Os meus pedidos" em ecrã estreito;
- [ ] Testes unitários do `SupportTicketMockService` passam, incluindo os caminhos de autorização negativa;
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

- Confirmar em que estados do pedido a caixa de resposta do trabalhador fica disponível (proposta: todos exceto "Encerrado") — documentar a decisão no código;
- O componente de linha do tempo (histórico) deve ser desenhado desde já a pensar na Fase 7, que o reutiliza com a adição de notas internas — confirmar a interface (`input()`) antes de a dar como estável;
- A geração da referência nesta fase é puramente de demonstração; o requisito de unicidade e imprevisibilidade real (`project-spec.md`, secção J) só é garantido pelo backend, na fase de integração.

---

## Dependência para a fase seguinte

A **Fase 7 (UI) — Gestão de suporte (vista de agente)** assume como ponto de partida:

- o `SupportTicketMockService` (estendido com operações adicionais: listar todos, atribuir, adicionar nota interna, alterar estado/prioridade/categoria, resolver, encerrar);
- o componente de linha do tempo já construído nesta fase, pronto a receber notas internas como um tipo adicional de entrada.

---

> Fase 6 (UI) — o trabalhador só vê os próprios pedidos, só vê mensagens públicas, e nunca fica sem saber o que se passa com o seu pedido.
