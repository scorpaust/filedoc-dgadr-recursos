# Fase 9 (UI) — Administração

Esta especificação define a **nona fase da via de desenvolvimento do UI** do **Filedoc Recursos Formativos**, em Angular, com dados simulados (mock) — sem ligação à API NestJS.

Assume como ponto de partida a Fase 1 (Design System), a Fase 2 (Autenticação — utilizadores mock) e a Fase 8 (Gestão de conteúdos — `TaxonomyMockService`, reutilizado aqui no resumo de taxonomias).

Coerente com `project-spec.md` (secções O e P — Gestão de utilizadores e Auditoria), `project-overview.md`, `coding-standards.md` e `ai-interaction.md`.

---

## Objetivo

No final desta fase, deve ser possível, sem qualquer API real, com um utilizador mock `ADMIN`:

- aceder a `/administracao` e ver a tabela de utilizadores mock, com pesquisa por nome/e-mail e filtros por função e por estado da conta (um utilizador com múltiplas funções deve corresponder a qualquer uma delas no filtro);
- criar uma nova conta mock e atribuir-lhe **uma ou mais** funções, alterar as funções de um utilizador existente (acrescentar ou remover, mantendo sempre pelo menos uma), ativar e desativar contas;
- confirmar que **não é possível remover a função `ADMIN` do último utilizador que a possui, nem desativar esse utilizador** enquanto for o único com essa função — a ação fica bloqueada, com mensagem explicativa (mesmo que esse utilizador tenha também outras funções);
- confirmar que um utilizador desativado (mock) perde imediatamente o acesso simulado a todas as áreas, independentemente de quantas funções tivesse (o `AuthService` da Fase 2 deve recusar login/manter sessão para um utilizador cujo estado mock passou a inativo);
- consultar um resumo de taxonomias (reutilizando o `TaxonomyMockService` da Fase 8), com atalho para a gestão completa (Fase 8);
- consultar um registo de auditoria simulado (apenas leitura), com ator, ação, tipo de entidade, data/hora;
- confirmar que um utilizador mock cujas funções não incluem `ADMIN` é bloqueado no acesso a `/administracao`, **mesmo que tenha outras funções** (ex.: `CONTENT_EDITOR` isolado não acede; `CONTENT_EDITOR` + `ADMIN` acede).

Não existe nesta fase: geração real de auditoria a partir de ações efetivamente realizadas nas fases anteriores (os registos de auditoria desta fase são dados mock ilustrativos, não instrumentação automática — essa instrumentação é responsabilidade do backend), nem qualquer configuração operacional avançada além do que está explicitamente previsto em `project-spec.md`.

---

## Âmbito

### Incluído

- Extensão do conjunto de utilizadores mock (Fase 2) para suportar operações de escrita: `UserMockService` com `list(filters)`, `create`, `updateName`, `assignRoles`, `activate`, `deactivate`, `invalidateSessions`;
- Página `/administracao` (`features/administration`), protegida por `roleGuard` (`ADMIN`);
- Tabela de utilizadores com pesquisa, filtro por função (dropdown multi-seleção com contagem, tal como o padrão já validado no catálogo — um utilizador com múltiplas funções aparece em todos os filtros correspondentes) e por estado (segmentado: Todos/Ativos/Inativos);
- Formulário/diálogo de criação de conta e de edição de funções, com seleção múltipla (checkboxes, não um único `select`);
- Regra de proteção do último administrador ativo, testada explicitamente;
- `AuditLogMockService`, apenas leitura, com um conjunto de entradas mock ilustrativas;
- Resumo de Taxonomias (contagem por tipo, com atalho para `/conteudos/taxonomias`, Fase 8).

### Fora de âmbito

- Geração automática de entradas de auditoria a partir das ações reais praticadas nas fases anteriores (a auditoria completa e fidedigna só existe quando ligada à API real, que é quem efetivamente regista cada ação);
- Exportação de dados de auditoria;
- Configurações operacionais além do que está explicitamente previsto (`project-spec.md` não detalha um ecrã de configurações amplo — não inventar funcionalidades aqui);
- Importação de utilizadores (Evolução futura do roadmap geral do produto).

---

## Entregáveis

1. Página `/administracao` funcional, com gestão de utilizadores mock;
2. `UserMockService`, testado, incluindo a proteção do último administrador ativo;
3. `AuditLogMockService`, com listagem apenas de leitura;
4. Resumo de taxonomias ligado à Fase 8.

---

## Tarefas

### A. `UserMockService`

- Estender o conjunto de utilizadores mock da Fase 2 com campos adicionais necessários à gestão (estado, último acesso); o campo de função passa a ser um **array** (`roles: Role[]`), nunca um único valor;
- `list(filters?: { query?, role?, status? })` — quando `role` é indicado, devolve os utilizadores cujo array `roles` **contém** essa função (não uma comparação de igualdade);
- `create(input)`: cria uma conta mock com uma ou mais funções desde a criação (nunca com palavra-passe real nem hash — nesta fase de UI, a criação de conta é apenas ilustrativa; a atribuição de credenciais reais é responsabilidade do backend);
- `updateName`, `assignRoles(userId, roles: Role[])`: substitui o conjunto de funções do utilizador; deve recusar um array vazio (um utilizador tem sempre pelo menos uma função) e aplicar a regra de proteção abaixo quando a alteração remove `ADMIN`;
- `activate(userId)` / `deactivate(userId)`:
  - `deactivate`, tal como `assignRoles` quando remove `ADMIN`, deve verificar se o utilizador é o **último utilizador cujo array de funções contém `ADMIN`** e, nesse caso, bloquear a ação com uma mensagem clara — independentemente de esse utilizador ter também outras funções;
- `invalidateSessions(userId)`: nesta fase, apenas simboliza a ação (não existem sessões reais para invalidar) — deve mostrar confirmação de sucesso, para validar a interação;
- Testes unitários: listagem com filtros (incluindo um utilizador com múltiplas funções a aparecer em mais do que um filtro), criação com múltiplas funções, alteração de funções (adicionar e remover), ativação/desativação, e — de forma explícita — o bloqueio de remoção de `ADMIN`/desativação do último utilizador com essa função, mesmo quando esse utilizador tem outras funções além de `ADMIN`.

### B. Tabela de utilizadores

- Reutilizar o padrão já validado (pesquisa + dropdown de função + segmentado de estado + tabela de ações), tal como no protótipo;
- Colunas: utilizador (avatar, nome, e-mail), carreira profissional, **funções** (uma pílula por função, podendo um utilizador mostrar duas ou mais lado a lado), estado, último acesso, ações;
- Ações por linha: editar funções (abre um diálogo com checkboxes, não um único `select`), ativar/desativar (com confirmação, `DialogComponent`, para desativar — ação sensível);
- Botão "Criar utilizador" sempre visível.

### C. Proteção do último administrador ativo

- Ao tentar remover a função `ADMIN` de um utilizador (via edição de funções), ou desativar um utilizador que tem `ADMIN`, quando esse utilizador é o **último com essa função no conjunto de dados mock**, a ação é bloqueada antes de qualquer confirmação, com mensagem explicativa (ex.: "Não é possível remover a função de administrador do último utilizador que a possui.");
- Esta proteção aplica-se mesmo que o utilizador em causa tenha também outras funções (ex.: `CONTENT_EDITOR` + `ADMIN`) — o que importa é ser o último com `ADMIN`, não o número total de funções que possui;
- Garantir, nos dados mock iniciais, pelo menos dois utilizadores com a função `ADMIN` (um deles podendo acumular também `CONTENT_EDITOR`, para servir de exemplo de múltiplas funções), para permitir testar tanto o bloqueio (reduzindo a um) como a remoção/desativação bem-sucedida (quando há mais do que um).

### D. Reflexo no `AuthService`

- Quando um utilizador mock é desativado, o `AuthService` (Fase 2) deve:
  - impedir um novo login simulado com essas credenciais, independentemente de quantas funções o utilizador tenha;
  - se for o próprio utilizador com sessão simulada ativa a ser desativado (cenário de teste, trocando de utilizador), a próxima ação protegida deve comportar-se como sessão inválida (redirecionar para `/login`).

### E. Auditoria (apenas leitura)

- `AuditLogMockService.list()`: devolve um conjunto de entradas mock ilustrativas (ex.: "João Antunes publicou um recurso", "Admin desativou a conta de P. Matos"), cobrindo os tipos de ação previstos em `project-spec.md`, secção P;
- Incluir, entre os exemplos, uma entrada de alteração de funções (ex.: "Admin atribuiu a função de Administrador a Rui Fonseca"), coerente com a nova capacidade de múltiplas funções;
- Lista simples, sem paginação obrigatória nesta fase (o volume de dados mock é reduzido), com data/hora e ator em destaque;
- Deixar claro no código (comentário/nome do serviço) que esta listagem é ilustrativa e será substituída por dados reais gerados pelo backend a cada ação — nunca apresentar estas entradas mock como um histórico real de atividade do sistema.

### F. Resumo de Taxonomias

- Widget simples com a contagem de fluxos, tipos de documento e etiquetas ativos, obtida do `TaxonomyMockService` (Fase 8);
- Atalho "Gerir →" para `/conteudos/taxonomias`.

### G. Proteção por função

- `/administracao` só acessível a utilizadores cujo conjunto de funções inclua `ADMIN` (via `roleGuard`, que avalia interseção, não igualdade — ver Fase 2);
- Testar explicitamente que um utilizador mock sem `ADMIN` entre as suas funções é bloqueado, e que um utilizador mock com `ADMIN` **entre outras funções** (ex.: `CONTENT_EDITOR` + `ADMIN`) acede normalmente.

---

## Critérios de aceitação

- [ ] `/administracao` lista os utilizadores mock, com pesquisa e filtros por função e estado a funcionar corretamente, incluindo um utilizador com múltiplas funções a aparecer em todos os filtros de função correspondentes;
- [ ] Criar utilizador com mais do que uma função, alterar as funções de um utilizador existente (adicionar e remover, nunca ficando sem nenhuma) e ativar/desativar funcionam e refletem-se imediatamente na tabela (cada utilizador mostra uma pílula por função);
- [ ] Remover `ADMIN` do último utilizador que a possui, ou desativar esse utilizador, é bloqueado com mensagem clara — mesmo que esse utilizador tenha outras funções além de `ADMIN`; a mesma ação sobre um `ADMIN` quando existe mais do que um funciona normalmente;
- [ ] Um utilizador mock desativado deixa de conseguir "iniciar sessão" através do `AuthService` da Fase 2, independentemente de quantas funções tinha;
- [ ] Um utilizador mock com `ADMIN` **e outra função em simultâneo** acede corretamente a `/administracao` e à área correspondente à outra função;
- [ ] O resumo de taxonomias mostra as contagens corretas e o atalho navega para a Fase 8;
- [ ] O registo de auditoria mostra as entradas mock, claramente identificadas como ilustrativas no código;
- [ ] Um utilizador mock cujas funções não incluem `ADMIN` é bloqueado no acesso a `/administracao`;
- [ ] Testado sem sobreposição ou corte nas cinco larguras de referência (320–1440 px);
- [ ] Testes unitários do `UserMockService` (incluindo a proteção do último utilizador com `ADMIN`, mesmo quando acumula outras funções) e do `AuditLogMockService` passam;
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

- Confirmar se a criação de conta mock pede algum campo relativo a palavra-passe (mesmo que só ilustrativo) ou se assume desde já que a atribuição de credenciais é inteiramente responsabilidade do backend — a opção recomendada é a segunda, para não induzir um padrão de UI que a API real não vai seguir (não existe registo público nem definição de palavra-passe pelo administrador, conforme `project-spec.md`);
- O `AuditLogMockService` não deve, em caso algum, ser confundido nos testes ou na demonstração com um histórico real de atividade — reforçar isto no código e, se necessário, num aviso visual discreto nesta fase (a remover quando a auditoria real for integrada).

---

## Dependência para a fase seguinte

A **Fase 10 (UI) — Acessibilidade, responsividade e testes E2E de UI** encerra esta via de desenvolvimento do UI, consolidando e auditando **todas** as fases anteriores (1 a 9) como um todo coerente, antes de se iniciar a integração com a API real.

---

> Fase 9 (UI) — administrar pessoas e permissões exige o máximo de cuidado; esta fase garante que a interface nunca permite, mesmo por engano, ficar sem nenhum administrador ativo.
