import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Funções permitidas pela rota — o RolesGuard concede acesso quando existe
// interseção não vazia com as funções do utilizador autenticado (nunca por
// igualdade com uma única função), mesma semântica do roleGuard Angular.
export const Roles = (
  ...roles: readonly Role[]
): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);
