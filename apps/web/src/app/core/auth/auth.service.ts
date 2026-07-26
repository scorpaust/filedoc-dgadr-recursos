import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { AppUser, UserRole } from '../../shared/models';

const GENERIC_ERROR_MESSAGE = 'Não foi possível concluir o pedido. Tente novamente.';

interface AuthApiUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly UserRole[];
}

interface ApiErrorResponseBody {
  readonly message?: string;
}

function toAppUser(apiUser: AuthApiUser): AppUser {
  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    roles: apiUser.roles,
    status: 'active',
    lastAccess: '—',
  };
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ApiErrorResponseBody | null | undefined;
    if (typeof body?.message === 'string') {
      return body.message;
    }
  }
  return GENERIC_ERROR_MESSAGE;
}

// Serviço de autenticação (Fase 2 — UI; ligado à API NestJS real na Fase 1 — Integração).
// Sessão baseada em cookie HttpOnly, nunca lida nem guardada pelo próprio Angular — o
// estado local (`currentUser`) é apenas uma cópia otimista do que a API já validou, e é
// restaurado uma única vez no arranque (`restoreSession()`, chamado por um
// `provideAppInitializer` em app.config.ts) e limpo automaticamente por
// `sessionExpiredInterceptor` sempre que um pedido autenticado devolve 401.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly currentUser = signal<AppUser | null>(null);
  readonly roles = computed<readonly UserRole[]>(() => this.currentUser()?.roles ?? []);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  login(email: string, password: string): Observable<AppUser> {
    return this.http.post<AuthApiUser>('/auth/login', { email, password }).pipe(
      map(toAppUser),
      tap((user) => this.currentUser.set(user)),
      catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
    );
  }

  logout(): void {
    // Dispara em segundo plano, sem bloquear a navegação — mesmo que a revogação do lado
    // do servidor falhe (ex.: rede instável), o utilizador continua a terminar sessão aqui.
    this.http.post('/auth/logout', {}).subscribe({ error: () => undefined });
    this.currentUser.set(null);
    this.router.navigateByUrl('/login');
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post<void>('/auth/change-password', { currentPassword, newPassword })
      .pipe(
        catchError((error: unknown) => throwError(() => new Error(extractErrorMessage(error)))),
      );
  }

  // Chamado uma única vez no arranque da aplicação, antes de o router avaliar
  // authGuard/roleGuard — nunca deve ser chamado diretamente pelos componentes.
  restoreSession(): Observable<void> {
    return this.http.get<AuthApiUser>('/auth/me').pipe(
      tap((user) => this.currentUser.set(toAppUser(user))),
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  // Usado por sessionExpiredInterceptor quando um pedido autenticado devolve 401 a meio de
  // uma sessão em curso (ex.: sessão expirada, revogada, ou utilizador entretanto desativado).
  clearSession(): void {
    this.currentUser.set(null);
  }
}
