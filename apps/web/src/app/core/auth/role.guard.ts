import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { UserRole, hasAnyRole } from '../../shared/models';
import { AuthService } from './auth.service';

// A lista de funções permitidas é lida de `route.data['roles']`, definida em `app.routes.ts`.
// `Route.data` é tipado pelo Angular como um mapa genérico — a leitura tipada abaixo assume
// que a configuração de rotas respeita o contrato `readonly UserRole[]`.
function getAllowedRoles(route: ActivatedRouteSnapshot): readonly UserRole[] {
  return (route.data['roles'] as readonly UserRole[] | undefined) ?? [];
}

// Um utilizador pode acumular mais do que uma função em simultâneo: o acesso é concedido
// quando existe interseção não vazia entre as funções do utilizador e as funções permitidas
// pela rota — nunca apenas por comparação com uma única função (project-spec.md).
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentRoles = authService.roles();
  const allowedRoles = getAllowedRoles(route);

  if (hasAnyRole(currentRoles, allowedRoles)) {
    return true;
  }

  return router.createUrlTree(['/acesso-negado']);
};
