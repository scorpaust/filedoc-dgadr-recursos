# Fase 2 (UI) — Ecrãs de Autenticação

Esta especificação define a **segunda fase da via de desenvolvimento do UI** do **Filedoc Recursos Formativos**, em Angular, com dados e sessão simulados (mock) — sem ligação à API NestJS.

Assume como ponto de partida a Fase 1 (UI) — Design System & Casca da Aplicação, já concluída: layout, tema, roteamento e componentes partilhados.

Coerente com `project-spec.md` (secção L — Autenticação), `project-overview.md`, `coding-standards.md` e `ai-interaction.md`.

---

## Objetivo

No final desta fase, deve ser possível, sem qualquer API real:

- aceder a um ecrã de início de sessão com aparência final;
- submeter o formulário e, através de um serviço de autenticação simulado (`AuthService` com dados mock), "iniciar sessão" e ser redirecionado para `/inicio`;
- ver o cabeçalho a refletir o utilizador autenticado (avatar, nome, carreira profissional), tal como já construído na Fase 1;
- terminar sessão a partir do menu do utilizador e voltar ao ecrã de início de sessão;
- ver mensagens de erro de credenciais inválidas, sem nunca revelar se um e-mail existe ou não;
- aceder a um ecrã de alteração de palavra-passe;
- ser bloqueado (visualmente, via guarda de rota) de aceder a áreas autenticadas sem sessão simulada ativa, e redirecionado para o login;
- ver a página de "acesso negado" (criada na Fase 1) quando a função simulada do utilizador não permite aceder a uma área (ex.: um trabalhador comum a tentar aceder a `/administracao`).

Não existe nesta fase: chamadas HTTP reais, palavras-passe verificadas no servidor, hashing real, cookies de sessão reais, nem qualquer validação de segurança de backend — tudo descrito em `project-spec.md`, secção L e M, pertence à fase de integração com a API.

---

## Âmbito

### Incluído

- Ecrã de início de sessão (`/login`), fora do layout autenticado (sem cabeçalho/navegação da aplicação);
- Ecrã de alteração de palavra-passe (`/definicoes/palavra-passe` ou equivalente), dentro do layout autenticado;
- `AuthService` simulado, com Signals, capaz de:
  - manter o estado de autenticação em memória (nunca em `localStorage`, para já não induzir um padrão que mais tarde seria confundido com sessão real persistente do lado do cliente);
  - simular "credenciais válidas" para um pequeno conjunto de utilizadores mock, cada um com uma ou mais funções (`EMPLOYEE`, `CONTENT_EDITOR`, `SUPPORT_AGENT`, `ADMIN`) — incluir pelo menos um utilizador mock com mais do que uma função em simultâneo (ex.: `CONTENT_EDITOR` + `ADMIN`), para permitir testar visualmente os diferentes acessos, incluindo os cumulativos, nas fases seguintes;
  - simular "credenciais inválidas" para qualquer outra combinação, com atraso simulado (para testar o estado de carregamento);
  - expor o utilizador atual, o conjunto de funções atuais e um método de logout;
- Guardas de rota (`authGuard`, `roleGuard`) que leem o `AuthService` simulado — funcionalmente coerentes com o que a Fase de integração virá a substituir por chamadas reais, mas sem qualquer chamada de rede nesta fase;
- Formulário de login com Angular Reactive Forms, validação client-side (formato de e-mail, campo obrigatório), estados de foco/erro acessíveis;
- Componente de alternância de visibilidade da palavra-passe;
- Estados de carregamento, erro e sucesso no formulário de login e no de alteração de palavra-passe;
- Seletor visual (apenas nesta fase de UI, como ferramenta de desenvolvimento) para simular sessões com diferentes funções, para facilitar a validação das fases seguintes — deve ficar claramente identificado como ferramenta de desenvolvimento e ser removido ou desativado antes da integração com a API real.

### Fora de âmbito

- Qualquer chamada HTTP real de autenticação;
- Cookies `HttpOnly`, `Secure`, `SameSite` (são responsabilidade do backend, Fase 2 da via full-stack);
- Hashing de palavras-passe;
- Expiração e revogação de sessões reais;
- Rate limiting e proteção contra tentativas repetidas (backend);
- Preparação de OIDC/SSO (não há nenhuma UI dedicada a isso no MVP, conforme `project-spec.md`, secção M);
- Registo público (não existe em nenhuma fase, por definição do projeto).

---

## Entregáveis

1. Ecrã de login funcional com dados simulados;
2. Ecrã de alteração de palavra-passe;
3. `AuthService` simulado, com Signals, testado;
4. `authGuard` e `roleGuard`, testados (incluindo os caminhos negativos);
5. Página de acesso negado já ligada ao `roleGuard`;
6. Ferramenta de desenvolvimento para simular diferentes funções, claramente assinalada.

---

## Tarefas

### A. Ecrã de login (`features/auth`)

- Rota pública `/login`, fora do `AppShellComponent`;
- Campos: e-mail, palavra-passe (com alternância de visibilidade), botão "Iniciar sessão";
- Validação client-side: e-mail obrigatório e com formato válido, palavra-passe obrigatória;
- Estado de submissão: botão desativado e com indicador de carregamento enquanto o `AuthService` simulado "responde";
- Erro de credenciais inválidas apresentado de forma genérica (nunca "e-mail não encontrado" vs. "palavra-passe incorreta" separadamente — mensagem única, conforme `project-spec.md`);
- Identidade visual: logótipos DGADR e Filedoc, mesma paleta e tipografia da Fase 1;
- Sem qualquer indicação de registo público.

### B. `AuthService` simulado (`core/auth`)

- Signal com o utilizador atual (`null` quando não autenticado);
- Signal computado com as funções atuais (`readonly roles: Signal<Role[]>`), já que um utilizador pode acumular mais do que uma;
- Conjunto de utilizadores mock (mínimo um por função: `EMPLOYEE`, `CONTENT_EDITOR`, `SUPPORT_AGENT`, `ADMIN`, mais pelo menos um utilizador com duas funções em simultâneo), com nome, carreira profissional e e-mail fictícios, claramente identificados como dados de demonstração;
- Método `login(email, password)`: simula um atraso, valida contra os utilizadores mock, define o utilizador atual ou lança um erro genérico;
- Método `logout()`: limpa o utilizador atual e redireciona para `/login`;
- Testes unitários cobrindo: login válido, login inválido, logout, e o estado antes de qualquer autenticação.

### C. Guardas de rota

- `authGuard`: bloqueia o acesso a rotas autenticadas quando não existe utilizador atual, redirecionando para `/login`;
- `roleGuard`: recebe a lista de funções permitidas por rota (via `data` da rota) e redireciona para `/acesso-negado` quando **nenhuma** das funções atuais do utilizador está incluída nessa lista (interseção vazia entre as funções do utilizador e as funções permitidas);
- Aplicar `authGuard` a todas as rotas autenticadas definidas na Fase 1;
- Aplicar `roleGuard` já às rotas de Gestão (`/suporte/gestao`, `/conteudos`, `/administracao`), mesmo que o conteúdo real dessas áreas só chegue nas Fases 7–9;
- Testes unitários dos guardas, incluindo os caminhos negativos (sem sessão, função errada).

### D. Ecrã de alteração de palavra-passe

- Rota autenticada, acessível a partir do menu do utilizador;
- Campos: palavra-passe atual, nova palavra-passe, confirmação;
- Validação client-side: confirmação igual à nova palavra-passe, campos obrigatórios;
- Estado de sucesso (toast, reutilizando o `ToastService` da Fase 1) e de erro genérico simulados.

### E. Cabeçalho e menu do utilizador

- Ligar o cabeçalho (já construído na Fase 1) ao `AuthService` real desta fase, substituindo os dados estáticos por Signals;
- Menu do utilizador (a partir do cartão no cabeçalho) com as opções: "Alterar palavra-passe" e "Terminar sessão";
- Ao terminar sessão, garantir que o foco é gerido corretamente e que a navegação para `/login` limpa qualquer estado sensível do ecrã anterior.

### F. Ferramenta de simulação de função (apenas desenvolvimento)

- Um pequeno seletor (ex.: no rodapé do ecrã de login, ou atrás de uma *flag* de ambiente de desenvolvimento) para escolher rapidamente com que utilizador mock entrar, para facilitar a validação visual das áreas de Gestão nas fases seguintes;
- Deve ficar claramente identificado no código como ferramenta de desenvolvimento (ex.: comentário e nome explícito), para ser removida ou desativada antes de qualquer integração com autenticação real.

---

## Critérios de aceitação

- [ ] `/login` mostra um ecrã completo, sem cabeçalho/navegação da aplicação autenticada;
- [ ] Login com um dos utilizadores mock redireciona para `/inicio` e o cabeçalho mostra os respetivos dados;
- [ ] Login com credenciais inexistentes mostra uma mensagem de erro única e genérica;
- [ ] O formulário mostra um estado de carregamento durante a simulação do pedido;
- [ ] Aceder a uma rota autenticada sem sessão simulada redireciona para `/login`;
- [ ] Aceder a `/administracao` com um utilizador mock `EMPLOYEE` redireciona para `/acesso-negado`;
- [ ] Um utilizador mock com duas funções (ex.: `CONTENT_EDITOR` + `ADMIN`) acede corretamente a **ambas** as áreas protegidas por essas funções (`/conteudos` e `/administracao`), confirmando que o `roleGuard` avalia corretamente a interseção de funções e não apenas uma única função;
- [ ] Terminar sessão limpa o estado e devolve a `/login`;
- [ ] A alteração de palavra-passe valida a confirmação e mostra sucesso/erro simulados;
- [ ] Todos os campos têm *labels* associados, mensagens de erro ligadas por `aria-describedby`, e o formulário é navegável e submetível apenas por teclado;
- [ ] Testes unitários do `AuthService`, `authGuard` e `roleGuard` passam, incluindo os caminhos negativos;
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

- Confirmar se a "ferramenta de simulação de função" fica mesmo no ecrã de login ou noutro local menos visível — decisão de conveniência de desenvolvimento, sem impacto no produto final;
- O `AuthService` simulado desta fase será **substituído**, não estendido, na fase de integração com a API — as interfaces (Signals expostos, métodos `login`/`logout`) devem manter-se estáveis para minimizar o impacto nos componentes que os consomem;
- Confirmar se a alteração de palavra-passe fica numa página dedicada ou num diálogo — o protótipo visual não cobre este ecrã em detalhe, por o cartão de definições do trabalhador na página de conteúdos ainda não incluir este ecrã; a decisão fica ao critério de quem implementa, mantendo consistência com os restantes formulários.

---

## Dependência para a fase seguinte

A **Fase 3 (UI) — Catálogo de recursos** assume como ponto de partida:

- o `AuthService` simulado disponível para determinar, por exemplo, quais os recursos em rascunho visíveis (editor vs. trabalhador comum);
- os guardas de rota já a proteger `/recursos`;
- a ferramenta de simulação de função disponível para testar o catálogo com diferentes utilizadores.

---

> Fase 2 (UI) — sessão e permissões simuladas, mas com o mesmo rigor de UX e acessibilidade que terão quando ligadas à API real.
