# Fase 1 (Integração) — Autenticação e Autorização

Esta especificação define a **primeira fase da via de Integração de Funcionalidades** do **Filedoc Recursos Formativos** — a via que liga, funcionalidade a funcionalidade, cada serviço mock da via de UI ao respetivo consumo real da API NestJS.

Assume como ponto de partida a via de UI completa (Fases 1–11, incluindo o `AuthService` mock e os guardas `authGuard`/`roleGuard` da Fase 2 da via de UI) e a via de Base de Dados e Deployment Inicial completa (Fases 1–5), incluindo a decisão de alojamento já tomada e documentada na Fase 5 (computação e armazenamento, dado assente nesta fase — não voltar a discutir aqui).

Coerente com `project-spec.md` (secção L — Autenticação), `coding-standards.md` e `ai-interaction.md`.

---

## Objetivo

No final desta fase, deve ser possível, contra a API NestJS real (ligada à base de dados da via de BD):

- iniciar sessão com um utilizador real (`email`/palavra-passe), a API validar as credenciais com Argon2id e devolver uma sessão baseada em cookie `HttpOnly`;
- o `AuthService` da via de UI (Fase 2) deixar de usar dados mock e passar a consumir os endpoints reais, **sem alterar a assinatura pública** já consumida pelos componentes (mesmos Signals, mesmos métodos `login`/`logout`) — apenas a implementação interna muda;
- os guardas `authGuard`/`roleGuard` da via de UI continuarem a funcionar exatamente como antes, agora validados contra o estado de sessão real (a interseção de funções do utilizador com as funções permitidas pela rota, já suportando múltiplas funções por utilizador, conforme corrigido em `project-spec.md`);
- terminar sessão invalidar a sessão do lado do servidor (não apenas limpar estado no browser);
- alterar palavra-passe funcionar contra a API real, com validação da palavra-passe atual;
- um utilizador desativado (`status` inativo) não conseguir iniciar sessão, e uma sessão existente de um utilizador entretanto desativado deixar de ser aceite no primeiro pedido seguinte;
- as mensagens de erro de credenciais inválidas nunca revelarem se um e-mail existe ou não, conforme `project-spec.md`.

Não existe nesta fase: nenhuma outra funcionalidade de negócio (Catálogo, Suporte, etc.) — apenas autenticação e autorização, que todas as fases seguintes desta via vão assumir como já resolvidas.

---

## Âmbito

### Incluído

- Módulo `auth/` na API NestJS: endpoints de login, logout, utilizador atual, alteração de palavra-passe;
- Hashing de palavras-passe com Argon2id (ou equivalente moderno);
- Sessões persistidas na tabela `Session` (já modelada na via de BD), associadas a um `User` com uma ou mais `UserRole`;
- Cookies de sessão `HttpOnly`, `Secure` em produção/homologação, política `SameSite` adequada;
- Guards NestJS reais (`AuthGuard`, `RolesGuard`) que os controllers das fases seguintes vão poder aplicar, espelhando a lógica já validada nos guardas Angular da via de UI (interseção de funções, não igualdade);
- Substituição do `AuthService` mock da via de UI pela implementação real, preservando a interface pública já consumida pelos componentes;
- Rate limiting no endpoint de login, contra tentativas repetidas;
- Consideração explícita do comportamento de cookies atrás de um *load balancer*/proxy reverso (relevante consoante a decisão de alojamento da Fase 5 — ex.: ECS atrás de um Application Load Balancer que termina TLS antes da aplicação).

### Fora de âmbito

- Registo público (não existe em nenhuma fase, por definição do projeto);
- Integração OIDC/SSO institucional (fora do MVP, `project-spec.md`, secção M);
- Qualquer outra funcionalidade de negócio além de autenticação/autorização;
- Criação/gestão de utilizadores (isso é gerido pela Fase 8 desta via — Administração — que consome os mesmos guardas aqui construídos, mas não é responsabilidade desta fase).

---

## Entregáveis

1. Módulo `auth/` completo na API, testado (incluindo caminhos negativos);
2. `AuthService` da via de UI ligado à API real, sem alterações à interface pública;
3. Guards NestJS reais, prontos a ser reutilizados por todas as fases seguintes;
4. Confirmação de que o comportamento de cookies funciona corretamente atrás da infraestrutura de alojamento escolhida na Fase 5.

---

## Tarefas

### A. Módulo de autenticação na API

- `POST /api/v1/auth/login`: valida credenciais, cria uma sessão (`Session`), devolve cookie `HttpOnly`;
- `POST /api/v1/auth/logout`: invalida a sessão do lado do servidor (marca `revokedAt`), limpa o cookie;
- `GET /api/v1/auth/me`: devolve o utilizador atual e as suas funções (`UserRole[]`), a partir da sessão válida;
- `POST /api/v1/auth/change-password`: valida a palavra-passe atual, atualiza o hash;
- Todas as respostas de erro de autenticação usam uma mensagem genérica, nunca distinguindo "e-mail não encontrado" de "palavra-passe incorreta";
- Rate limiting no `login`, configurável, para mitigar tentativas repetidas.

### B. Sessões

- Sessão associada a `userId`, com `tokenHash` (nunca o token em claro na base de dados), `expiresAt`, `revokedAt`;
- Cookie `HttpOnly`; `Secure` ativo em qualquer ambiente servido por HTTPS (homologação e produção); política `SameSite` adequada ao facto de a Web e a API serem servidas do mesmo domínio ou de domínios diferentes (confirmar consoante a configuração final da Fase 5);
- Expiração de sessão configurável (`SESSION_TTL`, já prevista em `project-spec.md`);
- Invalidação de todas as sessões de um utilizador ao ser desativado (mecanismo reutilizado, mais tarde, pela Fase 8 — Administração).

### C. Guards NestJS

- `AuthGuard`: rejeita pedidos sem sessão válida (`401`);
- `RolesGuard`: recebe as funções permitidas via metadata do controller/rota, aceita o pedido se **alguma** das funções do utilizador autenticado estiver na lista (mesma semântica de interseção já validada no `roleGuard` Angular da via de UI — nunca comparação de igualdade com uma única função);
- Decorator para obter o utilizador autenticado a partir do pedido (nunca confiar em dados de utilizador enviados pelo cliente quando podem ser obtidos da sessão, conforme `coding-standards.md`);
- Testes unitários e de integração dos guards, incluindo os caminhos negativos: sem sessão, sessão expirada, sessão revogada, utilizador sem nenhuma das funções exigidas, utilizador com múltiplas funções onde apenas uma corresponde.

### D. Ligação do `AuthService` da via de UI

- Substituir a implementação interna do `AuthService` (Fase 2 da via de UI) para consumir os endpoints reais via `HttpClient`, mantendo os Signals e métodos públicos inalterados;
- Confirmar que os componentes que já consumiam o `AuthService` mock (cabeçalho, guardas, menu do utilizador) continuam a funcionar sem alterações;
- Remover ou desativar formalmente a ferramenta de desenvolvimento de simulação de função (Fase 2 da via de UI), substituindo-a por login real com os utilizadores de seed da via de BD (Fase 2), que já cobrem os cenários de múltiplas funções necessários para continuar a testar as áreas de Gestão.

### E. Utilizadores desativados

- Login de um utilizador com `status` inativo é recusado com a mesma mensagem genérica de credenciais inválidas (não revelar que a conta existe mas está inativa);
- Uma sessão de um utilizador entretanto desativado é rejeitada no `AuthGuard` no pedido seguinte, mesmo que o cookie ainda seja válido em termos de expiração.

### F. Cookies atrás de proxy/load balancer

- Confirmar, consoante a infraestrutura escolhida na Fase 5 (ex.: Amazon ECS atrás de um Application Load Balancer, que tipicamente termina o TLS antes de a aplicação o ver), que a API reconhece corretamente que o pedido chegou por HTTPS (ex.: configuração de "trust proxy" equivalente em NestJS/Express, a partir do cabeçalho `X-Forwarded-Proto`) — sem isto, o atributo `Secure` do cookie pode comportar-se de forma inesperada;
- Confirmar `SameSite` e domínio do cookie de acordo com a topologia final (Web e API no mesmo domínio vs. domínios/subdomínios distintos).

---

## Critérios de aceitação

- [ ] Login com um utilizador de seed real (via de BD, Fase 2) funciona e devolve um cookie `HttpOnly`;
- [ ] Login com credenciais inexistentes ou incorretas devolve sempre a mesma mensagem genérica;
- [ ] `GET /auth/me` devolve corretamente o utilizador e todas as suas funções, incluindo para o utilizador de seed com múltiplas funções;
- [ ] Logout invalida a sessão do lado do servidor — um pedido autenticado seguinte com o mesmo cookie é rejeitado;
- [ ] Alteração de palavra-passe exige a palavra-passe atual correta e atualiza o hash com sucesso;
- [ ] Um utilizador de seed desativado não consegue iniciar sessão;
- [ ] `AuthGuard` e `RolesGuard` bloqueiam corretamente todos os caminhos negativos testados;
- [ ] O `AuthService` da via de UI funciona contra a API real sem qualquer alteração à sua interface pública consumida pelos componentes;
- [ ] A ferramenta de simulação de função da via de UI foi removida/desativada e substituída por login real;
- [ ] Os cookies de sessão comportam-se corretamente na infraestrutura de homologação (Fase 5), incluindo atrás de qualquer proxy/load balancer que termine TLS;
- [ ] Rate limiting do login está ativo e testado;
- [ ] Testes unitários e de integração passam.

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

## Riscos e decisões em aberto

- Confirmar a topologia final de domínio (Web e API no mesmo domínio, ou subdomínios distintos, ex. `app.` e `api.`) antes de fixar a política `SameSite` — esta decisão depende da infraestrutura escolhida na Fase 5 e tem impacto direto no comportamento dos cookies;
- Confirmar a configuração de "trust proxy" adequada caso a infraestrutura escolhida coloque um *load balancer* a terminar TLS antes da aplicação (comum em ECS atrás de um ALB) — sem isto, `Secure` pode não se comportar como esperado;
  - **direção de trabalho assumida (2026-07-26, ainda sem confirmação institucional da DGADR)**: AWS, ECS atrás de um Application Load Balancer — exatamente o cenário acima. A implementação desta fase já cobre isto de forma configurável (`TRUST_PROXY`, cookie `Secure` condicional) sem exigir alterações adicionais; falta apenas confirmar a topologia de domínio quando existir um domínio real associado ao ALB;
- A remoção da ferramenta de simulação de função da via de UI deve ser cuidadosa: confirmar que os utilizadores de seed da via de BD cobrem, pelo menos, os mesmos cenários (uma função cada, mais um caso de múltiplas funções, mais dois `ADMIN`) que essa ferramenta permitia simular, para não perder capacidade de teste.

---

## Dependência para a fase seguinte

A **Fase 3 (Integração) — Catálogo e Detalhe de Recursos** assume como ponto de partida:

- autenticação e autorização reais e estáveis, incluindo os guards NestJS prontos a reutilizar nos controllers de recursos;
- o `StorageService` da Fase 2 (já concluída), para servir vídeos, PDFs e miniaturas.

---

> Fase 1 (Integração) — sem autenticação real, nenhuma outra fase desta via pode ser testada a sério; por isso é sempre a primeira.
