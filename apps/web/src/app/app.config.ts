import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { apiUrlInterceptor } from './core/interceptors/api-url.interceptor';
import { sessionExpiredInterceptor } from './core/interceptors/session-expired.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([apiUrlInterceptor, sessionExpiredInterceptor])),
    // Restaura a sessão a partir do cookie HttpOnly (se existir) antes de o router avaliar
    // authGuard/roleGuard na primeira navegação (Fase 1 — Integração, Autenticação).
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
};
