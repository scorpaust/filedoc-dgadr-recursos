import { Router } from '@angular/router';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { AppUser, UserRole } from '../../shared/models';
import { users } from '../../shared/mocks/users.mock';
import { mockCredentials } from './mock-credentials';

const SIMULATED_DELAY_MS = 600;
const INVALID_CREDENTIALS_MESSAGE =
  'Não foi possível iniciar sessão. Verifique o e-mail e a palavra-passe.';
const CHANGE_PASSWORD_ERROR_MESSAGE =
  'Não foi possível alterar a palavra-passe. Verifique a palavra-passe atual e tente novamente.';

// Serviço de autenticação simulado (Fase 2 — UI). Não efetua qualquer chamada de rede;
// valida contra `mockCredentials` e `users.mock.ts`. Será substituído, não estendido,
// quando a integração com a API NestJS real for implementada.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  readonly currentUser = signal<AppUser | null>(null);
  readonly currentRole = computed<UserRole | null>(() => this.currentUser()?.role ?? null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  login(email: string, password: string): Observable<AppUser> {
    const normalizedEmail = email.trim().toLowerCase();
    return timer(SIMULATED_DELAY_MS).pipe(
      switchMap(() => {
        const user = this.authenticate(normalizedEmail, password);
        if (!user) {
          return throwError(() => new Error(INVALID_CREDENTIALS_MESSAGE));
        }
        return of(user);
      }),
      tap((user) => this.currentUser.set(user)),
    );
  }

  logout(): void {
    this.currentUser.set(null);
    this.router.navigateByUrl('/login');
  }

  changePassword(currentPassword: string): Observable<void> {
    const user = this.currentUser();
    return timer(SIMULATED_DELAY_MS).pipe(
      switchMap(() => {
        const isValid = user !== null && this.authenticate(user.email, currentPassword) !== null;
        if (!isValid) {
          return throwError(() => new Error(CHANGE_PASSWORD_ERROR_MESSAGE));
        }
        return of(undefined);
      }),
    );
  }

  private authenticate(email: string, password: string): AppUser | null {
    const normalizedEmail = email.trim().toLowerCase();
    const hasValidCredential = mockCredentials.some(
      (credential) =>
        credential.email.toLowerCase() === normalizedEmail && credential.password === password,
    );
    if (!hasValidCredential) {
      return null;
    }
    const user = users.find(
      (candidate) =>
        candidate.email.toLowerCase() === normalizedEmail && candidate.status === 'active',
    );
    return user ?? null;
  }
}
