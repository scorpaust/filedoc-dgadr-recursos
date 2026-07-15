# Interfaces dos serviços mock (UI)

> Produzido na Fase 11 (UI) — Acessibilidade, Responsividade e Testes E2E de UI
> (`context/features/fase-11-ui-acessibilidade-e2e.md`, tarefa G).

Este documento lista a assinatura pública de todos os serviços mock criados ao longo da via
de desenvolvimento do UI (Fases 1 a 10). Serve de contrato a respeitar quando cada serviço
mock for substituído pelo respetivo consumo real da API NestJS, fase a fase, na via de
integração — os componentes de UI não devem precisar de mudar mais do que o estritamente
necessário para essa troca (princípio da menor alteração suficiente, `ai-interaction.md`).

Todos os serviços seguem o mesmo padrão: estado mantido em memória (Angular `Signal`,
reposto sempre que a aplicação recarrega), leitura/escrita simulada com `Observable` e um
atraso artificial (`delay`), e erros simulados devolvidos com `throwError` e uma mensagem em
português destinada a ser mostrada diretamente ao utilizador.

Este documento reflete o estado final da via de UI, não o histórico das alterações feitas em
cada fase — ver `context/current-feature.md` para esse histórico.

---

## `AuthService`

`src/app/core/auth/auth.service.ts` — Fase 2, migrado para múltiplas funções na Fase 9.

```ts
class AuthService {
  readonly currentUser: Signal<AppUser | null>;
  readonly roles: Signal<readonly UserRole[]>; // roles do currentUser, [] se não autenticado
  readonly isAuthenticated: Signal<boolean>; // reavalia a cada leitura contra UserMockService

  login(email: string, password: string): Observable<AppUser>;
  logout(): void; // limpa a sessão e navega para /login
  changePassword(currentPassword: string): Observable<void>;
}
```

- `login`/`changePassword` validam contra `mock-credentials.ts` e devolvem sempre a mesma
  mensagem genérica de erro, independentemente de o e-mail existir ou a palavra-passe estar
  errada (nunca revela qual dos dois falhou).
- `isAuthenticated` fica `false` automaticamente (sem necessidade de nova navegação) se a
  conta em sessão for desativada através do `UserMockService` (ex.: um administrador
  desativa a própria conta).

## `UserMockService`

`src/app/core/auth/user-mock.service.ts` — Fase 9. Fonte única e "viva" dos utilizadores
mock; também consultada pelo `AuthService`.

```ts
interface UserListFilters {
  query?: string;
  roles?: readonly UserRole[]; // seleção múltipla — interseção não vazia com AppUser.roles
  status?: UserStatus | 'all';
}

interface CreateUserInput {
  name: string;
  email: string;
  career: string;
  roles: readonly UserRole[];
}

class UserMockService {
  list(filters?: UserListFilters): Observable<readonly AppUser[]>;
  getById(id: string): AppUser | undefined; // síncrono
  isActive(id: string): boolean; // síncrono
  findActiveByEmail(email: string): AppUser | undefined; // síncrono, e-mail em minúsculas

  create(input: CreateUserInput): Observable<AppUser>;
  updateName(userId: string, name: string): Observable<AppUser>;
  assignRoles(userId: string, roles: readonly UserRole[]): Observable<AppUser>;
  activate(userId: string): Observable<AppUser>;
  deactivate(userId: string): Observable<AppUser>;
  invalidateSessions(userId: string): Observable<void>; // simbólico nesta fase
  isLastAdminHolder(userId: string): boolean; // síncrono
}
```

- `assignRoles`/`deactivate` recusam a operação (erro) quando removeria a função `ADMIN` do
  último utilizador que a possui, ou quando `roles` ficaria vazio.
- `isLastAdminHolder` existe para a UI poder bloquear a ação **antes** de qualquer diálogo de
  confirmação, sem esperar pelo erro do `Observable`.

## `ResourceMockService`

`src/app/features/resources/data/resource-mock.service.ts` — Fase 3, estendido nas Fases 4,
8 e 10.

```ts
interface ResourceSearchParams {
  query: string;
  type: 'all' | ResourceType;
  workflows: readonly string[];
  difficulties: readonly Difficulty[];
  sort: 'recent' | 'alphabetical';
  page: number;
  pageSize: number;
}
interface ResourceSearchResult {
  items: readonly Resource[];
  total: number;
}
interface ResourceManagementFilters {
  status?: EditorialStatus | 'all';
  query?: string;
}

class ResourceMockService {
  // Público — respeita a visibilidade por estado editorial/função (rascunhos só visíveis a
  // CONTENT_EDITOR/ADMIN; arquivados nunca visíveis).
  search(params: ResourceSearchParams): Observable<ResourceSearchResult>;
  getBySlug(slug: string): Observable<Resource | undefined>;
  getRelated(ids: readonly string[]): Observable<readonly Resource[]>; // máx. 4, ordem preservada
  listFeatured(limit: number): Observable<readonly Resource[]>; // por publishedAt desc
  listRecent(limit: number): Observable<readonly Resource[]>; // por updatedAt desc

  // Gestão editorial — sem restrição de visibilidade (autorização já garantida pelo roleGuard).
  listAllForManagement(filters?: ResourceManagementFilters): Observable<readonly Resource[]>;
  getByIdForManagement(id: string): Observable<Resource | undefined>;
  getForPreview(slug: string): Observable<Resource | undefined>; // ignora o estado editorial
  isSlugTaken(slug: string, excludeId?: string): boolean; // síncrono
  isTaxonomyInUse(kind: TaxonomyKind, label: string): boolean; // síncrono

  create(input: ResourceFormInput): Observable<Resource>;
  update(id: string, input: ResourceFormInput): Observable<Resource>;
  duplicate(id: string): Observable<Resource>; // força estado "draft", slug único
  publish(id: string): Observable<Resource>; // valida todos os campos obrigatórios (secção N)
  unpublish(id: string): Observable<Resource>;
  archive(id: string): Observable<Resource>;
  restore(id: string): Observable<Resource>; // alias semântico de unpublish
}
```

- "Mais recentes" (`search` com `sort: 'recent'`) ordena por `publishedAt`, propositadamente
  distinto de `listRecent` (`updatedAt`) — decisão da Fase 3/10.
- `publish` recusa com uma mensagem que lista os campos em falta (ficheiro principal
  consoante o tipo, duração/páginas, e texto alternativo da miniatura apenas quando esta
  existe).

## `TipsFaqMockService`

`src/app/features/tips-faq/data/tips-faq-mock.service.ts` — Fase 5, estendido na Fase 8.
Serve dicas e perguntas frequentes a partir de um único serviço, com a mesma regra de
visibilidade dos recursos.

```ts
interface FaqInput {
  question: string;
  answer: string;
  category?: string;
}

class TipsFaqMockService {
  // Público — respeita a visibilidade por estado editorial/função.
  getTips(): Observable<readonly Tip[]>;
  getFaqs(): Observable<readonly Faq[]>;

  // Gestão editorial — sem restrição de visibilidade.
  listAllTips(): Observable<readonly Tip[]>;
  listAllFaqs(): Observable<readonly Faq[]>;

  createTip(text: string): Observable<Tip>;
  updateTip(id: string, text: string): Observable<Tip>;
  publishTip(id: string): Observable<Tip>;
  unpublishTip(id: string): Observable<Tip>;
  archiveTip(id: string): Observable<Tip>;
  restoreTip(id: string): Observable<Tip>;
  reorderTip(id: string, direction: 'up' | 'down'): Observable<readonly Tip[]>;

  createFaq(input: FaqInput): Observable<Faq>;
  updateFaq(id: string, input: FaqInput): Observable<Faq>;
  publishFaq(id: string): Observable<Faq>;
  unpublishFaq(id: string): Observable<Faq>;
  archiveFaq(id: string): Observable<Faq>;
  restoreFaq(id: string): Observable<Faq>;
  reorderFaq(id: string, direction: 'up' | 'down'): Observable<readonly Faq[]>;
}
```

- `reorderTip`/`reorderFaq` trocam a `sortOrder` com o vizinho imediato — alternativa
  acessível ao arrastar e largar, obrigatória por operabilidade por teclado.

## `SupportTicketMockService`

`src/app/features/support/data/support-ticket-mock.service.ts` — Fase 6, estendido na
Fase 7 com as operações de agente.

```ts
interface TicketQueueFilters {
  status?: TicketStatus;
  query?: string;
}

class SupportTicketMockService {
  // Vista do trabalhador — restrita ao requesterId do utilizador autenticado.
  listMine(): Observable<readonly SupportTicket[]>;
  getMineById(id: string): Observable<SupportTicket | undefined>; // undefined tanto para
  // id inexistente como para pedido de outro utilizador — nunca distinguível a partir da resposta
  createTicket(input: CreateTicketInput): Observable<SupportTicket>; // gera referência SUP-AAAA-XXXXXX
  addMessage(
    ticketId: string,
    content: string,
    attachmentFileNames?: readonly string[],
  ): Observable<SupportTicket>; // bloqueado se "Encerrado" ou de outro utilizador
  confirmResolution(ticketId: string): Observable<SupportTicket>; // só a partir de "Resolvido"

  // Vista de agente — sem restrição por requesterId (autorização já garantida pelo roleGuard
  // em /suporte/gestao).
  listAll(filters?: TicketQueueFilters): Observable<readonly SupportTicket[]>;
  assign(ticketId: string, agentId: string): Observable<SupportTicket>;
  updateCategory(ticketId: string, category: TicketCategory): Observable<SupportTicket>;
  updatePriority(ticketId: string, priority: TicketPriority): Observable<SupportTicket>;
  updateStatus(ticketId: string, status: TicketStatus): Observable<SupportTicket>;
  associateResource(ticketId: string, resourceId: string): Observable<SupportTicket>;
  resolve(ticketId: string): Observable<SupportTicket>; // updateStatus(id, 'RESOLVED')
  close(ticketId: string): Observable<SupportTicket>; // updateStatus(id, 'CLOSED')
  addInternalNote(ticketId: string, content: string): Observable<SupportTicket>; // nunca visível ao trabalhador
  reply(ticketId: string, content: string): Observable<SupportTicket>; // resposta pública do agente
}
```

- Todas as operações de agente (`assign`/`updateCategory`/`updatePriority`/`updateStatus`/
  `associateResource`) registam uma entrada de histórico pública com
  `kind: 'status-change'`, no formato "{agente} alterou/atribuiu/associou ...".
- `MAX_ATTACHMENTS_PER_MESSAGE` (3) é uma constante exportada pelo próprio serviço.

## `TaxonomyMockService`

`src/app/features/content-management/data/taxonomy-mock.service.ts` — Fase 8. Gere fluxos,
tipos de documento e etiquetas como taxonomias com ordem e estado ativo/inativo.

```ts
class TaxonomyMockService {
  list(kind?: TaxonomyKind): Observable<readonly Taxonomy[]>;
  create(kind: TaxonomyKind, label: string): Observable<Taxonomy>; // bloqueia duplicados no mesmo kind
  update(id: string, label: string): Observable<Taxonomy>;
  toggleActive(id: string): Observable<Taxonomy>;
  reorder(id: string, direction: 'up' | 'down'): Observable<readonly Taxonomy[]>;
  delete(id: string): Observable<void>; // bloqueia se ResourceMockService.isTaxonomyInUse
}
```

## `AuditLogMockService`

`src/app/features/administration/data/audit-log-mock.service.ts` — Fase 9. Apenas leitura;
entradas ilustrativas, nunca um histórico real de atividade.

```ts
class AuditLogMockService {
  list(): Observable<readonly AuditLogEntry[]>; // ordenado por createdAt desc
}
```

---

## Notas para a via de integração

- Todos os serviços devem ser **substituídos**, não estendidos, pelo respetivo consumo real
  da API NestJS — os nomes e assinaturas dos métodos acima são o contrato a preservar.
- Os métodos síncronos (`getById`, `isActive`, `findActiveByEmail`, `isSlugTaken`,
  `isTaxonomyInUse`, `isLastAdminHolder`) existem porque dependem de estado local já
  carregado em memória; ao integrar com a API real, cada consumidor destes métodos terá de
  ser revisto para depender de dados já obtidos anteriormente (ex.: cache local) ou de uma
  chamada assíncrona equivalente — não é garantido que a API tenha um endpoint síncrono
  correspondente.
- As mensagens de erro simuladas (`throwError`) estão em português e destinam-se a ser
  mostradas diretamente ao utilizador; a API real deve devolver informação equivalente
  (nunca menos específica do lado do cliente do que o mock atual).
