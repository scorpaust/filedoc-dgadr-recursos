import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from '../auth.types';
import { EnvironmentVariables } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';
import { SESSION_COOKIE_NAME } from '../session-token.util';

const SESSION_SECRET = 'segredo-de-teste-com-32-caracteres!!';

function buildContext(
  request: Partial<AuthenticatedRequest>,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let findUnique: jest.Mock;

  beforeEach(() => {
    findUnique = jest.fn();
    const prisma = { session: { findUnique } } as unknown as PrismaService;
    const configService = {
      get: jest.fn().mockReturnValue(SESSION_SECRET),
    } as unknown as ConfigService<EnvironmentVariables, true>;
    guard = new AuthGuard(prisma, configService);
  });

  it('rejeita quando não existe cookie de sessão', async () => {
    const context = buildContext({ cookies: {} });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejeita quando a sessão não existe', async () => {
    findUnique.mockResolvedValue(null);
    const context = buildContext({
      cookies: { [SESSION_COOKIE_NAME]: 'token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita uma sessão revogada', async () => {
    findUnique.mockResolvedValue({
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-1',
        name: 'Marta Silva',
        email: 'marta.silva@dgadr.gov.pt',
        status: 'ACTIVE',
        roles: [],
      },
    });
    const context = buildContext({
      cookies: { [SESSION_COOKIE_NAME]: 'token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita uma sessão expirada', async () => {
    findUnique.mockResolvedValue({
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      user: {
        id: 'user-1',
        name: 'Marta Silva',
        email: 'marta.silva@dgadr.gov.pt',
        status: 'ACTIVE',
        roles: [],
      },
    });
    const context = buildContext({
      cookies: { [SESSION_COOKIE_NAME]: 'token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita a sessão de um utilizador entretanto desativado', async () => {
    findUnique.mockResolvedValue({
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-1',
        name: 'Paulo Matos',
        email: 'paulo.matos@dgadr.gov.pt',
        status: 'INACTIVE',
        roles: [],
      },
    });
    const context = buildContext({
      cookies: { [SESSION_COOKIE_NAME]: 'token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('aceita uma sessão válida e anexa o utilizador, com todas as funções, ao pedido', async () => {
    findUnique.mockResolvedValue({
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-1',
        name: 'João Antunes',
        email: 'joao.antunes@dgadr.gov.pt',
        status: 'ACTIVE',
        roles: [{ role: 'CONTENT_EDITOR' }, { role: 'ADMIN' }],
      },
    });
    const request: Partial<AuthenticatedRequest> = {
      cookies: { [SESSION_COOKIE_NAME]: 'token' },
    };
    const context = buildContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'user-1',
      name: 'João Antunes',
      email: 'joao.antunes@dgadr.gov.pt',
      roles: ['CONTENT_EDITOR', 'ADMIN'],
    });
  });
});
