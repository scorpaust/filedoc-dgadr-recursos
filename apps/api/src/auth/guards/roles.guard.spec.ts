import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import type { AuthenticatedRequest } from '../auth.types';

function buildContext(
  request: Partial<AuthenticatedRequest>,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function buildReflector(
  allowedRoles: readonly string[] | undefined,
): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(allowedRoles),
  } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('permite o acesso quando a rota não exige nenhuma função', () => {
    const guard = new RolesGuard(buildReflector(undefined));
    const context = buildContext({
      user: {
        id: 'user-1',
        name: 'Marta',
        email: 'marta@dgadr.gov.pt',
        roles: ['EMPLOYEE'],
      },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite o acesso quando existe interseção não vazia', () => {
    const guard = new RolesGuard(buildReflector(['CONTENT_EDITOR', 'ADMIN']));
    const context = buildContext({
      user: {
        id: 'user-1',
        name: 'João',
        email: 'joao@dgadr.gov.pt',
        roles: ['CONTENT_EDITOR'],
      },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite o acesso quando o utilizador tem várias funções e só uma corresponde', () => {
    const guard = new RolesGuard(buildReflector(['ADMIN']));
    const context = buildContext({
      user: {
        id: 'user-1',
        name: 'João',
        email: 'joao@dgadr.gov.pt',
        roles: ['CONTENT_EDITOR', 'ADMIN'],
      },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejeita quando nenhuma das funções do utilizador corresponde', () => {
    const guard = new RolesGuard(buildReflector(['ADMIN']));
    const context = buildContext({
      user: {
        id: 'user-1',
        name: 'Marta',
        email: 'marta@dgadr.gov.pt',
        roles: ['EMPLOYEE'],
      },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejeita quando não existe utilizador autenticado no pedido', () => {
    const guard = new RolesGuard(buildReflector(['ADMIN']));
    const context = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
