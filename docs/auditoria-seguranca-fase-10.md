# Auditoria de segurança — Fase 10 (Integração, Hardening)

Percorre item a item a checklist de "Segurança" de `context/project-spec.md`, com
verificação real (não apenas leitura do código) contra a API/BD de
desenvolvimento e, quando aplicável, contra a imagem Docker de produção de
referência construída nesta fase. Cada item indica o resultado, a evidência e,
quando pendente, a razão (dependência institucional, não uma falha).

## Legenda

- ✅ Confirmado — verificado nesta fase, com evidência concreta.
- 🟡 Pendente institucional — mecanismo implementado e correto; falta apenas um
  valor real (domínio, certificado) que depende de uma decisão da DGADR.
- 🔧 Corrigido nesta fase — lacuna real encontrada e fechada.

## Checklist

### Validação no backend

✅ `ValidationPipe` global (`apps/api/src/common/validation-pipe.factory.ts`),
com `whitelist`/`forbidNonWhitelisted` ativos, aplicado a todos os endpoints
via `app.useGlobalPipes` (`main.ts`). Todos os DTOs (`CreateTicketDto`,
`LoginDto`, etc.) usam `class-validator`.

### Autorização por função e por recurso

✅ `AuthGuard`/`RolesGuard` cobrem todos os controllers sensíveis
(`@UseGuards`, `@Roles`); autorização por recurso (ex. um trabalhador só vê os
próprios tickets) decidida sempre no serviço, nunca confiada ao frontend —
confirmado em `TicketsService` (`findOwnedTicket`, `agentVisibilityWhere`,
Fase 9 — Integração). Caminhos negativos cobertos por testes unitários e de
integração desde a Fase 1 (ex. `EMPLOYEE` bloqueado em `/administracao`).

### Proteção contra XSS

✅ Nenhum `innerHTML` com conteúdo não confiável em `apps/web/src` (grep
confirmado). O único `bypassSecurityTrustResourceUrl`
(`pdf-viewer.component.ts`) aplica-se a um URL pré-assinado de armazenamento
devolvido pela própria API, nunca a conteúdo fornecido por um utilizador.
Controlo nativo (`@if`/`@for`) em todos os templates, sem interpolação de
HTML bruto.

### Proteção contra CSRF

✅ Cookie de sessão com `httpOnly: true`, `sameSite: 'lax'`, `secure`
condicional a `NODE_ENV=production`/`TRUST_PROXY`
(`auth.controller.ts:setSessionCookie`). Todos os endpoints que alteram
estado são `POST`/`PATCH`/`DELETE` — `SameSite=Lax` já impede o browser de
anexar o cookie a pedidos de escrita entre origens (só o permite em
navegação de topo `GET`), pelo que não existe uma superfície de CSRF via
formulário cross-site sem JavaScript. Um token CSRF dedicado foi avaliado e
considerado redundante enquanto a API não aceitar pedidos autenticados por
cookie vindos de um formulário HTML de outra origem.

### Proteção contra injeção

✅ Todo o acesso à base de dados passa pelo Prisma. Único SQL não gerado pelo
ORM: `tx.$queryRaw('SELECT ... FOR UPDATE')` na guarda de concorrência do
último `ADMIN` (`users.service.ts`, Fase 8 — Integração) — parametrizado, sem
interpolação de valores fornecidos pelo utilizador.

### CORS restritivo

🔧 Corrigido nesta fase: `docker-compose.prod.yml`/`docker-compose.homolog.yml`
não definiam `CORS_ALLOWED_ORIGINS` (nem as restantes variáveis obrigatórias
da API — ver secção "Segredos" abaixo), pelo que a API destas stacks nunca
arrancava. Corrigido para restringir à origem pública real do frontend de
cada ambiente. O mecanismo (`main.ts:enableCors`, `env.validation.ts`) já era
restritivo por origem explícita desde a Fase 1 — Integração.
🟡 Pendente institucional: o domínio final de produção ainda não existe;
`CORS_ALLOWED_ORIGINS` terá de ser atualizado quando a DGADR o confirmar (ver
`docs/preparacao-producao-aws.md`).

### Rate limiting

✅ Limite global de 100 pedidos/60s em todos os endpoints
(`ThrottlerGuard`, `app.module.ts`).
✅ `POST /auth/login`: 5/60s por omissão, configurável
(`login-rate-limit.config.ts`).
🔧 Corrigido nesta fase: os endpoints de escrita mais expostos a um
utilizador `EMPLOYEE` comum (a função mais numerosa, sem restrição por
papel) — `POST /tickets` e `POST /tickets/mine/:id/attachments` — não tinham
limite próprio além do global. Aplicado um limite dedicado, 20/60s por
omissão, configurável via `WRITE_RATE_LIMIT`/`WRITE_RATE_TTL_SECONDS`
(`common/write-rate-limit.config.ts`).
`POST /resources/:id/upload-url` foi avaliado e deixado apenas com o limite
global: está já restrito a `CONTENT_EDITOR`/`ADMIN` (`RolesGuard`), uma
população pequena e de confiança, para a qual um limite mais apertado
introduziria atrito sem reduzir um risco real de abuso.

### Headers de segurança / política de segurança de conteúdo

🔧 Corrigido nesta fase: `apps/web/docker/default.conf` já tinha
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, mas nenhum
`Content-Security-Policy`, `Strict-Transport-Security` nem
`Permissions-Policy`. Adicionados os três, gerados em tempo de arranque do
contentor (`apps/web/docker/generate-security-headers.sh`) a partir de
variáveis de ambiente, para a mesma imagem servir ambientes com
domínios/armazenamento diferentes sem reconstrução (mesmo princípio de
`env.js`). Verificado por build + arranque reais da imagem Docker
(`docker build`/`docker run`) nesta fase — headers confirmados via `curl`:

```
Content-Security-Policy: default-src 'self'; script-src 'self' '<hash>'; style-src 'self' 'unsafe-inline'; img-src 'self' data: <storage-origin>; font-src 'self'; connect-src 'self' <api-origin>; media-src 'self' <storage-origin>; frame-src 'self' <storage-origin>; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Relaxação deliberada e documentada: `style-src` inclui `'unsafe-inline'`
porque o Beasties do Angular CLI injeta CSS crítico inline em `<head>` em
cada build (conteúdo variável, não hasheável de forma estável) e a
encapsulação de vista emulada (omissão do Angular) injeta `<style>` por
componente sem nonce. Eliminar esta relaxação exigiria desativar a
otimização de CSS crítico e configurar `ngCspNonce` com geração de nonce por
pedido no nginx — uma mudança estrutural fora do âmbito desta fase de
hardening, deixada como candidata a uma iteração futura. `script-src` não
tem essa relaxação: o único script inline (deteção de tema) é permitido por
hash SHA-256, calculado no build (`compute-csp-hash.js`) a partir do
ficheiro já compilado, nunca fixado no código-fonte — evita divergência por
normalização de fim de linha entre sistemas operativos/checkouts (aviso já
documentado desde a Fase 2 — UI).

### Cookies seguros

✅ `httpOnly`, `sameSite: 'lax'`, `secure` condicional a
`NODE_ENV=production`/`TRUST_PROXY` (ver "CSRF" acima).
🟡 Pendente institucional: comportamento `Secure` atrás de um ALB real com
TLS (`TRUST_PROXY=true`, `X-Forwarded-Proto`) só pode ser confirmado em
condições reais, indisponíveis nesta fase — mecanismo já implementado e
testado unitariamente desde a Fase 1 — Integração.

### Sessões expiradas e revogáveis

✅ `SESSION_TTL` configurável (omissão 7 dias); `POST
/users/:id/invalidate-sessions` (Fase 8 — Integração) revoga todas as sessões
de um utilizador; sessões trocadas por hash (`tokenHash`), nunca guardadas em
claro.

### Proteção contra tentativas repetidas

✅ Ver "Rate limiting" (login) acima.

### Validação de uploads

✅ `MAX_UPLOAD_SIZE`, `MAX_ATTACHMENTS_PER_TICKET`, verificação de tipo/tamanho
no backend antes de emitir o URL pré-assinado (`storage/`, Fase 2 —
Integração) — nunca confia apenas na extensão do ficheiro nem no MIME type
enviado pelo cliente.

### Armazenamento privado / URLs temporários

✅ Bucket privado por omissão (MinIO, comportamento nativo — ver
`docker-compose.homolog.yml`); todo o acesso a ficheiros passa por URLs
pré-assinados com TTL (`STORAGE_UPLOAD_URL_TTL_SECONDS`,
`STORAGE_DOWNLOAD_URL_TTL_SECONDS`), nunca por um caminho público direto.

### Segredos em variáveis de ambiente

✅ Nenhum segredo real commitado — `.env`/`.env.homolog` no `.gitignore`,
só `.env.example`/`.env.homolog.example` com nomes de variáveis. A API
recusa arrancar sem `SESSION_SECRET` com pelo menos 32 carateres
(`env.validation.ts`).
🔧 Corrigido nesta fase: `docker-compose.prod.yml` e
`docker-compose.homolog.yml` nunca definiam `SESSION_SECRET`/`STORAGE_*`
(o próprio ficheiro documentava isto como pendente desde a Fase 5 —
Deployment, "acrescentar quando a via de integração implementar autenticação
real" — funcionalidade que já existe desde então). Sem estas variáveis, a
API não conseguia arrancar em nenhuma das duas stacks — confirmado por
reprodução: `docker-compose.prod.yml` falhava antes desta correção com o
erro de validação de `env.validation.ts`. Corrigido com valores locais fixos
em `docker-compose.prod.yml` (stack de referência, mesmo nível das
credenciais Postgres/MinIO já hardcoded no próprio ficheiro) e com
`${VAR:?...}` lidos de `.env.homolog` (nunca commitado) em
`docker-compose.homolog.yml`.

### Logs sem informação sensível

✅ Amostragem do código de logging (`Logger.log/warn/error` em toda a
`apps/api/src`): só mensagens genéricas e identificadores técnicos (chave de
objeto, id de correlação) — nenhuma password, token de sessão ou corpo de
pedido completo. `HttpExceptionFilter` só devolve a mensagem/erros de campo
já produzidos pelo `class-validator` (nomes de campo e regra violada, nunca
o valor submetido).

### Auditoria

✅ `AuditModule`/`@Audit()` regista ações sensíveis (login, alteração de
papéis, criação de utilizador, etc.) com uma lista explícita de
`metadataKeys` (ex. só `roles`, nunca o corpo completo do pedido) — impede
que um campo sensível adicionado no futuro a um DTO seja automaticamente
auditado sem decisão explícita.

### Análise de dependências

🔧 Corrigido nesta fase: `npm audit` (raiz, cobre `apps/web`+`apps/api` via
workspaces) reportava 9 vulnerabilidades (2 low, 4 moderate, 3 high, 0
critical). `npm audit fix` (sem `--force`) resolveu as 6 de severidade
low/high (`@babel/core`, `@angular/compiler-cli`, `brace-expansion`,
`fast-uri`, `postcss`, `tar`) sem alterações estruturais. Restam 3 moderate,
todas na cadeia `@angular/cli → @modelcontextprotocol/sdk → @hono/node-server`
(ferramenta MCP interna do próprio Angular CLI, código de desenvolvimento,
nunca incluído na imagem de produção) — corrigir exigiria `npm audit fix
--force` (bump major do Angular CLI, 20→21), fora do âmbito desta fase de
hardening. **Critério de aceitação cumprido**: zero findings críticos por
resolver. `.github/workflows/verify.yml` (`dependency-audit`) passou a
bloquear especificamente em `npm audit --audit-level=critical`, mantendo o
relatório completo não bloqueante para severidades inferiores.

---

## Validação em condições reais (Tarefa C)

Sem ambiente implantado nem rede não-local disponível nesta fase (ver
`context/current-feature.md`), a validação foi feita em melhor esforço
local, contra a API/BD de desenvolvimento reais — mesma técnica "Playwright
descartável" usada desde a Fase 5. Resultados registados em
`context/current-feature.md`, secção "Histórico", desta fase. A validação em
rede real/não-localhost e o streaming via S3/European Sovereign Cloud real
continuam pendentes, dependentes de um ambiente implantado real — ver
`docs/preparacao-producao-aws.md`, secção "Dependências institucionais
pendentes".
