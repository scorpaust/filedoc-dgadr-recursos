import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import type { CreateUserInput, UserListFilters } from '../../../core/auth/user-mock.service';
import { AppUser, UserRole, UserStatus } from '../../../shared/models';

const GENERIC_ERROR_MESSAGE = 'Não foi possível concluir o pedido. Tente novamente.';

interface UserApiItem {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly UserRole[];
  readonly status: UserStatus;
  readonly lastAccess: string;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null | undefined;
    if (typeof body?.message === 'string') {
      return body.message;
    }
  }
  return GENERIC_ERROR_MESSAGE;
}

/**
 * Consome os endpoints reais de administração de utilizadores
 * (fase-8-integracao-administracao.md), com a mesma assinatura pública de
 * `UserMockService` (via de UI, Fase 9) — `UserTableComponent`/`CreateUserDialogComponent`/
 * `EditRolesDialogComponent` trocam apenas o serviço injetado.
 *
 * Diferenças deliberadas face ao mock:
 * - `create` nunca envia `career` — campo recolhido pelo formulário mas sem coluna
 *   correspondente no schema Prisma desta fase (fora de âmbito);
 * - a API gera a palavra-passe inicial (nunca pedida nem devolvida ao cliente); sem fluxo de
 *   entrega/reposição nesta fase, uma conta criada aqui só fica utilizável depois de uma fase
 *   futura que resolva essa entrega — mesma limitação já documentada no backend;
 * - `isLastAdminHolder` deixa de ler um estado local completo (o cliente só vê a página
 *   atual) — mantém à parte um pequeno "roster" dos ids com `ADMIN`, atualizado no arranque e
 *   após qualquer mutação que possa alterar funções, para continuar a oferecer a mesma
 *   verificação síncrona que a UI já usa antes de confirmar uma desativação.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly adminIds = signal<ReadonlySet<string>>(new Set());

  constructor() {
    this.refreshAdminRoster();
  }

  list(filters?: UserListFilters): Observable<readonly AppUser[]> {
    let params = new HttpParams();
    if (filters?.status && filters.status !== 'all') {
      params = params.set('status', filters.status);
    }
    if (filters?.roles) {
      for (const role of filters.roles) {
        params = params.append('roles', role);
      }
    }
    if (filters?.query) {
      params = params.set('q', filters.query);
    }
    return this.http.get<readonly UserApiItem[]>('/admin/users', { params }).pipe(
      map((items) => items.map((item) => this.toAppUser(item))),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  create(input: CreateUserInput): Observable<AppUser> {
    return this.http
      .post<UserApiItem>('/admin/users', {
        name: input.name,
        email: input.email,
        roles: input.roles,
      })
      .pipe(
        map((item) => this.toAppUser(item)),
        tap(() => this.refreshAdminRoster()),
        catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
      );
  }

  updateName(userId: string, name: string): Observable<AppUser> {
    return this.http.patch<UserApiItem>(`/admin/users/${userId}`, { name }).pipe(
      map((item) => this.toAppUser(item)),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  assignRoles(userId: string, roles: readonly UserRole[]): Observable<AppUser> {
    return this.http.put<UserApiItem>(`/admin/users/${userId}/roles`, { roles }).pipe(
      map((item) => this.toAppUser(item)),
      tap(() => this.refreshAdminRoster()),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  activate(userId: string): Observable<AppUser> {
    return this.http.post<UserApiItem>(`/admin/users/${userId}/activate`, {}).pipe(
      map((item) => this.toAppUser(item)),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  deactivate(userId: string): Observable<AppUser> {
    return this.http.post<UserApiItem>(`/admin/users/${userId}/deactivate`, {}).pipe(
      map((item) => this.toAppUser(item)),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  invalidateSessions(userId: string): Observable<void> {
    return this.http
      .post<void>(`/admin/users/${userId}/invalidate-sessions`, {})
      .pipe(
        catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
      );
  }

  isLastAdminHolder(userId: string): boolean {
    const admins = this.adminIds();
    return admins.size === 1 && admins.has(userId);
  }

  private refreshAdminRoster(): void {
    const params = new HttpParams().set('roles', 'ADMIN');
    this.http.get<readonly UserApiItem[]>('/admin/users', { params }).subscribe({
      next: (items) => this.adminIds.set(new Set(items.map((item) => item.id))),
      error: () => undefined,
    });
  }

  private toAppUser(item: UserApiItem): AppUser {
    return {
      id: item.id,
      name: item.name,
      email: item.email,
      roles: item.roles,
      status: item.status,
      lastAccess: item.lastAccess,
    };
  }
}
