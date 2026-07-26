import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

const FORBIDDEN_MESSAGE = 'Não tem permissão para aceder a este recurso.';

// Concede acesso quando existe interseção não vazia entre as funções do
// utilizador autenticado (anexado ao pedido por AuthGuard, que deve correr
// sempre antes) e as funções permitidas pela rota (@Roles(...)) — nunca por
// comparação de igualdade com uma única função.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<
      readonly Role[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRoles = request.user?.roles ?? [];
    const hasAllowedRole = userRoles.some((role) =>
      allowedRoles.includes(role),
    );
    if (!hasAllowedRole) {
      throw new ForbiddenException(FORBIDDEN_MESSAGE);
    }
    return true;
  }
}
