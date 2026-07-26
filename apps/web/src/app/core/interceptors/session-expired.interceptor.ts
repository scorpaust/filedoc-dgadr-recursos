import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

// O login e o restauro de sessão no arranque (GET /auth/me) já tratam o seu próprio 401 —
// não devem disparar aqui uma segunda limpeza/navegação.
const EXEMPT_PATH_SUFFIXES = ['/auth/login', '/auth/me'];

// Quando qualquer outro pedido autenticado devolve 401, a sessão deixou de ser válida do
// lado do servidor (expirou, foi revogada, ou o utilizador foi entretanto desativado) —
// substitui o antigo effect() reativo baseado no UserMockService (Fase 9, UI), que deixou
// de fazer sentido com uma sessão real: a desativação só é conhecida no próximo pedido.
export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isExempt = EXEMPT_PATH_SUFFIXES.some((suffix) => req.url.endsWith(suffix));
      if (error instanceof HttpErrorResponse && error.status === 401 && !isExempt) {
        authService.clearSession();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
