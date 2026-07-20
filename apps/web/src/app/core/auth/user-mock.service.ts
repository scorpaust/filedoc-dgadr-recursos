import { Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AppUser, UserRole, UserStatus } from '../../shared/models';
import { users } from '../../shared/mocks/users.mock';

const SIMULATED_DELAY_MS = 300;
const LAST_ADMIN_ROLE_MESSAGE =
  'Não é possível remover a função de administrador do último utilizador que a possui.';
const LAST_ADMIN_DEACTIVATE_MESSAGE =
  'Não é possível desativar o último utilizador com a função de administrador.';

let nextUserSequence = users.length + 1;

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export interface UserListFilters {
  readonly query?: string;
  // Seleção múltipla (dropdown de contagem, tal como o padrão já validado no catálogo de
  // recursos — fluxo/dificuldade): um utilizador corresponde quando o seu array `roles`
  // contém pelo menos uma das funções selecionadas, nunca por comparação de igualdade.
  readonly roles?: readonly UserRole[];
  readonly status?: UserStatus | 'all';
}

export interface CreateUserInput {
  readonly name: string;
  readonly email: string;
  readonly career: string;
  readonly roles: readonly UserRole[];
}

// Serviço de dados simulado (Fase 9 — UI), extensão do conjunto de utilizadores mock
// introduzido na Fase 2. Passa a ser a fonte única e "viva" dos utilizadores mock — o
// `AuthService` lê-o para autenticar e para confirmar, em cada navegação protegida, que a
// conta ainda está ativa, para que uma desativação feita aqui se reflita de imediato numa
// sessão simulada em curso. Estado mantido em memória (Signal, reposto ao recarregar a
// aplicação); assinatura pensada para ser substituída, sem alterar os componentes que a
// consomem, por um serviço que chama a API NestJS real.
@Injectable({ providedIn: 'root' })
export class UserMockService {
  private readonly usersSignal = signal<readonly AppUser[]>(users);

  list(filters?: UserListFilters): Observable<readonly AppUser[]> {
    const query = normalize((filters?.query ?? '').trim());
    const filtered = this.usersSignal().filter((user) => {
      if (
        filters?.roles &&
        filters.roles.length > 0 &&
        !filters.roles.some((role) => user.roles.includes(role))
      ) {
        return false;
      }
      if (filters?.status && filters.status !== 'all' && user.status !== filters.status) {
        return false;
      }
      if (query.length === 0) {
        return true;
      }
      return normalize(`${user.name} ${user.email}`).includes(query);
    });
    const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'pt'));
    return of(sorted).pipe(delay(SIMULATED_DELAY_MS));
  }

  // Leitura síncrona, usada pelo `AuthService` (autenticação e validade de sessão), que
  // não pode depender de um `Observable` assíncrono dentro de um `computed()`.
  getById(id: string): AppUser | undefined {
    return this.usersSignal().find((user) => user.id === id);
  }

  isActive(id: string): boolean {
    return this.getById(id)?.status === 'active';
  }

  // Leitura síncrona usada pelo `AuthService` para autenticar (`email` já normalizado
  // em minúsculas), devolvendo apenas contas ativas.
  findActiveByEmail(email: string): AppUser | undefined {
    return this.usersSignal().find(
      (user) => user.email.toLowerCase() === email && user.status === 'active',
    );
  }

  create(input: CreateUserInput): Observable<AppUser> {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const career = input.career.trim();
    if (!name) {
      return throwError(() => new Error('O nome é obrigatório.'));
    }
    if (!email) {
      return throwError(() => new Error('O e-mail é obrigatório.'));
    }
    if (input.roles.length === 0) {
      return throwError(() => new Error('Selecione pelo menos uma função.'));
    }
    const emailTaken = this.usersSignal().some((user) => user.email.toLowerCase() === email);
    if (emailTaken) {
      return throwError(() => new Error('Já existe um utilizador com este e-mail.'));
    }
    const user: AppUser = {
      id: `user-${nextUserSequence++}`,
      name,
      email,
      career,
      roles: [...input.roles],
      status: 'active',
      lastAccess: '—',
    };
    this.usersSignal.update((current) => [...current, user]);
    return of(user).pipe(delay(SIMULATED_DELAY_MS));
  }

  updateName(userId: string, name: string): Observable<AppUser> {
    const user = this.requireUser(userId);
    if (!user) {
      return throwError(() => new Error('Utilizador não encontrado.'));
    }
    const trimmed = name.trim();
    if (!trimmed) {
      return throwError(() => new Error('O nome é obrigatório.'));
    }
    return this.replaceAndEmit({ ...user, name: trimmed });
  }

  // Substitui o conjunto de funções do utilizador; recusa um array vazio e bloqueia a
  // remoção da função `ADMIN` quando este é o último utilizador que a possui.
  assignRoles(userId: string, roles: readonly UserRole[]): Observable<AppUser> {
    const user = this.requireUser(userId);
    if (!user) {
      return throwError(() => new Error('Utilizador não encontrado.'));
    }
    if (roles.length === 0) {
      return throwError(() => new Error('Um utilizador tem de ter sempre pelo menos uma função.'));
    }
    if (user.roles.includes('ADMIN') && !roles.includes('ADMIN') && this.isLastAdmin(userId)) {
      return throwError(() => new Error(LAST_ADMIN_ROLE_MESSAGE));
    }
    return this.replaceAndEmit({ ...user, roles: [...roles] });
  }

  activate(userId: string): Observable<AppUser> {
    const user = this.requireUser(userId);
    if (!user) {
      return throwError(() => new Error('Utilizador não encontrado.'));
    }
    return this.replaceAndEmit({ ...user, status: 'active' });
  }

  // Tal como `assignRoles` ao remover `ADMIN`, bloqueia quando o utilizador é o último
  // com essa função — independentemente de ter também outras funções.
  deactivate(userId: string): Observable<AppUser> {
    const user = this.requireUser(userId);
    if (!user) {
      return throwError(() => new Error('Utilizador não encontrado.'));
    }
    if (user.roles.includes('ADMIN') && this.isLastAdmin(userId)) {
      return throwError(() => new Error(LAST_ADMIN_DEACTIVATE_MESSAGE));
    }
    return this.replaceAndEmit({ ...user, status: 'inactive' });
  }

  // Nesta fase não existem sessões reais para invalidar — a ação é apenas simbólica,
  // devolvendo sucesso para validar a interação (fase-9-ui-administracao.md, tarefa A).
  invalidateSessions(userId: string): Observable<void> {
    const user = this.requireUser(userId);
    if (!user) {
      return throwError(() => new Error('Utilizador não encontrado.'));
    }
    return of(undefined).pipe(delay(SIMULATED_DELAY_MS));
  }

  // Leitura síncrona usada pela UI para bloquear uma desativação/remoção de `ADMIN` "antes
  // de qualquer confirmação" (fase-9-ui-administracao.md, tarefa C), sem esperar pelo erro
  // do `Observable` correspondente.
  isLastAdminHolder(userId: string): boolean {
    return this.isLastAdmin(userId);
  }

  private isLastAdmin(userId: string): boolean {
    const admins = this.usersSignal().filter((user) => user.roles.includes('ADMIN'));
    return admins.length === 1 && admins[0].id === userId;
  }

  private requireUser(userId: string): AppUser | undefined {
    return this.getById(userId);
  }

  private replaceAndEmit(updated: AppUser): Observable<AppUser> {
    this.usersSignal.update((current) =>
      current.map((user) => (user.id === updated.id ? updated : user)),
    );
    return of(updated).pipe(delay(SIMULATED_DELAY_MS));
  }
}
