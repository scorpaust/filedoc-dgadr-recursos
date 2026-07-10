import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { UserRole } from '../../shared/models';
import { AuthService } from './auth.service';

// A lista de funções permitidas é lida de `route.data['roles']`, definida em `app.routes.ts`.
// `Route.data` é tipado pelo Angular como um mapa genérico — a leitura tipada abaixo assume
// que a configuração de rotas respeita o contrato `readonly UserRole[]`.
function getAllowedRoles(route: ActivatedRouteSnapshot): readonly UserRole[] {
  return (route.data['roles'] as readonly UserRole[] | undefined) ?? [];
}

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentRole = authService.currentRole();
  const allowedRoles = getAllowedRoles(route);

  if (currentRole !== null && allowedRoles.includes(currentRole)) {
    return true;
  }

  return router.createUrlTree(['/acesso-negado']);
};
